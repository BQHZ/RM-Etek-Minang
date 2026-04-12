"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { formatRupiah, cn } from "@/lib/utils"
import { Users, Check, ArrowLeft, Banknote, QrCode, Printer } from "lucide-react"

type SplitItem = { menuItemId: string; name: string; price: number; quantity: number }

type Props = {
  open: boolean
  onClose: () => void
  onComplete: () => void
  orderId: string
  orderNumber: string
  items: SplitItem[]
}

type SplitPerson = {
  label: string
  amount: number
  items?: SplitItem[]
  paid: boolean
  method?: "CASH" | "QRIS"
}

type Step = "method" | "setup-equal" | "setup-item" | "pay" | "done" | "print-select" | "print-preview"

export default function SplitBillDialog({ open, onClose, onComplete, orderId, orderNumber, items }: Props) {
  const [step, setStep] = useState<Step>("method")
  const [splitType, setSplitType] = useState<"equal" | "item">("equal")
  const [personCount, setPersonCount] = useState(2)
  const [persons, setPersons] = useState<SplitPerson[]>([])
  const [payingIdx, setPayingIdx] = useState<number | null>(null)
  const [payMethod, setPayMethod] = useState<"CASH" | "QRIS">("CASH")
  const [cashReceived, setCashReceived] = useState("")
  const [processing, setProcessing] = useState(false)
  const [itemAssign, setItemAssign] = useState<Map<string, number>>(new Map())
  const [splitGroup] = useState(() => `split_${Date.now()}`)
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState<"combined" | "person">("person")

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  const reset = () => {
    setStep("method"); setPersons([]); setPayingIdx(null); setCashReceived("")
    setItemAssign(new Map()); setPayMethod("CASH"); setPreviewIdx(null); setPreviewMode("person")
  }

  // Setup equal split
  const setupEqual = () => {
    const perPerson = Math.floor(total / personCount)
    const remainder = total - perPerson * personCount
    const p: SplitPerson[] = Array.from({ length: personCount }, (_, i) => ({
      label: `Orang ${i + 1}`,
      amount: perPerson + (i === personCount - 1 ? remainder : 0),
      paid: false,
    }))
    setPersons(p)
    setStep("pay")
  }

  // Setup per-item split
  const setupItemSplit = () => {
    const p: SplitPerson[] = Array.from({ length: personCount }, (_, i) => ({
      label: `Orang ${i + 1}`,
      amount: 0,
      items: [],
      paid: false,
    }))
    // Calculate amounts from assignments
    const newPersons = [...p]
    itemAssign.forEach((personIdx, key) => {
      // key = menuItemId:unitIdx
      const menuItemId = key.split(":")[0]
      const item = items.find((i) => i.menuItemId === menuItemId)
      if (item && newPersons[personIdx]) {
        newPersons[personIdx].amount += item.price
      }
    })
    setPersons(newPersons)
    setStep("pay")
  }

  // Check all items assigned
  const allAssigned = () => {
    let totalUnits = 0
    items.forEach((i) => { totalUnits += i.quantity })
    return itemAssign.size === totalUnits
  }

  // Pay one person
  const handlePayPerson = async (idx: number) => {
    const person = persons[idx]
    setProcessing(true)

    const body: any = {
      splitGroup,
      splitLabel: person.label,
      totalAmount: person.amount,
      paymentMethod: payMethod,
    }
    if (payMethod === "CASH") {
      const cash = parseInt(cashReceived) || 0
      if (cash < person.amount) { setProcessing(false); return }
      body.cashReceived = cash
    }

    const res = await fetch(`/api/orders/${orderId}/split-pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      const updated = [...persons]
      updated[idx] = { ...updated[idx], paid: true, method: payMethod }
      setPersons(updated)
      setPayingIdx(null)
      setCashReceived("")

      if (data.data.fullyPaid) setStep("done")
    }
    setProcessing(false)
  }

  const allPaid = persons.every((p) => p.paid)

  const now = new Date()
  const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

  function receiptStyles() {
    return `* { margin: 0; padding: 0; box-sizing: border-box; }
      body { display: flex; justify-content: center; padding: 0; }
      .receipt { font-family: "Courier New", Courier, monospace; font-size: 12px; line-height: 1.4; width: 280px; padding: 8px; color: #000; background: #fff; }
      .center { text-align: center; } .right { text-align: right; } .bold { font-weight: bold; }
      .large { font-size: 16px; } .sep { text-align: center; color: #666; font-size: 11px; }
      .row { display: flex; justify-content: space-between; gap: 4px; }
      .mt { margin-top: 8px; } .mb { margin-bottom: 4px; }
      @media print { @page { size: 80mm auto; margin: 0; } body { padding: 0; } .receipt { width: 80mm; padding: 4mm; font-size: 11px; } }`
  }

  function fmtRp(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
  }

  function openPrintWindow(html: string, title: string) {
    const win = window.open("", "_blank", "width=320,height=600")
    if (!win) { alert("Pop-up diblokir browser."); return }
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${receiptStyles()}</style></head><body>${html}<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script></body></html>`)
    win.document.close()
  }

  function printCombinedReceipt() {
    const itemsHtml = items.map((i) =>
      `<div class="row"><span>${i.name} x${i.quantity}</span><span>${fmtRp(i.price * i.quantity)}</span></div>`
    ).join("")

    const splitsHtml = persons.map((p, i) =>
      `<div class="row"><span>${p.label}</span><span>${fmtRp(p.amount)} (${p.method})</span></div>`
    ).join("")

    const html = `<div class="receipt">
      <div class="center bold large mb">RM. ETEK MINANG</div>
      <div class="center mb" style="font-size:11px">Jl. Contoh Alamat No. 123</div>
      <div class="sep">————————————————————————————————</div>
      <div class="row mt"><span>No:</span><span class="bold">${orderNumber}</span></div>
      <div class="row"><span>Tanggal:</span><span>${dateStr} ${timeStr}</span></div>
      <div class="row mb"><span>Tipe:</span><span>SPLIT BILL (${persons.length} orang)</span></div>
      <div class="sep">————————————————————————————————</div>
      <div class="mt mb">${itemsHtml}</div>
      <div class="sep">————————————————————————————————</div>
      <div class="row mt bold"><span>TOTAL</span><span>${fmtRp(total)}</span></div>
      <div class="sep mt">————————————————————————————————</div>
      <div class="center mt bold" style="font-size:11px">PEMBAGIAN TAGIHAN</div>
      <div class="mt mb">${splitsHtml}</div>
      <div class="sep">————————————————————————————————</div>
      <div class="center mt" style="font-size:10px">Terima kasih atas kunjungan Anda!</div>
      <div class="center" style="font-size:9px;color:#999;margin-top:4px">Powered by POS RM. Etek Minang</div>
    </div>`

    openPrintWindow(html, `Struk Split - ${orderNumber}`)
  }

  function printPersonReceipt(personIdx: number) {
    const p = persons[personIdx]

    const html = `<div class="receipt">
      <div class="center bold large mb">RM. ETEK MINANG</div>
      <div class="center mb" style="font-size:11px">Jl. Contoh Alamat No. 123</div>
      <div class="sep">————————————————————————————————</div>
      <div class="row mt"><span>No:</span><span class="bold">${orderNumber}</span></div>
      <div class="row"><span>Tanggal:</span><span>${dateStr} ${timeStr}</span></div>
      <div class="row"><span>Nama:</span><span class="bold">${p.label}</span></div>
      <div class="row mb"><span>Tagihan:</span><span>${personIdx + 1} dari ${persons.length}</span></div>
      <div class="sep">————————————————————————————————</div>
      <div class="row mt bold"><span>TOTAL BAYAR</span><span>${fmtRp(p.amount)}</span></div>
      <div class="row"><span>Metode:</span><span>${p.method === "CASH" ? "Tunai" : "QRIS"}</span></div>
      <div class="sep mt">————————————————————————————————</div>
      <div class="center mt" style="font-size:10px">Terima kasih atas kunjungan Anda!</div>
      <div class="center" style="font-size:9px;color:#999;margin-top:4px">Powered by POS RM. Etek Minang</div>
    </div>`

    openPrintWindow(html, `Struk ${p.label} - ${orderNumber}`)
  }

  function printAllPersonReceipts() {
    const allHtml = persons.map((p, i) => {
      return `<div class="receipt" style="${i > 0 ? 'page-break-before: always; margin-top: 20px;' : ''}">
        <div class="center bold large mb">RM. ETEK MINANG</div>
        <div class="center mb" style="font-size:11px">Jl. Contoh Alamat No. 123</div>
        <div class="sep">————————————————————————————————</div>
        <div class="row mt"><span>No:</span><span class="bold">${orderNumber}</span></div>
        <div class="row"><span>Tanggal:</span><span>${dateStr} ${timeStr}</span></div>
        <div class="row"><span>Nama:</span><span class="bold">${p.label}</span></div>
        <div class="row mb"><span>Tagihan:</span><span>${i + 1} dari ${persons.length}</span></div>
        <div class="sep">————————————————————————————————</div>
        <div class="row mt bold"><span>TOTAL BAYAR</span><span>${fmtRp(p.amount)}</span></div>
        <div class="row"><span>Metode:</span><span>${p.method === "CASH" ? "Tunai" : "QRIS"}</span></div>
        <div class="sep mt">————————————————————————————————</div>
        <div class="center mt" style="font-size:10px">Terima kasih atas kunjungan Anda!</div>
        <div class="center" style="font-size:9px;color:#999;margin-top:4px">Powered by POS RM. Etek Minang</div>
      </div>`
    }).join("")

    openPrintWindow(allHtml, `Struk Semua - ${orderNumber}`)
  }

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose() }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-700" />
            Bagi Tagihan — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          {/* Step: Choose method */}
          {step === "method" && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-sm text-amber-700">Total Tagihan</p>
                <p className="text-2xl font-bold text-amber-900">{formatRupiah(total)}</p>
              </div>
              <div className="space-y-2">
                <button onClick={() => { setSplitType("equal"); setStep("setup-equal") }}
                  className="w-full p-4 border-2 rounded-xl text-left hover:border-amber-400 transition-colors">
                  <p className="font-bold">Bagi Rata</p>
                  <p className="text-sm text-muted-foreground">Total dibagi rata untuk semua orang</p>
                </button>
                <button onClick={() => { setSplitType("item"); setStep("setup-item") }}
                  className="w-full p-4 border-2 rounded-xl text-left hover:border-amber-400 transition-colors">
                  <p className="font-bold">Per Item</p>
                  <p className="text-sm text-muted-foreground">Setiap orang bayar item masing-masing</p>
                </button>
              </div>
            </div>
          )}

          {/* Step: Setup equal */}
          {step === "setup-equal" && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setStep("method")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <div className="space-y-2">
                <label className="text-sm font-medium">Berapa orang?</label>
                <Input type="number" min={2} max={20} value={personCount}
                  onChange={(e) => setPersonCount(Math.max(2, parseInt(e.target.value) || 2))} />
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Per orang:</p>
                <p className="text-xl font-bold">{formatRupiah(Math.ceil(total / personCount))}</p>
              </div>
              <Button onClick={setupEqual} className="w-full bg-amber-800 hover:bg-amber-900">
                Lanjutkan ke Pembayaran
              </Button>
            </div>
          )}

          {/* Step: Setup per-item */}
          {step === "setup-item" && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setStep("method")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <div className="space-y-2">
                <label className="text-sm font-medium">Berapa orang?</label>
                <Input type="number" min={2} max={20} value={personCount}
                  onChange={(e) => setPersonCount(Math.max(2, parseInt(e.target.value) || 2))} />
              </div>
              <p className="text-sm font-medium">Tap item → pilih pemilik:</p>
              <div className="space-y-1">
                {items.flatMap((item) =>
                  Array.from({ length: item.quantity }, (_, unitIdx) => {
                    const key = `${item.menuItemId}:${unitIdx}`
                    const assignedTo = itemAssign.get(key)
                    return (
                      <div key={key} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                        <span>{item.name} <span className="text-muted-foreground">({formatRupiah(item.price)})</span></span>
                        <select
                          value={assignedTo !== undefined ? assignedTo.toString() : ""}
                          onChange={(e) => {
                            const m = new Map(itemAssign)
                            if (e.target.value === "") m.delete(key)
                            else m.set(key, parseInt(e.target.value))
                            setItemAssign(m)
                          }}
                          className="border rounded px-2 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {Array.from({ length: personCount }, (_, i) => (
                            <option key={i} value={i}>Orang {i + 1}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })
                )}
              </div>
              {!allAssigned() && <p className="text-xs text-red-500">Semua item harus ditentukan pemiliknya</p>}
              <Button onClick={setupItemSplit} disabled={!allAssigned()} className="w-full bg-amber-800 hover:bg-amber-900">
                Lanjutkan ke Pembayaran
              </Button>
            </div>
          )}

          {/* Step: Pay each person */}
          {step === "pay" && (
            <div className="space-y-3">
              {persons.map((person, idx) => (
                <div key={idx} className={cn(
                  "border-2 rounded-xl p-3 transition-all",
                  person.paid ? "border-green-300 bg-green-50" : "border-gray-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{person.label}</p>
                      <p className="text-lg font-bold">{formatRupiah(person.amount)}</p>
                    </div>
                    {person.paid ? (
                      <Badge className="bg-green-600 text-white"><Check className="h-3 w-3 mr-1" />Lunas ({person.method})</Badge>
                    ) : (
                      <Button size="sm" onClick={() => { setPayingIdx(idx); setCashReceived(""); setPayMethod("CASH") }}
                        className="bg-amber-800 hover:bg-amber-900">Bayar</Button>
                    )}
                  </div>

                  {/* Payment input for this person */}
                  {payingIdx === idx && !person.paid && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div className="flex gap-2">
                        <button onClick={() => setPayMethod("CASH")}
                          className={cn("flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                            payMethod === "CASH" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200")}>
                          <Banknote className="h-4 w-4 inline mr-1" />Tunai
                        </button>
                        <button onClick={() => setPayMethod("QRIS")}
                          className={cn("flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                            payMethod === "QRIS" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200")}>
                          <QrCode className="h-4 w-4 inline mr-1" />QRIS
                        </button>
                      </div>
                      {payMethod === "CASH" && (
                        <div className="space-y-2">
                          <Input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)}
                            placeholder="Uang diterima..." className="text-lg" />
                          {parseInt(cashReceived) >= person.amount && (
                            <p className="text-sm text-green-600">Kembalian: {formatRupiah(parseInt(cashReceived) - person.amount)}</p>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPayingIdx(null)}>Batal</Button>
                        <Button size="sm" onClick={() => handlePayPerson(idx)} disabled={processing ||
                          (payMethod === "CASH" && (parseInt(cashReceived) || 0) < person.amount)}
                          className="bg-green-700 hover:bg-green-800 flex-1">
                          {processing ? "Memproses..." : "Konfirmasi Bayar"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-lg font-bold text-green-800 mb-2">Semua Tagihan Lunas!</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Pesanan {orderNumber} telah dibayar oleh {persons.length} orang.
              </p>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm mb-4">
                {persons.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{p.label}</span>
                    <span className="font-mono">{formatRupiah(p.amount)} ({p.method})</span>
                  </div>
                ))}
                <div className="border-t pt-1 mt-1 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="font-mono">{formatRupiah(total)}</span>
                </div>
              </div>

              {/* Receipt buttons */}
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-muted-foreground">Cetak Struk</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setPreviewMode("combined"); setPreviewIdx(0); setStep("print-preview") }}>
                    <Printer className="h-4 w-4 mr-2" /> Gabungan
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setPreviewMode("person"); setStep("print-select") }}>
                    <Printer className="h-4 w-4 mr-2" /> Per Orang
                  </Button>
                </div>
              </div>

              <Button onClick={() => { reset(); onComplete() }} className="w-full bg-amber-800 hover:bg-amber-900">
                Selesai
              </Button>
            </div>
          )}

          {/* Step: Select person to print */}
          {step === "print-select" && (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setStep("done")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <p className="text-sm font-medium">Pilih struk yang ingin dicetak:</p>
              {persons.map((p, i) => (
                <button key={i} onClick={() => { setPreviewIdx(i); setStep("print-preview") }}
                  className="w-full flex items-center justify-between p-3 border-2 rounded-xl hover:border-amber-400 transition-colors">
                  <div className="text-left">
                    <p className="font-bold text-sm">{p.label}</p>
                    <p className="text-xs text-muted-foreground">Tagihan {i + 1} dari {persons.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatRupiah(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{p.method}</p>
                  </div>
                </button>
              ))}
              <Button variant="outline" className="w-full" onClick={() => printAllPersonReceipts()}>
                <Printer className="h-4 w-4 mr-2" /> Cetak Semua Struk
              </Button>
            </div>
          )}

          {/* Step: Receipt preview */}
          {step === "print-preview" && previewIdx !== null && (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setStep(previewMode === "combined" ? "done" : "print-select")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>

              {/* Receipt preview card */}
              <div className="bg-gray-100 rounded-xl p-3 flex justify-center">
                <div className="bg-white shadow-lg rounded-sm" style={{ fontFamily: '"Courier New", monospace', fontSize: 12, lineHeight: 1.4, width: 260, padding: 10 }}>
                  <p style={{ textAlign: "center", fontWeight: "bold", fontSize: 15 }}>RM. ETEK MINANG</p>
                  <p style={{ textAlign: "center", fontSize: 10, color: "#666", marginBottom: 6 }}>Jl. Contoh Alamat No. 123</p>
                  <p style={{ textAlign: "center", color: "#999", fontSize: 10 }}>————————————————————————</p>

                  {previewMode === "combined" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span>No:</span><span style={{ fontWeight: "bold" }}>{orderNumber}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tanggal:</span><span>{dateStr} {timeStr}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Tipe:</span><span>SPLIT BILL ({persons.length} orang)</span></div>
                      <p style={{ textAlign: "center", color: "#999", fontSize: 10 }}>————————————————————————</p>
                      {items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span>{item.name} x{item.quantity}</span>
                          <span>{formatRupiah(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <p style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 4 }}>————————————————————————</p>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 4 }}><span>TOTAL</span><span>{formatRupiah(total)}</span></div>
                      <p style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 4 }}>————————————————————————</p>
                      <p style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, marginTop: 6 }}>PEMBAGIAN TAGIHAN</p>
                      {persons.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 2 }}>
                          <span>{p.label}</span>
                          <span>{formatRupiah(p.amount)} ({p.method})</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span>No:</span><span style={{ fontWeight: "bold" }}>{orderNumber}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tanggal:</span><span>{dateStr} {timeStr}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Nama:</span><span style={{ fontWeight: "bold" }}>{persons[previewIdx].label}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Tagihan:</span><span>{previewIdx + 1} dari {persons.length}</span></div>
                      <p style={{ textAlign: "center", color: "#999", fontSize: 10 }}>————————————————————————</p>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 6, fontSize: 14 }}><span>TOTAL</span><span>{formatRupiah(persons[previewIdx].amount)}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}><span>Metode:</span><span>{persons[previewIdx].method === "CASH" ? "Tunai" : "QRIS"}</span></div>
                    </>
                  )}

                  <p style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 6 }}>————————————————————————</p>
                  <p style={{ textAlign: "center", fontSize: 10, marginTop: 6 }}>Terima kasih atas kunjungan Anda!</p>
                </div>
              </div>

              {/* Print button */}
              <Button className="w-full bg-amber-800 hover:bg-amber-900"
                onClick={() => previewMode === "combined" ? printCombinedReceipt() : printPersonReceipt(previewIdx)}>
                <Printer className="h-4 w-4 mr-2" /> Cetak Struk
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
