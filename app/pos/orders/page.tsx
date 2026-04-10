"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { formatRupiah, cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Check, X, Eye, Globe, User } from "lucide-react"

type OrderItem = {
  id: string; menuItemId: string; quantity: number;
  priceAtOrder: number; menuItem: { name: string }
}
type Order = {
  id: string; orderNumber: string; type: string; status: string;
  source: string; tableNumber: number | null; customerNote: string | null;
  rejectReason: string | null; createdAt: string;
  items: OrderItem[]
  createdBy: { name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_CONFIRMATION: "Menunggu",
  OPEN: "Aktif",
  PAID: "Lunas",
  CANCELLED: "Batal",
}
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING_CONFIRMATION: "default",
  OPEN: "default",
  PAID: "secondary",
  CANCELLED: "destructive",
}

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 600; osc.type = "sine"; gain.gain.value = 0.4
    osc.start(); osc.stop(ctx.currentTime + 0.15)
    setTimeout(() => {
      const o2 = ctx.createOscillator(); const g2 = ctx.createGain()
      o2.connect(g2); g2.connect(ctx.destination)
      o2.frequency.value = 800; o2.type = "sine"; g2.gain.value = 0.4
      o2.start(); o2.stop(ctx.currentTime + 0.15)
    }, 180)
    setTimeout(() => {
      const o3 = ctx.createOscillator(); const g3 = ctx.createGain()
      o3.connect(g3); g3.connect(ctx.destination)
      o3.frequency.value = 1000; o3.type = "sine"; g3.gain.value = 0.4
      o3.start(); o3.stop(ctx.currentTime + 0.2)
    }, 360)
  } catch {}
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"all" | "waiter" | "online">("all")
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [processing, setProcessing] = useState(false)
  const prevCountRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/orders?date=today")
    const data = await res.json()
    if (data.success) {
      const newOrders: Order[] = data.data
      // Check for new online orders
      const pendingOnline = newOrders.filter((o) => o.source === "ONLINE" && o.status === "PENDING_CONFIRMATION")
      if (pendingOnline.length > prevCountRef.current) {
        playNotifSound()
      }
      prevCountRef.current = pendingOnline.length
      setOrders(newOrders)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Supabase realtime for new orders
  useEffect(() => {
    const channel = supabase
      .channel("pos-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "Order" }, () => {
        fetchOrders()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  // Fallback polling
  useEffect(() => {
    const interval = setInterval(fetchOrders, 15000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const filtered = orders.filter((o) => {
    if (tab === "waiter") return o.source === "WAITER"
    if (tab === "online") return o.source === "ONLINE"
    return true
  })

  const pendingCount = orders.filter((o) => o.source === "ONLINE" && o.status === "PENDING_CONFIRMATION").length

  const handleConfirm = async (orderId: string) => {
    setProcessing(true)
    const res = await fetch(`/api/orders/${orderId}/confirm`, { method: "PUT" })
    const data = await res.json()
    if (data.success) {
      setDetailOrder(null)
      fetchOrders()
    } else {
      alert(data.error)
    }
    setProcessing(false)
  }

  const handleReject = async () => {
    if (!rejectOrder) return
    setProcessing(true)
    const res = await fetch(`/api/orders/${rejectOrder.id}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason || "Ditolak oleh pelayan" }),
    })
    const data = await res.json()
    if (data.success) {
      setRejectOrder(null); setRejectReason("")
      fetchOrders()
    } else {
      alert(data.error)
    }
    setProcessing(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pesanan Hari Ini</h1>
          <p className="text-sm text-muted-foreground">{orders.length} pesanan</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["all", "waiter", "online"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors relative",
              tab === t ? "bg-amber-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t === "all" && "Semua"}
            {t === "waiter" && <><User className="h-3.5 w-3.5 inline mr-1" />Waiter</>}
            {t === "online" && (
              <>
                <Globe className="h-3.5 w-3.5 inline mr-1" />Online
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Pending Online Orders Banner */}
      {pendingCount > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <p className="font-bold text-orange-800">{pendingCount} pesanan online menunggu konfirmasi!</p>
            <p className="text-sm text-orange-600">Ketuk untuk melihat detail dan konfirmasi.</p>
          </div>
          <Button size="sm" onClick={() => setTab("online")} className="bg-orange-600 hover:bg-orange-700">
            Lihat
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Pesanan</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Meja</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada pesanan</TableCell></TableRow>
            ) : (
              filtered.map((order) => {
                const total = order.items.reduce((s, i) => s + i.priceAtOrder * i.quantity, 0)
                const isPending = order.status === "PENDING_CONFIRMATION"
                return (
                  <TableRow key={order.id} className={isPending ? "bg-orange-50" : ""}>
                    <TableCell className="font-mono font-medium text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.source === "ONLINE" ? "default" : "secondary"}
                        className={cn("text-xs", order.source === "ONLINE" && "bg-orange-500")}>
                        {order.source === "ONLINE" ? "🌐 Online" : "👤 Waiter"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {order.type === "DINE_IN" ? "Dine-In" : "Takeaway"}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.tableNumber || "-"}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatRupiah(total)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status] || "secondary"}
                        className={cn("text-xs", isPending && "bg-yellow-500 text-white animate-pulse")}>
                        {STATUS_LABEL[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailOrder(order)} title="Detail">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isPending && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleConfirm(order.id)}
                              className="text-green-600 hover:text-green-800" title="Konfirmasi">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              onClick={() => { setRejectOrder(order); setRejectReason("") }}
                              className="text-red-500 hover:text-red-700" title="Tolak">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(v) => { if (!v) setDetailOrder(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detail Pesanan
              {detailOrder?.source === "ONLINE" && (
                <Badge className="bg-orange-500 text-xs">Online</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No. Pesanan</span>
                  <span className="font-mono font-bold">{detailOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meja</span>
                  <span>{detailOrder.tableNumber || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waktu</span>
                  <span>{new Date(detailOrder.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={STATUS_VARIANT[detailOrder.status]}>{STATUS_LABEL[detailOrder.status]}</Badge>
                </div>
              </div>

              {detailOrder.customerNote && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800 mb-1">Catatan Pelanggan:</p>
                  <p className="text-sm">{detailOrder.customerNote}</p>
                </div>
              )}

              <div className="border rounded-lg p-3 space-y-2">
                {detailOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.menuItem.name}</span>
                      <span className="text-muted-foreground ml-2">×{item.quantity}</span>
                    </div>
                    <span className="font-mono">{formatRupiah(item.priceAtOrder * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatRupiah(detailOrder.items.reduce((s, i) => s + i.priceAtOrder * i.quantity, 0))}</span>
                </div>
              </div>

              {detailOrder.status === "PENDING_CONFIRMATION" && (
                <div className="flex gap-2">
                  <Button onClick={() => handleConfirm(detailOrder.id)} disabled={processing}
                    className="flex-1 bg-green-700 hover:bg-green-800">
                    <Check className="h-4 w-4 mr-2" /> Konfirmasi
                  </Button>
                  <Button variant="outline" onClick={() => { setRejectOrder(detailOrder); setDetailOrder(null); setRejectReason("") }}
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
                    <X className="h-4 w-4 mr-2" /> Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectOrder} onOpenChange={(v) => { if (!v) setRejectOrder(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Tolak Pesanan</DialogTitle>
          </DialogHeader>
          {rejectOrder && (
            <div className="space-y-4 py-2">
              <p className="text-sm">
                Tolak pesanan <span className="font-mono font-bold">{rejectOrder.orderNumber}</span> dari Meja {rejectOrder.tableNumber}?
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Alasan (opsional)</label>
                <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Menu habis, restoran tutup" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOrder(null)}>Batal</Button>
            <Button onClick={handleReject} disabled={processing} className="bg-red-600 hover:bg-red-700">
              {processing ? "Memproses..." : "Tolak Pesanan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
