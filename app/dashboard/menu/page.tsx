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
import { formatRupiah } from "@/lib/utils"

type Category = { id: string; name: string }
type MenuItem = {
  id: string
  name: string
  categoryId: string
  category: Category
  price: number
  initialStock: number
  currentStock: number
  minThreshold: number
  isActive: boolean
}

const emptyForm = {
  name: "",
  categoryId: "",
  price: "",
  initialStock: "",
  minThreshold: "25",
  isActive: true,
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [itemsRes, catsRes] = await Promise.all([
      fetch("/api/menu-items"),
      fetch("/api/categories"),
    ])
    const [itemsData, catsData] = await Promise.all([itemsRes.json(), catsRes.json()])
    if (itemsData.success) setItems(itemsData.data)
    if (catsData.success) setCategories(catsData.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = filterCat === "all"
    ? items
    : items.filter((i) => i.categoryId === filterCat)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      price: item.price.toString(),
      initialStock: item.initialStock.toString(),
      minThreshold: (item.minThreshold * 100).toString(),
      isActive: item.isActive,
    })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const price = parseInt(form.price)
    const initialStock = parseInt(form.initialStock)
    const minThreshold = parseInt(form.minThreshold) / 100

    if (!form.name.trim()) { setError("Nama menu wajib diisi"); return }
    if (!form.categoryId) { setError("Kategori wajib dipilih"); return }
    if (!price || price <= 0) { setError("Harga harus lebih dari 0"); return }
    if (!initialStock || initialStock < 1) { setError("Stok awal minimal 1"); return }

    setSaving(true)
    setError("")

    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      price,
      initialStock,
      minThreshold,
      isActive: form.isActive,
    }

    const url = editing ? `/api/menu-items/${editing.id}` : "/api/menu-items"
    const method = editing ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (data.success) {
      setDialogOpen(false)
      fetchData()
    } else {
      setError(data.error)
    }
    setSaving(false)
  }

  const toggleActive = async (item: MenuItem) => {
    const action = item.isActive ? "nonaktifkan" : "aktifkan"
    if (!confirm(`${action} menu "${item.name}"?`)) return

    await fetch(`/api/menu-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    })
    fetchData()
  }

  const handleResetStock = async () => {
    if (!confirm("Reset semua stok ke stok awal? Ini biasanya dilakukan di awal hari.")) return

    const res = await fetch("/api/menu-items/reset-stock", { method: "POST" })
    const data = await res.json()
    if (data.success) {
      alert(`${data.data.resetCount} menu berhasil direset`)
      fetchData()
    } else {
      alert(data.error)
    }
  }

  const formatPriceInput = (value: string) => {
    return value.replace(/\D/g, "")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kelola Menu</h1>
          <p className="text-sm text-muted-foreground">Atur daftar menu dan stok harian</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetStock}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset Stok Harian
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
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Tidak ada menu
                </TableCell>
              </TableRow>
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
                      <span className={lowStock && item.isActive ? "text-red-600 font-bold" : ""}>
                        {item.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{Math.round(item.minThreshold * 100)}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(item)}
                          className={item.isActive ? "text-orange-500" : "text-green-600"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Menu" : "Tambah Menu"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Menu</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Rendang Daging"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Harga (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  value={form.price ? parseInt(form.price).toLocaleString("id-ID") : ""}
                  onChange={(e) => setForm({ ...form, price: formatPriceInput(e.target.value) })}
                  className="pl-10"
                  placeholder="25.000"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stok Awal Harian</label>
                <Input
                  type="number"
                  value={form.initialStock}
                  onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                  min={1}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Threshold Restock (%)</label>
                <Input
                  type="number"
                  value={form.minThreshold}
                  onChange={(e) => setForm({ ...form, minThreshold: e.target.value })}
                  min={1}
                  max={100}
                  placeholder="25"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium">Menu aktif (tampil di kasir)</label>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-800 hover:bg-amber-900">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
