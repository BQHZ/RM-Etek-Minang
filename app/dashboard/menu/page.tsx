"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Power, RotateCcw } from "lucide-react"
import { formatRupiah, cn } from "@/lib/utils"

type Category = { id: string; name: string }
type MenuItem = {
  id: string; name: string; categoryId: string; category: Category;
  price: number; initialStock: number; currentStock: number;
  minThreshold: number; isActive: boolean
}

const emptyForm = {
  name: "", categoryId: "", price: "", initialStock: "", minThreshold: "25", isActive: true,
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filterCat, setFilterCat] = useState("all")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Reset stock dialog
  const [resetOpen, setResetOpen] = useState(false)
  const [resetStocks, setResetStocks] = useState<Record<string, string>>({})
  const [resetFilterCat, setResetFilterCat] = useState("all")
  const [resetting, setResetting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [itemsRes, catsRes] = await Promise.all([
      fetch("/api/menu-items"), fetch("/api/categories"),
    ])
    const [itemsData, catsData] = await Promise.all([itemsRes.json(), catsRes.json()])
    if (itemsData.success) setItems(itemsData.data)
    if (catsData.success) setCategories(catsData.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = filterCat === "all" ? items : items.filter((i) => i.categoryId === filterCat)

  // --- Menu CRUD ---
  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(""); setDialogOpen(true) }

  const openEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({
      name: item.name, categoryId: item.categoryId, price: item.price.toString(),
      initialStock: item.initialStock.toString(), minThreshold: (item.minThreshold * 100).toString(),
      isActive: item.isActive,
    })
    setError(""); setDialogOpen(true)
  }

  const handleSave = async () => {
    const price = parseInt(form.price)
    const initialStock = parseInt(form.initialStock)
    const minThreshold = parseInt(form.minThreshold) / 100
    if (!form.name.trim()) { setError("Nama menu wajib diisi"); return }
    if (!form.categoryId) { setError("Kategori wajib dipilih"); return }
    if (!price || price <= 0) { setError("Harga harus lebih dari 0"); return }
    if (!initialStock || initialStock < 1) { setError("Stok awal minimal 1"); return }
    setSaving(true); setError("")
    const payload = { name: form.name, categoryId: form.categoryId, price, initialStock, minThreshold, isActive: form.isActive }
    const url = editing ? `/api/menu-items/${editing.id}` : "/api/menu-items"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (data.success) { setDialogOpen(false); fetchData() } else { setError(data.error) }
    setSaving(false)
  }

  const toggleActive = async (item: MenuItem) => {
    const action = item.isActive ? "nonaktifkan" : "aktifkan"
    if (!confirm(`${action} menu "${item.name}"?`)) return
    await fetch(`/api/menu-items/${item.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    })
    fetchData()
  }

  const formatPriceInput = (value: string) => value.replace(/\D/g, "")

  // --- Reset stock logic ---
  const openResetDialog = () => {
    const stocks: Record<string, string> = {}
    items.filter((i) => i.isActive).forEach((item) => {
      stocks[item.id] = item.initialStock.toString()
    })
    setResetStocks(stocks)
    setResetFilterCat("all")
    setResetOpen(true)
  }

  const handleResetStock = async () => {
    setResetting(true)
    const payload = items.filter((i) => i.isActive).map((item) => ({
      menuItemId: item.id,
      stock: parseInt(resetStocks[item.id] || "0") || 0,
    }))
    const res = await fetch("/api/menu-items/reset-stock", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    })
    const data = await res.json()
    if (data.success) { setResetOpen(false); fetchData() } else { alert(data.error) }
    setResetting(false)
  }

  const setAllStocksToDefault = () => {
    const stocks: Record<string, string> = {}
    items.filter((i) => i.isActive).forEach((item) => { stocks[item.id] = item.initialStock.toString() })
    setResetStocks(stocks)
  }

  const setAllStocksZero = () => {
    const stocks: Record<string, string> = {}
    items.filter((i) => i.isActive).forEach((item) => { stocks[item.id] = "0" })
    setResetStocks(stocks)
  }

  const resetFilteredItems = items.filter((i) => i.isActive).filter((i) =>
    resetFilterCat === "all" ? true : i.categoryId === resetFilterCat
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kelola Menu</h1>
          <p className="text-sm text-muted-foreground">Atur daftar menu dan stok harian</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openResetDialog}>
            <RotateCcw className="h-4 w-4 mr-2" /> Atur Stok Harian
          </Button>
          <Button onClick={openAdd} className="bg-amber-800 hover:bg-amber-900">
            <Plus className="h-4 w-4 mr-2" /> Tambah Menu
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">{filtered.length} menu</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Menu</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-center">Stok Awal</TableHead>
              <TableHead className="text-center">Stok Saat Ini</TableHead>
              <TableHead className="text-center">Threshold</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada menu</TableCell></TableRow>
            ) : (
              filtered.map((item) => {
                const lowStock = item.currentStock <= item.initialStock * item.minThreshold
                return (
                  <TableRow key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatRupiah(item.price)}</TableCell>
                    <TableCell className="text-center">{item.initialStock}</TableCell>
                    <TableCell className="text-center">
                      <span className={lowStock && item.isActive ? "text-red-600 font-bold" : ""}>{item.currentStock}</span>
                    </TableCell>
                    <TableCell className="text-center">{Math.round(item.minThreshold * 100)}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Aktif" : "Nonaktif"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(item)}
                          className={item.isActive ? "text-orange-500" : "text-green-600"}><Power className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ===== Add/Edit Menu Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Menu" : "Tambah Menu"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Menu</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Rendang Daging" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Harga (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input value={form.price ? parseInt(form.price).toLocaleString("id-ID") : ""}
                  onChange={(e) => setForm({ ...form, price: formatPriceInput(e.target.value) })}
                  className="pl-10" placeholder="25.000" inputMode="numeric" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stok Awal Default</label>
                <Input type="number" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} min={1} placeholder="30" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Threshold Restock (%)</label>
                <Input type="number" value={form.minThreshold} onChange={(e) => setForm({ ...form, minThreshold: e.target.value })} min={1} max={100} placeholder="25" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="isActive" className="text-sm font-medium">Menu aktif (tampil di kasir)</label>
            </div>
            {error && (<div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">{error}</div>)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-800 hover:bg-amber-900">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Manual Daily Stock Reset Dialog ===== */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="p-5 pb-3 shrink-0">
            <DialogTitle>Atur Stok Harian</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Masukkan jumlah porsi setiap menu untuk hari ini. Menu dengan stok 0 berarti tidak tersedia hari ini.
            </p>
          </DialogHeader>

          <div className="px-5 pb-3 flex items-center gap-2 flex-wrap shrink-0">
            <Select value={resetFilterCat} onValueChange={setResetFilterCat}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={setAllStocksToDefault}>Isi Default</Button>
            <Button variant="outline" size="sm" onClick={setAllStocksZero} className="text-red-500">Kosongkan Semua</Button>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto px-5 pb-3">
            <div className="space-y-1.5">
              {resetFilteredItems.map((item) => {
                const stockVal = parseInt(resetStocks[item.id] || "0") || 0
                const isZero = stockVal === 0
                return (
                  <div key={item.id} className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg border",
                    isZero ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-200"
                  )}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => {
                        const cur = parseInt(resetStocks[item.id] || "0") || 0
                        if (cur > 0) setResetStocks({ ...resetStocks, [item.id]: (cur - 1).toString() })
                      }} className="h-8 w-8 rounded-lg border bg-white flex items-center justify-center hover:bg-gray-100 active:scale-95 text-lg font-bold">−</button>
                      <Input type="number" value={resetStocks[item.id] || "0"}
                        onChange={(e) => setResetStocks({ ...resetStocks, [item.id]: e.target.value })}
                        className="w-16 h-8 text-center text-sm font-bold" min={0} />
                      <button onClick={() => {
                        const cur = parseInt(resetStocks[item.id] || "0") || 0
                        setResetStocks({ ...resetStocks, [item.id]: (cur + 1).toString() })
                      }} className="h-8 w-8 rounded-lg border bg-white flex items-center justify-center hover:bg-gray-100 active:scale-95 text-lg font-bold">+</button>
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                      {isZero ? "Libur" : `${stockVal} porsi`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="p-5 pt-3 border-t shrink-0">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {Object.values(resetStocks).filter((v) => parseInt(v) > 0).length}/{items.filter((i) => i.isActive).length} menu aktif hari ini
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setResetOpen(false)}>Batal</Button>
                <Button onClick={handleResetStock} disabled={resetting} className="bg-orange-600 hover:bg-orange-700">
                  {resetting ? "Menyimpan..." : "Simpan Stok Harian"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
