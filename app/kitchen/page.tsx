"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, Plus, RefreshCw, ChefHat, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Category = { id: string; name: string }
type StockItem = {
  id: string; name: string;
  currentStock: number; initialStock: number;
  minThreshold: number; categoryId: string;
  category: Category
}
type Notification = {
  id: string; menuItemId: string; isResolved: boolean;
  createdAt: string; resolvedAt: string | null;
  menuItem: { name: string; currentStock: number; initialStock: number }
}

function getStockColor(current: number, initial: number): string {
  if (current === 0) return "gray"
  const pct = (current / initial) * 100
  if (pct <= 25) return "red"
  if (pct <= 50) return "yellow"
  return "green"
}

function getBarClass(color: string): string {
  switch (color) {
    case "green": return "bg-green-500"
    case "yellow": return "bg-yellow-500"
    case "red": return "bg-red-500"
    default: return "bg-gray-300"
  }
}

export default function KitchenPage() {
  const session = useSession()
  const [items, setItems] = useState<StockItem[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Restock dialog
  const [restockItem, setRestockItem] = useState<StockItem | null>(null)
  const [restockQty, setRestockQty] = useState("5")
  const [restocking, setRestocking] = useState(false)

  const fetchData = useCallback(async () => {
    const [stockRes, notifRes] = await Promise.all([
      fetch("/api/stock"),
      fetch("/api/notifications?status=unresolved"),
    ])
    const [stockData, notifData] = await Promise.all([stockRes.json(), notifRes.json()])
    if (stockData.success) setItems(stockData.data)
    if (notifData.success) setNotifications(notifData.data)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 15 seconds (kitchen needs faster updates)
  useEffect(() => {
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Items that need attention: out of stock or low stock
  const urgentItems = items.filter((i) => {
    const pct = (i.currentStock / i.initialStock) * 100
    return pct <= 25
  }).sort((a, b) => a.currentStock - b.currentStock)

  const handleRestock = async () => {
    if (!restockItem) return
    const qty = parseInt(restockQty)
    if (!qty || qty < 1) return

    setRestocking(true)
    const res = await fetch(`/api/stock/${restockItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: qty,
        note: `Ditambah oleh ${session.name}`,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setRestockItem(null)
      setRestockQty("5")
      fetchData()
    } else {
      alert(data.error)
    }
    setRestocking(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Memuat...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-amber-800" />
          <div>
            <h1 className="text-2xl font-bold">Tampilan Dapur</h1>
            <p className="text-sm text-muted-foreground">
              Update: {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              {" · "}Auto 15 detik
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Restock Alerts */}
      {notifications.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="font-bold text-red-800 text-lg">
              Perlu Restock! ({notifications.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {notifications.map((notif) => {
              const item = items.find((i) => i.id === notif.menuItemId)
              return (
                <div
                  key={notif.id}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100"
                >
                  <div>
                    <p className="font-semibold text-sm">{notif.menuItem.name}</p>
                    <p className="text-xs text-red-600 font-medium">
                      Sisa: {notif.menuItem.currentStock}/{notif.menuItem.initialStock} porsi
                    </p>
                  </div>
                  {item && (
                    <Button
                      size="sm"
                      onClick={() => { setRestockItem(item); setRestockQty("5") }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Tambah
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {notifications.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Semua stok aman</p>
          <p className="text-sm text-green-600 mt-1">Tidak ada menu yang perlu ditambah stoknya</p>
        </div>
      )}

      {/* All Menu Stock Overview */}
      <div>
        <h2 className="font-bold text-lg mb-3">Semua Stok Menu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => {
            const pct = item.initialStock > 0
              ? Math.round((item.currentStock / item.initialStock) * 100)
              : 0
            const color = getStockColor(item.currentStock, item.initialStock)
            const isOut = item.currentStock === 0

            return (
              <button
                key={item.id}
                onClick={() => { setRestockItem(item); setRestockQty("5") }}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all active:scale-[0.97]",
                  isOut
                    ? "border-gray-200 bg-gray-50 opacity-60"
                    : color === "red"
                    ? "border-red-200 bg-red-50/50 hover:border-red-400"
                    : color === "yellow"
                    ? "border-yellow-200 bg-yellow-50/50 hover:border-yellow-400"
                    : "border-green-200 bg-green-50/30 hover:border-green-400"
                )}
              >
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.category.name}</p>

                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", getBarClass(color))}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs font-bold">
                    {isOut ? "HABIS" : `${item.currentStock}/${item.initialStock}`}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Restock Dialog */}
      <Dialog open={!!restockItem} onOpenChange={(v) => { if (!v) setRestockItem(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Stok</DialogTitle>
          </DialogHeader>
          {restockItem && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-bold">{restockItem.name}</p>
                <p className="text-sm text-muted-foreground">{restockItem.category.name}</p>
                <p className="text-sm mt-1">
                  Stok saat ini:{" "}
                  <span className="font-bold">
                    {restockItem.currentStock}/{restockItem.initialStock} porsi
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah yang ditambahkan:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((q) => (
                    <button
                      key={q}
                      onClick={() => setRestockQty(q.toString())}
                      className={cn(
                        "py-2 rounded-lg text-sm font-semibold border transition-all active:scale-95",
                        parseInt(restockQty) === q
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
                      )}
                    >
                      +{q}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  min={1}
                  className="text-center text-lg font-bold"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-sm text-green-700">Stok setelah ditambah:</p>
                <p className="text-xl font-bold text-green-800">
                  {restockItem.currentStock + (parseInt(restockQty) || 0)} porsi
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockItem(null)}>Batal</Button>
            <Button
              onClick={handleRestock}
              disabled={restocking || !restockQty || parseInt(restockQty) < 1}
              className="bg-green-600 hover:bg-green-700"
            >
              {restocking ? "Menambah..." : "Tambah Stok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
