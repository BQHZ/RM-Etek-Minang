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
import { Plus, Pencil, Trash2, Wallet } from "lucide-react"
import { formatRupiah, cn } from "@/lib/utils"

type Expense = {
  id: string; date: string; description: string; amount: number;
  createdAt: string; recordedBy: { name: string }
}

const TEMPLATES = [
  { label: "Belanja Bahan Baku", desc: "Belanja bahan baku di pasar" },
  { label: "Gas LPG", desc: "Pembelian gas LPG" },
  { label: "Perlengkapan", desc: "Pembelian perlengkapan" },
  { label: "Operasional Lain", desc: "Pengeluaran operasional lain" },
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isSameDay(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(todayStr())

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState({ date: todayStr(), description: "", amount: "" })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState("")
  const [keepOpen, setKeepOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [listRes, totalRes] = await Promise.all([
      fetch(`/api/expenses?date=${filterDate}`),
      fetch(`/api/expenses/total?date=${filterDate}`),
    ])
    const [listData, totalData] = await Promise.all([listRes.json(), totalRes.json()])
    if (listData.success) setExpenses(listData.data)
    if (totalData.success) { setTotalAmount(totalData.data.total); setTotalCount(totalData.data.count) }
    setLoading(false)
  }, [filterDate])

  useEffect(() => { fetchData() }, [fetchData])

  const openAdd = () => {
    setEditing(null)
    setForm({ date: todayStr(), description: "", amount: "" })
    setError(""); setSavedMsg(""); setKeepOpen(false)
    setDialogOpen(true)
  }

  const openEdit = (exp: Expense) => {
    setEditing(exp)
    const d = new Date(exp.date)
    setForm({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      description: exp.description,
      amount: exp.amount.toString(),
    })
    setError(""); setSavedMsg(""); setKeepOpen(false)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.description.trim()) { setError("Deskripsi wajib diisi"); return }
    const amount = parseInt(form.amount.replace(/\D/g, ""))
    if (!amount || amount <= 0) { setError("Jumlah harus lebih dari 0"); return }
    if (!editing && !isSameDay(form.date)) {
      if (!confirm("Tanggal bukan hari ini. Lanjutkan?")) return
    }

    setSaving(true); setError("")
    const url = editing ? `/api/expenses/${editing.id}` : "/api/expenses"
    const method = editing ? "PUT" : "POST"
    const body = editing
      ? { description: form.description, amount }
      : { date: form.date, description: form.description, amount }

    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    const data = await res.json()

    if (data.success) {
      fetchData()
      if (editing) {
        setDialogOpen(false)
      } else {
        setSavedMsg(`✅ "${form.description}" — ${formatRupiah(amount)} tersimpan`)
        setForm({ ...form, description: "", amount: "" })
        setKeepOpen(true)
      }
    } else {
      setError(data.error)
    }
    setSaving(false)
  }

  const handleDelete = async (exp: Expense) => {
    if (!confirm(`Hapus "${exp.description}"?`)) return
    const res = await fetch(`/api/expenses/${exp.id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) fetchData()
    else alert(data.error)
  }

  const applyTemplate = (desc: string) => {
    setForm({ ...form, description: desc }); setSavedMsg(""); setError("")
  }

  const dateLabel = new Date(filterDate + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pengeluaran</h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-44" />
          <Button onClick={openAdd} className="bg-amber-800 hover:bg-amber-900">
            <Plus className="h-4 w-4 mr-2" /> Tambah
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-gradient-to-br from-red-50 to-orange-50 border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-700 mb-1">
            <Wallet className="h-4 w-4" /><span className="text-xs font-medium">Total Pengeluaran</span>
          </div>
          <p className="text-2xl font-bold text-red-800">{formatRupiah(totalAmount)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Jumlah Entri</p>
          <p className="text-2xl font-bold mt-1">{totalCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Dicatat oleh</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : expenses.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada pengeluaran</TableCell></TableRow>
            ) : (
              expenses.map((exp) => {
                const isToday = isSameDay(exp.date)
                return (
                  <TableRow key={exp.id}>
                    <TableCell className="text-sm">
                      {new Date(exp.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="font-medium">{exp.description}</TableCell>
                    <TableCell className="text-right font-mono font-medium text-red-700">{formatRupiah(exp.amount)}</TableCell>
                    <TableCell className="text-sm">{exp.recordedBy.name}</TableCell>
                    <TableCell className="text-right">
                      {isToday ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(exp)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(exp)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ===== Add/Edit Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {savedMsg && (
              <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2 border border-green-200">{savedMsg}</div>
            )}

            {!editing && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Template cepat:</label>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((t) => (
                    <button key={t.label} onClick={() => applyTemplate(t.desc)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95",
                        form.description === t.desc
                          ? "bg-amber-100 border-amber-400 text-amber-800"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-amber-300"
                      )}>{t.label}</button>
                  ))}
                </div>
              </div>
            )}

            {!editing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal</label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                {!isSameDay(form.date) && <p className="text-xs text-orange-600">⚠ Bukan tanggal hari ini</p>}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi</label>
              <Input value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setError("") }}
                placeholder="Contoh: Belanja sayur di pasar" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input value={form.amount ? parseInt(form.amount.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })}
                  className="pl-10" placeholder="50.000" inputMode="numeric" />
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{keepOpen ? "Selesai" : "Batal"}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-800 hover:bg-amber-900">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
