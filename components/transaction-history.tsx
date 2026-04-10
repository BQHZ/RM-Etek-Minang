"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Eye, Printer, Ban, Receipt } from "lucide-react"
import { formatRupiah } from "@/lib/utils"
import ReceiptDialog from "@/components/receipt-dialog"
import type { ReceiptData } from "@/components/receipt-template"


type TransactionItem = {
  id: string
  orderId: string
  totalAmount: number
  paymentMethod: string
  cashReceived: number | null
  changeAmount: number | null
  paidAt: string
  order: {
    orderNumber: string
    type: string
    tableNumber: number | null
    status: string
    items: {
      quantity: number
      priceAtOrder: number
      menuItem: { name: string }
    }[]
    createdBy: { name: string }
  }
}

type Summary = {
  totalCount: number
  totalRevenue: number
  cashCount: number
  cashRevenue: number
  qrisCount: number
  qrisRevenue: number
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function TransactionHistory({ canVoid = false }: { canVoid?: boolean }) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [date, setDate] = useState(todayStr())
  const [method, setMethod] = useState("all")
  const [type, setType] = useState("all")

  // Detail dialog
  const [detailItem, setDetailItem] = useState<TransactionItem | null>(null)

  // Void dialog
  const [voidItem, setVoidItem] = useState<TransactionItem | null>(null)
  const [voidReason, setVoidReason] = useState("")
  const [voiding, setVoiding] = useState(false)
  const [voidError, setVoidError] = useState("")

  // Receipt
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ date })
    if (method !== "all") params.set("method", method)
    if (type !== "all") params.set("type", type)

    const [txRes, sumRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch(`/api/transactions/summary?date=${date}`),
    ])
    const [txData, sumData] = await Promise.all([txRes.json(), sumRes.json()])
    if (txData.success) setTransactions(txData.data)
    if (sumData.success) setSummary(sumData.data)
    setLoading(false)
  }, [date, method, type])

  useEffect(() => { fetchData() }, [fetchData])

  const buildReceipt = (tx: TransactionItem): ReceiptData => {
    const paid = new Date(tx.paidAt)
    return {
      orderNumber: tx.order.orderNumber,
      date: paid.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      time: paid.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      type: tx.order.type as "DINE_IN" | "TAKEAWAY",
      tableNumber: tx.order.tableNumber,
      cashierName: tx.order.createdBy?.name || "Pelanggan",
      items: tx.order.items.map((i) => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        price: i.priceAtOrder,
        subtotal: i.priceAtOrder * i.quantity,
      })),
      total: tx.totalAmount,
      paymentMethod: tx.paymentMethod as "CASH" | "QRIS",
      cashReceived: tx.cashReceived,
      changeAmount: tx.changeAmount,
    }
  }

  const openReceipt = (tx: TransactionItem) => {
    setReceiptData(buildReceipt(tx))
    setReceiptOpen(true)
  }

  const handleVoid = async () => {
    if (!voidItem || !voidReason.trim()) {
      setVoidError("Alasan pembatalan wajib diisi")
      return
    }
    setVoiding(true)
    setVoidError("")
    const res = await fetch(`/api/transactions/${voidItem.id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: voidReason }),
    })
    const data = await res.json()
    if (data.success) {
      setVoidItem(null)
      setVoidReason("")
      fetchData()
    } else {
      setVoidError(data.error)
    }
    setVoiding(false)
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Total Transaksi</p>
            <p className="text-2xl font-bold mt-1">{summary.totalCount}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Total Pendapatan</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatRupiah(summary.totalRevenue)}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">Tunai</p>
            <p className="text-lg font-bold mt-1">{formatRupiah(summary.cashRevenue)}</p>
            <p className="text-xs text-muted-foreground">{summary.cashCount} transaksi</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">QRIS</p>
            <p className="text-lg font-bold mt-1">{formatRupiah(summary.qrisRevenue)}</p>
            <p className="text-xs text-muted-foreground">{summary.qrisCount} transaksi</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Metode</SelectItem>
            <SelectItem value="CASH">Tunai</SelectItem>
            <SelectItem value="QRIS">QRIS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="DINE_IN">Dine-In</SelectItem>
            <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">
          {transactions.length} transaksi
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Pesanan</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Tidak ada transaksi
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono font-medium text-sm">{tx.order.orderNumber}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(tx.paidAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {tx.order.type === "DINE_IN" ? "Dine-In" : "Takeaway"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.paymentMethod === "CASH" ? "secondary" : "default"} className="text-xs">
                      {tx.paymentMethod === "CASH" ? "Tunai" : "QRIS"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatRupiah(tx.totalAmount)}
                  </TableCell>
                  <TableCell className="text-sm">{tx.order.createdBy?.name || "Pelanggan"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailItem(tx)} title="Detail">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openReceipt(tx)} title="Cetak Struk">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {canVoid && (
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => { setVoidItem(tx); setVoidReason(""); setVoidError("") }}
                          className="text-red-500 hover:text-red-700"
                          title="Void"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ===== Detail Dialog ===== */}
      <Dialog open={!!detailItem} onOpenChange={(v) => { if (!v) setDetailItem(null) }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
          {detailItem && (
            <>
              <DialogHeader className="p-5 pb-3 shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Detail Transaksi
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
                {/* Order Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. Pesanan</span>
                    <span className="font-mono font-bold">{detailItem.order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Waktu</span>
                    <span>
                      {new Date(detailItem.paidAt).toLocaleString("id-ID", {
                        day: "2-digit", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipe</span>
                    <Badge variant="outline">
                      {detailItem.order.type === "DINE_IN" ? "Dine-In" : "Takeaway"}
                    </Badge>
                  </div>
                  {detailItem.order.tableNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meja</span>
                      <span>{detailItem.order.tableNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kasir</span>
                    <span>{detailItem.order.createdBy?.name || "Pelanggan"}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="border rounded-lg p-3 space-y-2">
                  {detailItem.order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{item.menuItem.name}</span>
                        <span className="text-muted-foreground ml-2">×{item.quantity}</span>
                      </div>
                      <span className="font-mono">{formatRupiah(item.priceAtOrder * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Payment */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-700">{formatRupiah(detailItem.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Metode</span>
                    <Badge variant={detailItem.paymentMethod === "CASH" ? "secondary" : "default"}>
                      {detailItem.paymentMethod === "CASH" ? "Tunai" : "QRIS"}
                    </Badge>
                  </div>
                  {detailItem.paymentMethod === "CASH" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Diterima</span>
                        <span className="font-mono">{formatRupiah(detailItem.cashReceived || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Kembalian</span>
                        <span className="font-mono font-bold">{formatRupiah(detailItem.changeAmount || 0)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-5 pt-3 border-t flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => setDetailItem(null)} className="flex-1">
                  Tutup
                </Button>
                <Button onClick={() => { openReceipt(detailItem); setDetailItem(null) }} className="flex-1 bg-amber-800 hover:bg-amber-900">
                  <Printer className="h-4 w-4 mr-2" /> Cetak Struk
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Void Dialog ===== */}
      {canVoid && (
        <Dialog open={!!voidItem} onOpenChange={(v) => { if (!v) setVoidItem(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Void Transaksi</DialogTitle>
            </DialogHeader>
            {voidItem && (
              <div className="space-y-4 py-2">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Pesanan:</span> <span className="font-mono font-bold">{voidItem.order.orderNumber}</span></p>
                  <p><span className="text-muted-foreground">Total:</span> <span className="font-bold">{formatRupiah(voidItem.totalAmount)}</span></p>
                  <p><span className="text-muted-foreground">Metode:</span> {voidItem.paymentMethod === "CASH" ? "Tunai" : "QRIS"}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Void akan mengembalikan stok menu dan menghapus transaksi dari pendapatan. Tindakan ini tidak dapat dibatalkan.
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alasan pembatalan <span className="text-red-500">*</span></label>
                  <Input
                    value={voidReason}
                    onChange={(e) => { setVoidReason(e.target.value); setVoidError("") }}
                    placeholder="Contoh: Pelanggan batal, salah input, dll."
                  />
                </div>
                {voidError && (
                  <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">
                    {voidError}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidItem(null)}>Batal</Button>
              <Button
                onClick={handleVoid}
                disabled={voiding}
                className="bg-red-600 hover:bg-red-700"
              >
                {voiding ? "Memproses..." : "Konfirmasi Void"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={receiptData}
      />
    </div>
  )
}
