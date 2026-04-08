"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { RotateCcw, RefreshCw } from "lucide-react"
import { formatRupiah, cn } from "@/lib/utils"

type Category = { id: string; name: string }
type StockItem = {
  id: string; name: string; price: number;
  currentStock: number; initialStock: number;
  minThreshold: number; categoryId: string;
  category: Category
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

function getBgClass(color: string): string {
  switch (color) {
    case "green": return "border-green-200 bg-green-50/50"
    case "yellow": return "border-yellow-200 bg-yellow-50/50"
    case "red": return "border-red-200 bg-red-50/50"
    default: return "border-gray-200 bg-gray-50"
  }
}

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filterCat, setFilterCat] = useState("all")
  const [loading, setLoading] = useState(true)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = useCallback(async () => {
    const [stockRes, catRes] = await Promise.all([
      fetch("/api/stock"),
      fetch("/api/categories"),
    ])
    const [stockData, catData] = await Promise.all([stockRes.json(), catRes.json()])
    if (stockData.success) setItems(stockData.data)
    if (catData.success) setCategories(catData.data)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filtered = filterCat === "all"
    ? items
    : items.filter((i) => i.categoryId === filterCat)

  // Stats
  const totalItems = items.length
  const outOfStock = items.filter((i) => i.currentStock === 0).length
  const lowStock = items.filter((i) => {
    const pct = (i.currentStock / i.initialStock) * 100
    return pct > 0 && pct <= 25
  }).length

  const handleReset = async () => {
    setResetting(true)
    const res = await fetch("/api/stock/reset", { method: "POST" })
    const data = await res.json()
    if (data.success) {
      setResetDialogOpen(false)
      fetchData()
    } else {
      alert(data.error)
    }
    setResetting(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stok Etalase</h1>
          <p className="text-sm text-muted-foreground">
            Terakhir diperbarui: {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            {" · "}Auto-refresh setiap 30 detik
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <RotateCcw className="h-4 w-4 mr-1" /> Reset Stok Harian
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold">{totalItems}</p>
          <p className="text-xs text-muted-foreground">Total Menu</p>
        </div>
        <div className="rounded-xl border bg-red-50 border-red-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{outOfStock}</p>
          <p className="text-xs text-red-600">Habis</p>
        </div>
        <div className="rounded-xl border bg-yellow-50 border-yellow-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{lowStock}</p>
          <p className="text-xs text-yellow-600">Stok Rendah</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">
          {filtered.length} menu
        </span>
      </div>

      {/* Stock Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((item) => {
            const pct = item.initialStock > 0
              ? Math.round((item.currentStock / item.initialStock) * 100)
              : 0
            const color = getStockColor(item.currentStock, item.initialStock)
            const isOut = item.currentStock === 0

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  getBgClass(color),
                  isOut && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.category.name}
                    </p>
                  </div>
                  {isOut && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">
                      HABIS
                    </Badge>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-3">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", getBarClass(color))}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                {/* Label */}
                <div className="flex items-center justify-between mt-2">
                  <span className={cn(
                    "text-xs font-bold",
                    color === "red" ? "text-red-700" :
                    color === "yellow" ? "text-yellow-700" :
                    color === "green" ? "text-green-700" :
                    "text-gray-500"
                  )}>
                    {isOut ? "HABIS" : `${item.currentStock}/${item.initialStock} porsi`}
                  </span>
                  <span className={cn(
                    "text-xs font-semibold",
                    color === "red" ? "text-red-600" :
                    color === "yellow" ? "text-yellow-600" :
                    color === "green" ? "text-green-600" :
                    "text-gray-400"
                  )}>
                    {pct}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Stok Harian</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Tindakan ini akan:
            </p>
            <ul className="text-sm space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                Mereset semua stok menu ke jumlah stok awal
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                Menyelesaikan semua notifikasi restock yang tertunda
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                Mencatat log reset harian
              </li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">
                Biasanya dilakukan di awal hari sebelum restoran buka.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleReset}
              disabled={resetting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {resetting ? "Mereset..." : "Ya, Reset Stok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
