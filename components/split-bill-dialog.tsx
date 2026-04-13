"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatRupiah, cn } from "@/lib/utils"
import { Users, Check, ArrowLeft, Banknote, QrCode, Printer, Plus, Minus, ChevronRight } from "lucide-react"

type SplitItem = { menuItemId: string; name: string; price: number; quantity: number }
type Props = { open: boolean; onClose: () => void; onComplete: () => void; orderId: string; orderNumber: string; items: SplitItem[] }

type SplitPerson = {
  label: string; amount: number
  itemDetails: { name: string; price: number; qty: number }[]
  paid: boolean; method?: "CASH" | "QRIS"
  cashReceived?: number; changeAmount?: number
}

type Step = "loading" | "method" | "setup-equal" | "setup-item" | "pay" | "done" | "print-select" | "print-preview"

export default function SplitBillDialog({ open, onClose, onComplete, orderId, orderNumber, items }: Props) {
  const [step, setStep] = useState<Step>("loading")
  const [personCount, setPersonCount] = useState(2)
  const [persons, setPersons] = useState<SplitPerson[]>([])
  const [payingIdx, setPayingIdx] = useState<number | null>(null)
  const [payMethod, setPayMethod] = useState<"CASH" | "QRIS">("CASH")
  const [cashReceived, setCashReceived] = useState("")
  const [processing, setProcessing] = useState(false)
  const [itemAssign, setItemAssign] = useState<Map<string, number>>(new Map())
  const [splitGroup, setSplitGroup] = useState(() => `split_${Date.now()}`)
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState<"combined" | "person">("person")
  const [somePaid, setSomePaid] = useState(false)

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  // ===== Load existing payments when dialog opens =====
  const loadExistingPayments = useCallback(async () => {
    setStep("loading")
    try {
      const res = await fetch(`/api/orders/${orderId}/split-pay`)
      const data = await res.json()
      if (data.success && data.data.payments.length > 0) {
        const payments = data.data.payments
        setSplitGroup(payments[0].splitGroup || splitGroup)
        setSomePaid(true)

        const existingPersons: SplitPerson[] = payments.map((p: any) => ({
          label: p.label || "Orang",
          amount: p.amount,
          itemDetails: [],
          paid: true,
          method: p.method,
          cashReceived: p.cashReceived,
          changeAmount: p.changeAmount,
        }))

        const remaining = data.data.remaining
        if (remaining > 0) {
          existingPersons.push({
            label: `Orang ${existingPersons.length + 1}`,
            amount: remaining,
            itemDetails: [],
            paid: false,
          })
        }

        setPersons(existingPersons)
        setStep(data.data.fullyPaid ? "done" : "pay")
      } else {
        setStep("method")
      }
    } catch {
      setStep("method")
    }
  }, [orderId, splitGroup])

  useEffect(() => {
    if (open) loadExistingPayments()
  }, [open, loadExistingPayments])

  // ===== Helpers =====
  const reset = () => {
    setStep("loading"); setPersons([]); setPayingIdx(null); setCashReceived("")
    setItemAssign(new Map()); setPayMethod("CASH"); setPreviewIdx(null)
    setPreviewMode("person"); setSomePaid(false)
  }

  const handleClose = () => {
    if (somePaid) { reset(); onComplete() }
    else { reset(); onClose() }
  }

  const paidCount = persons.filter((p) => p.paid).length
  const paidTotal = persons.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0)
  const remainingAmount = total - paidTotal
  const allPaid = persons.length > 0 && persons.every((p) => p.paid)
  const unpaidCount = persons.filter((p) => !p.paid).length

  // ===== Setup =====
  const setupEqual = () => {
    const pp = Math.floor(total / personCount)
    const rem = total - pp * personCount
    setPersons(Array.from({ length: personCount }, (_, i) => ({
      label: `Orang ${i + 1}`,
      amount: pp + (i === personCount - 1 ? rem : 0),
      itemDetails: [], paid: false,
    })))
    setStep("pay")
  }

  const setupItemSplit = () => {
    const np: SplitPerson[] = Array.from({ length: personCount }, (_, i) => ({
      label: `Orang ${i + 1}`, amount: 0, itemDetails: [], paid: false,
    }))
    const pm = new Map<number, Map<string, { name: string; price: number; qty: number }>>()
    itemAssign.forEach((pi, key) => {
      const mid = key.split(":")[0]
      const item = items.find((i) => i.menuItemId === mid)
      if (!item) return
      if (!pm.has(pi)) pm.set(pi, new Map())
      const m = pm.get(pi)!
      const ex = m.get(mid)
      if (ex) ex.qty++
      else m.set(mid, { name: item.name, price: item.price, qty: 1 })
      np[pi].amount += item.price
    })
    pm.forEach((m, pi) => { np[pi].itemDetails = Array.from(m.values()) })
    setPersons(np)
    setStep("pay")
  }

  const allAssigned = () => {
    let t = 0; items.forEach((i) => { t += i.quantity })
    return itemAssign.size === t
  }

  // ===== Split remaining for resumed orders =====
  const splitRemaining = () => {
    const paid = persons.filter((p) => p.paid)
    const rem = total - paid.reduce((s, p) => s + p.amount, 0)
    if (rem <= 0) return
    const nc = Math.max(1, personCount)
    const pp = Math.floor(rem / nc)
    const r = rem - pp * nc
    const newU: SplitPerson[] = Array.from({ length: nc }, (_, i) => ({
      label: `Orang ${paid.length + i + 1}`,
      amount: pp + (i === nc - 1 ? r : 0),
      itemDetails: [], paid: false,
    }))
    setPersons([...paid, ...newU])
  }

  // ===== Pay =====
  const handlePayPerson = async (idx: number) => {
    const person = persons[idx]
    setProcessing(true)
    const body: any = {
      splitGroup, splitLabel: person.label,
      totalAmount: person.amount, paymentMethod: payMethod,
    }
    if (payMethod === "CASH") {
      const c = parseInt(cashReceived) || 0
      if (c < person.amount) { setProcessing(false); return }
      body.cashReceived = c
    }
    const res = await fetch(`/api/orders/${orderId}/split-pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      const ca = parseInt(cashReceived) || 0
      const updated = [...persons]
      updated[idx] = {
        ...updated[idx], paid: true, method: payMethod,
        cashReceived: payMethod === "CASH" ? ca : undefined,
        changeAmount: payMethod === "CASH" ? ca - person.amount : undefined,
      }
      setPersons(updated)
      setPayingIdx(null); setCashReceived(""); setSomePaid(true)
      if (data.data.fullyPaid) setStep("done")
    }
    setProcessing(false)
  }

  // ===== Receipt =====
  const now = new Date()
  const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

  function receiptCSS() {
    return `*{margin:0;padding:0;box-sizing:border-box}body{display:flex;justify-content:center}.receipt{font-family:"Courier New",monospace;font-size:12px;line-height:1.4;width:280px;padding:8px;color:#000;background:#fff}.center{text-align:center}.bold{font-weight:bold}.large{font-size:16px}.sep{text-align:center;color:#666;font-size:11px}.row{display:flex;justify-content:space-between;gap:4px}.mt{margin-top:8px}.mb{margin-bottom:4px}@media print{@page{size:80mm auto;margin:0}.receipt{width:80mm;padding:4mm;font-size:11px}}`
  }
  function fRp(n: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n) }

  function openPrint(html: string, title: string) {
    const w = window.open("", "_blank", "width=320,height=600")
    if (!w) { alert("Pop-up diblokir browser."); return }
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${receiptCSS()}</style></head><body>${html}<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}};<\/script></body></html>`)
    w.document.close()
  }

  function personReceiptHtml(p: SplitPerson, idx: number) {
    const ih = p.itemDetails.length > 0
      ? p.itemDetails.map((it) => `<div class="row"><span>${it.name} x${it.qty}</span><span>${fRp(it.price * it.qty)}</span></div>`).join("")
      : `<div class="center" style="font-size:11px;color:#666">Bagi rata dari total ${fRp(total)}</div>`
    const cashInfo = p.method === "CASH" && p.cashReceived
      ? `<div class="row"><span>Dibayar:</span><span>${fRp(p.cashReceived)}</span></div><div class="row bold"><span>Kembalian:</span><span>${fRp(p.changeAmount || 0)}</span></div>`
      : ""
    return `<div class="receipt">
      <div class="center bold large mb">RM. ETEK MINANG</div>
      <div class="center mb" style="font-size:11px">Jl. Contoh Alamat No. 123</div>
      <div class="sep">————————————————————————————————</div>
      <div class="row mt"><span>No:</span><span class="bold">${orderNumber}</span></div>
      <div class="row"><span>Tanggal:</span><span>${dateStr} ${timeStr}</span></div>
      <div class="row"><span>Nama:</span><span class="bold">${p.label}</span></div>
      <div class="row mb"><span>Tagihan:</span><span>${idx + 1} dari ${persons.filter((x) => x.paid).length}</span></div>
      <div class="sep">————————————————————————————————</div>
      <div class="mt mb">${ih}</div>
      <div class="sep">————————————————————————————————</div>
      <div class="row mt bold"><span>TOTAL BAYAR</span><span>${fRp(p.amount)}</span></div>
      <div class="row"><span>Metode:</span><span>${p.method === "CASH" ? "Tunai" : "QRIS"}</span></div>
      ${cashInfo}
      <div class="sep mt">————————————————————————————————</div>
      <div class="center mt" style="font-size:10px">Terima kasih!</div>
    </div>`
  }

  function printCombined() {
    const ih = items.map((i) => `<div class="row"><span>${i.name} x${i.quantity}</span><span>${fRp(i.price * i.quantity)}</span></div>`).join("")
    const sh = persons.filter((p) => p.paid).map((p) => `<div class="row"><span>${p.label}</span><span>${fRp(p.amount)} (${p.method === "CASH" ? "Tunai" : "QRIS"})</span></div>`).join("")
    openPrint(`<div class="receipt">
      <div class="center bold large mb">RM. ETEK MINANG</div>
      <div class="center mb" style="font-size:11px">Jl. Contoh Alamat No. 123</div>
      <div class="sep">————————————————————————————————</div>
      <div class="row mt"><span>No:</span><span class="bold">${orderNumber}</span></div>
      <div class="row mb"><span>Tipe:</span><span>SPLIT BILL (${persons.filter((p) => p.paid).length} orang)</span></div>
      <div class="sep">————————————————————————————————</div>
      <div class="mt mb">${ih}</div>
      <div class="sep">————————————————————————————————</div>
      <div class="row mt bold"><span>TOTAL</span><span>${fRp(total)}</span></div>
      <div class="sep mt">————————————————————————————————</div>
      <div class="center mt bold" style="font-size:11px">PEMBAGIAN TAGIHAN</div>
      <div class="mt mb">${sh}</div>
      <div class="sep">————————————————————————————————</div>
      <div class="center mt" style="font-size:10px">Terima kasih!</div>
    </div>`, `Struk Split - ${orderNumber}`)
  }

  function printPerson(idx: number) { openPrint(personReceiptHtml(persons[idx], idx), `Struk ${persons[idx].label}`) }
  function printAllPersons() {
    const html = persons.filter((p) => p.paid).map((p, i) =>
      `<div style="${i > 0 ? "page-break-before:always;margin-top:20px;" : ""}">${personReceiptHtml(p, i)}</div>`
    ).join("")
    openPrint(html, `Struk Semua - ${orderNumber}`)
  }

  // ===== RENDER =====
  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-700" />
            Bagi Tagihan — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">

          {/* Loading */}
          {step === "loading" && (
            <div className="text-center py-12">
              <div className="text-3xl mb-3 animate-pulse">⏳</div>
              <p className="text-sm text-muted-foreground">Memuat data pembayaran...</p>
            </div>
          )}

          {/* Choose method */}
          {step === "method" && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-sm text-amber-700">Total Tagihan</p>
                <p className="text-2xl font-bold text-amber-900">{formatRupiah(total)}</p>
              </div>
              <button onClick={() => setStep("setup-equal")}
                className="w-full p-4 border-2 rounded-xl text-left hover:border-amber-400">
                <p className="font-bold">Bagi Rata</p>
                <p className="text-sm text-muted-foreground">Total dibagi rata untuk semua orang</p>
              </button>
              <button onClick={() => setStep("setup-item")}
                className="w-full p-4 border-2 rounded-xl text-left hover:border-amber-400">
                <p className="font-bold">Per Item</p>
                <p className="text-sm text-muted-foreground">Setiap orang bayar item masing-masing</p>
              </button>
            </div>
          )}

          {/* Setup equal */}
          {step === "setup-equal" && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setStep("method")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <label className="text-sm font-medium">Berapa orang?</label>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setPersonCount(Math.max(2, personCount - 1))}
                  className="h-12 w-12 rounded-xl border-2 border-gray-200 flex items-center justify-center font-bold active:bg-gray-100 hover:border-amber-400">
                  <Minus className="h-5 w-5" />
                </button>
                <span className="text-4xl font-black text-amber-900 w-16 text-center">{personCount}</span>
                <button onClick={() => setPersonCount(Math.min(20, personCount + 1))}
                  className="h-12 w-12 rounded-xl border-2 border-gray-200 flex items-center justify-center font-bold active:bg-gray-100 hover:border-amber-400">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">Per orang:</p>
                <p className="text-xl font-bold">{formatRupiah(Math.ceil(total / personCount))}</p>
              </div>
              <Button onClick={setupEqual} className="w-full bg-amber-800 hover:bg-amber-900">Lanjutkan ke Pembayaran</Button>
            </div>
          )}

          {/* Setup per-item */}
          {step === "setup-item" && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setStep("method")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <label className="text-sm font-medium">Berapa orang?</label>
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setPersonCount(Math.max(2, personCount - 1))}
                  className="h-10 w-10 rounded-xl border-2 border-gray-200 flex items-center justify-center font-bold active:bg-gray-100 hover:border-amber-400">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-3xl font-black text-amber-900 w-12 text-center">{personCount}</span>
                <button onClick={() => setPersonCount(Math.min(20, personCount + 1))}
                  className="h-10 w-10 rounded-xl border-2 border-gray-200 flex items-center justify-center font-bold active:bg-gray-100 hover:border-amber-400">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm font-medium">Tap item → pilih pemilik:</p>
              <div className="space-y-1">
                {items.flatMap((item) =>
                  Array.from({ length: item.quantity }, (_, ui) => {
                    const key = `${item.menuItemId}:${ui}`
                    const at = itemAssign.get(key)
                    return (
                      <div key={key} className={cn("flex items-center justify-between p-2 border rounded-lg text-sm",
                        at !== undefined ? "border-amber-300 bg-amber-50" : "border-red-200 bg-red-50/30")}>
                        <span>{item.name} <span className="text-muted-foreground">({formatRupiah(item.price)})</span></span>
                        <select value={at !== undefined ? at.toString() : ""}
                          onChange={(e) => {
                            const m = new Map(itemAssign)
                            if (e.target.value === "") m.delete(key)
                            else m.set(key, parseInt(e.target.value))
                            setItemAssign(m)
                          }}
                          className="border rounded px-2 py-1 text-xs">
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

          {/* Pay each person */}
          {step === "pay" && (
            <div className="space-y-3">
              {/* Summary banner */}
              <div className="bg-amber-50 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-700">Total tagihan</span>
                  <span className="font-bold text-amber-900">{formatRupiah(total)}</span>
                </div>
                {paidCount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Sudah dibayar ({paidCount} orang)</span>
                      <span className="font-bold text-green-800">{formatRupiah(paidTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-amber-200 pt-1">
                      <span className="text-red-700 font-medium">Sisa</span>
                      <span className="font-bold text-red-800">{formatRupiah(remainingAmount)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pembayaran</span>
                <Badge variant={allPaid ? "default" : "secondary"}>{paidCount}/{persons.length} lunas</Badge>
              </div>

              {/* Split remaining control - when resuming with 1 catch-all unpaid person */}
              {paidCount > 0 && unpaidCount === 1 && remainingAmount > 0 && (
                <div className="border-2 border-dashed border-amber-300 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800">
                    Sisa {formatRupiah(remainingAmount)} — bagi ke berapa orang?
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setPersonCount(Math.max(1, personCount - 1))}
                      className="h-10 w-10 rounded-xl border-2 border-gray-200 flex items-center justify-center font-bold active:bg-gray-100">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-2xl font-black text-amber-900 w-10 text-center">{personCount}</span>
                    <button onClick={() => setPersonCount(Math.min(10, personCount + 1))}
                      className="h-10 w-10 rounded-xl border-2 border-gray-200 flex items-center justify-center font-bold active:bg-gray-100">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Button size="sm" className="w-full bg-amber-800 hover:bg-amber-900" onClick={splitRemaining}>
                    Bagi Sisa ke {personCount} Orang
                  </Button>
                </div>
              )}

              {/* Person cards */}
              {persons.map((person, idx) => (
                <div key={idx} className={cn("border-2 rounded-xl p-3 transition-all",
                  person.paid ? "border-green-300 bg-green-50" : "border-gray-200")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{person.label}</p>
                      <p className="text-lg font-bold">{formatRupiah(person.amount)}</p>
                      {person.itemDetails.length > 0 && !person.paid && (
                        <p className="text-xs text-muted-foreground">
                          {person.itemDetails.map((it) => `${it.name}×${it.qty}`).join(", ")}
                        </p>
                      )}
                    </div>
                    {person.paid ? (
                      <div className="text-right">
                        <Badge className="bg-green-600 text-white">
                          <Check className="h-3 w-3 mr-1" />Lunas
                        </Badge>
                        <p className="text-xs text-green-600 mt-1">{person.method === "CASH" ? "Tunai" : "QRIS"}</p>
                      </div>
                    ) : (
                      <Button size="sm"
                        onClick={() => { setPayingIdx(idx); setCashReceived(""); setPayMethod("CASH") }}
                        className="bg-amber-800 hover:bg-amber-900">
                        Bayar
                      </Button>
                    )}
                  </div>

                  {/* Payment form */}
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
                          <input type="number" inputMode="numeric" value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            placeholder="Uang diterima..."
                            className="w-full px-3 py-2.5 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                          {parseInt(cashReceived) >= person.amount && (
                            <p className="text-sm text-green-600 font-medium">
                              Kembalian: {formatRupiah(parseInt(cashReceived) - person.amount)}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPayingIdx(null)}>Batal</Button>
                        <Button size="sm" onClick={() => handlePayPerson(idx)}
                          disabled={processing || (payMethod === "CASH" && (parseInt(cashReceived) || 0) < person.amount)}
                          className="bg-green-700 hover:bg-green-800 flex-1">
                          {processing ? "Memproses..." : "Konfirmasi Bayar"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Print link for paid person */}
                  {person.paid && (
                    <button onClick={() => { setPreviewIdx(idx); setPreviewMode("person"); setStep("print-preview") }}
                      className="flex items-center gap-1 mt-2 text-xs text-amber-700 hover:text-amber-900">
                      <Printer className="h-3 w-3" /> Cetak struk {person.label}
                    </button>
                  )}
                </div>
              ))}

              {/* Close partially */}
              {paidCount > 0 && !allPaid && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    {paidCount} dari {persons.length} sudah bayar. Sisanya bisa bayar nanti.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => handleClose()}>
                    Tutup & Lanjutkan Nanti
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-lg font-bold text-green-800 mb-2">Semua Tagihan Lunas!</h2>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm mb-4">
                {persons.filter((p) => p.paid).map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{p.label}</span>
                    <span className="font-mono">{formatRupiah(p.amount)} ({p.method === "CASH" ? "Tunai" : "QRIS"})</span>
                  </div>
                ))}
                <div className="border-t pt-1 mt-1 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="font-mono">{formatRupiah(total)}</span>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-muted-foreground">Cetak Struk</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1"
                    onClick={() => { setPreviewMode("combined"); setPreviewIdx(0); setStep("print-preview") }}>
                    <Printer className="h-4 w-4 mr-2" /> Gabungan
                  </Button>
                  <Button variant="outline" className="flex-1"
                    onClick={() => { setPreviewMode("person"); setStep("print-select") }}>
                    <Printer className="h-4 w-4 mr-2" /> Per Orang
                  </Button>
                </div>
              </div>
              <Button onClick={() => { reset(); onComplete() }} className="w-full bg-amber-800 hover:bg-amber-900">
                Selesai
              </Button>
            </div>
          )}

          {/* Print select */}
          {step === "print-select" && (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setStep("done")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <p className="text-sm font-medium">Pilih struk:</p>
              {persons.filter((p) => p.paid).map((p, i) => {
                const ri = persons.indexOf(p)
                return (
                  <button key={i} onClick={() => { setPreviewIdx(ri); setStep("print-preview") }}
                    className="w-full flex items-center justify-between p-3 border-2 rounded-xl hover:border-amber-400">
                    <div className="text-left"><p className="font-bold text-sm">{p.label}</p></div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold">{formatRupiah(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{p.method === "CASH" ? "Tunai" : "QRIS"}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                )
              })}
              <Button variant="outline" className="w-full" onClick={printAllPersons}>
                <Printer className="h-4 w-4 mr-2" /> Cetak Semua Struk
              </Button>
            </div>
          )}

          {/* Print preview */}
          {step === "print-preview" && previewIdx !== null && (
            <div className="space-y-3">
              <Button variant="ghost" size="sm"
                onClick={() => setStep(previewMode === "combined" ? "done" : allPaid ? "print-select" : "pay")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <div className="bg-gray-100 rounded-xl p-3 flex justify-center">
                <div className="bg-white shadow-lg rounded-sm"
                  style={{ fontFamily: '"Courier New", monospace', fontSize: 12, lineHeight: 1.4, width: 260, padding: 10 }}>
                  <p style={{ textAlign: "center", fontWeight: "bold", fontSize: 15 }}>RM. ETEK MINANG</p>
                  <p style={{ textAlign: "center", fontSize: 10, color: "#666", marginBottom: 6 }}>Jl. Contoh Alamat No. 123</p>
                  <p style={{ textAlign: "center", color: "#999", fontSize: 10 }}>————————————————————————</p>

                  {previewMode === "combined" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span>No:</span><span style={{ fontWeight: "bold" }}>{orderNumber}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span>Tipe:</span><span>SPLIT BILL</span>
                      </div>
                      <p style={{ textAlign: "center", color: "#999", fontSize: 10 }}>————————————————————————</p>
                      {items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span>{item.name} x{item.quantity}</span>
                          <span>{formatRupiah(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <p style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 4 }}>————————————————————————</p>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 4 }}>
                        <span>TOTAL</span><span>{formatRupiah(total)}</span>
                      </div>
                      <p style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, marginTop: 6 }}>PEMBAGIAN</p>
                      {persons.filter((p) => p.paid).map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 2 }}>
                          <span>{p.label}</span><span>{formatRupiah(p.amount)}</span>
                        </div>
                      ))}
                    </>
                  ) : (() => {
                    const p = persons[previewIdx]
                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span>No:</span><span style={{ fontWeight: "bold" }}>{orderNumber}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Nama:</span><span style={{ fontWeight: "bold" }}>{p.label}</span>
                        </div>
                        <p style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 4 }}>————————————————————————</p>
                        {p.itemDetails.length > 0
                          ? p.itemDetails.map((it, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 2 }}>
                                <span>{it.name} x{it.qty}</span><span>{formatRupiah(it.price * it.qty)}</span>
                              </div>
                            ))
                          : <p style={{ textAlign: "center", fontSize: 10, color: "#666", marginTop: 4 }}>Bagi rata</p>
                        }
                        <p style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 4 }}>————————————————————————</p>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 4, fontSize: 14 }}>
                          <span>TOTAL</span><span>{formatRupiah(p.amount)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                          <span>Metode:</span><span>{p.method === "CASH" ? "Tunai" : "QRIS"}</span>
                        </div>
                        {p.method === "CASH" && p.cashReceived && (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Dibayar:</span><span>{formatRupiah(p.cashReceived)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                              <span>Kembalian:</span><span>{formatRupiah(p.changeAmount || 0)}</span>
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}

                  <p style={{ textAlign: "center", color: "#999", fontSize: 10, marginTop: 6 }}>————————————————————————</p>
                  <p style={{ textAlign: "center", fontSize: 10, marginTop: 6 }}>Terima kasih!</p>
                </div>
              </div>

              <Button className="w-full bg-amber-800 hover:bg-amber-900"
                onClick={() => previewMode === "combined" ? printCombined() : printPerson(previewIdx)}>
                <Printer className="h-4 w-4 mr-2" /> Cetak Struk
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
