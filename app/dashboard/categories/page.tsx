"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

type Category = {
  id: string
  name: string
  sortOrder: number
  _count: { menuItems: number }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", sortOrder: 0 })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/categories")
    const data = await res.json()
    if (data.success) setCategories(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: "", sortOrder: categories.length + 1 })
    setError("")
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({ name: cat.name, sortOrder: cat.sortOrder })
    setError("")
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Nama kategori wajib diisi"); return }
    setSaving(true)
    setError("")

    const url = editing ? `/api/categories/${editing.id}` : "/api/categories"
    const method = editing ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? form : { name: form.name }),
    })
    const data = await res.json()

    if (data.success) {
      setDialogOpen(false)
      fetchCategories()
    } else {
      setError(data.error)
    }
    setSaving(false)
  }

  const handleDelete = async (cat: Category) => {
    if (cat._count.menuItems > 0) {
      alert(`Tidak bisa menghapus: masih ada ${cat._count.menuItems} menu terkait`)
      return
    }
    if (!confirm(`Hapus kategori "${cat.name}"?`)) return

    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      fetchCategories()
    } else {
      alert(data.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Kategori</h1>
          <p className="text-sm text-muted-foreground">Atur kategori menu restoran</p>
        </div>
        <Button onClick={openAdd} className="bg-amber-800 hover:bg-amber-900">
          <Plus className="h-4 w-4 mr-2" /> Tambah Kategori
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Urutan</TableHead>
              <TableHead>Nama Kategori</TableHead>
              <TableHead className="w-32 text-center">Jumlah Menu</TableHead>
              <TableHead className="w-28 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Belum ada kategori
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-mono text-center">{cat.sortOrder}</TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-center">{cat._count.menuItems}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cat)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Kategori" : "Tambah Kategori"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Kategori</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Lauk"
              />
            </div>
            {editing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Urutan Tampil</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  min={1}
                />
              </div>
            )}
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
