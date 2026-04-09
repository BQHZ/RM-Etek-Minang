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
import { Save, Plus, Pencil, Power, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"

type Settings = {
  restaurantName: string; restaurantAddress: string; restaurantPhone: string;
  openTime: string; closeTime: string
}
type User = {
  id: string; name: string; username: string; role: string; isActive: boolean; createdAt: string
}

const ROLE_OPTIONS = [
  { value: "OWNER", label: "Pemilik" },
  { value: "KASIR", label: "Kasir" },
  { value: "WAITER", label: "Pelayan" },
  { value: "DAPUR", label: "Dapur" },
]
const ROLE_LABELS: Record<string, string> = { OWNER: "Pemilik", KASIR: "Kasir", WAITER: "Pelayan", DAPUR: "Dapur" }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState("")

  // User dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({ name: "", username: "", pin: "", role: "WAITER" })
  const [userError, setUserError] = useState("")
  const [savingUser, setSavingUser] = useState(false)

  // PIN reset dialog
  const [pinUser, setPinUser] = useState<User | null>(null)
  const [newPin, setNewPin] = useState("")
  const [pinError, setPinError] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [sRes, uRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/users?all=true"),
    ])
    const [sData, uData] = await Promise.all([sRes.json(), uRes.json()])
    if (sData.success) setSettings(sData.data)
    if (uData.success) setUsers(uData.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // --- Settings ---
  const handleSaveSettings = async () => {
    if (!settings) return
    setSavingSettings(true); setSettingsMsg("")
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    const data = await res.json()
    if (data.success) setSettingsMsg("✅ Pengaturan tersimpan")
    else setSettingsMsg("❌ Gagal menyimpan")
    setSavingSettings(false)
    setTimeout(() => setSettingsMsg(""), 3000)
  }

  // --- Users ---
  const openAddUser = () => {
    setEditingUser(null)
    setUserForm({ name: "", username: "", pin: "", role: "WAITER" })
    setUserError(""); setUserDialogOpen(true)
  }
  const openEditUser = (u: User) => {
    setEditingUser(u)
    setUserForm({ name: u.name, username: u.username, pin: "", role: u.role })
    setUserError(""); setUserDialogOpen(true)
  }

  const handleSaveUser = async () => {
    if (!userForm.name.trim()) { setUserError("Nama wajib diisi"); return }
    if (!userForm.username.trim()) { setUserError("Username wajib diisi"); return }
    if (!editingUser && !/^\d{4}$/.test(userForm.pin)) { setUserError("PIN harus 4 digit angka"); return }
    setSavingUser(true); setUserError("")

    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
    const method = editingUser ? "PUT" : "POST"
    const body: any = { name: userForm.name, username: userForm.username, role: userForm.role }
    if (!editingUser) body.pin = userForm.pin

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.success) { setUserDialogOpen(false); fetchData() }
    else setUserError(data.error)
    setSavingUser(false)
  }

  const toggleUserActive = async (u: User) => {
    const action = u.isActive ? "nonaktifkan" : "aktifkan"
    if (!confirm(`${action} pengguna "${u.name}"?`)) return
    await fetch(`/api/users/${u.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    fetchData()
  }

  const handleResetPin = async () => {
    if (!pinUser) return
    if (!/^\d{4}$/.test(newPin)) { setPinError("PIN harus 4 digit angka"); return }
    const res = await fetch(`/api/users/${pinUser.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin }),
    })
    const data = await res.json()
    if (data.success) { setPinUser(null); setNewPin("") }
    else setPinError(data.error)
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Memuat...</div>

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Konfigurasi restoran dan kelola pengguna</p>
      </div>

      {/* ===== Section 1: Restaurant Info ===== */}
      {settings && (
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <h2 className="font-bold text-lg">Informasi Restoran</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Restoran</label>
              <Input value={settings.restaurantName}
                onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telepon</label>
              <Input value={settings.restaurantPhone}
                onChange={(e) => setSettings({ ...settings, restaurantPhone: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Alamat</label>
              <Input value={settings.restaurantAddress}
                onChange={(e) => setSettings({ ...settings, restaurantAddress: e.target.value })} />
            </div>
          </div>

          <h3 className="font-bold mt-4">Jam Operasional</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buka</label>
              <Input type="time" value={settings.openTime}
                onChange={(e) => setSettings({ ...settings, openTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tutup</label>
              <Input type="time" value={settings.closeTime}
                onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-amber-800 hover:bg-amber-900">
              <Save className="h-4 w-4 mr-2" />
              {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
            {settingsMsg && <span className="text-sm">{settingsMsg}</span>}
          </div>
        </div>
      )}

      {/* ===== Section 2: User Management ===== */}
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Kelola Pengguna</h2>
          <Button onClick={openAddUser} size="sm" className="bg-amber-800 hover:bg-amber-900">
            <Plus className="h-4 w-4 mr-2" /> Tambah
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="font-mono text-sm">{u.username}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{ROLE_LABELS[u.role] || u.role}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={u.isActive ? "default" : "secondary"} className="text-xs">
                    {u.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditUser(u)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon"
                      onClick={() => { setPinUser(u); setNewPin(""); setPinError("") }} title="Reset PIN">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleUserActive(u)}
                      className={u.isActive ? "text-orange-500" : "text-green-600"} title={u.isActive ? "Nonaktifkan" : "Aktifkan"}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama</label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN (4 digit)</label>
                <Input type="password" maxLength={4} inputMode="numeric"
                  value={userForm.pin} onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {userError && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">{userError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveUser} disabled={savingUser} className="bg-amber-800 hover:bg-amber-900">
              {savingUser ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset PIN Dialog */}
      <Dialog open={!!pinUser} onOpenChange={(v) => { if (!v) setPinUser(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset PIN</DialogTitle>
          </DialogHeader>
          {pinUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm">Reset PIN untuk <span className="font-bold">{pinUser.name}</span></p>
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN Baru (4 digit)</label>
                <Input type="password" maxLength={4} inputMode="numeric" value={newPin}
                  onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError("") }}
                  placeholder="••••" className="text-center text-2xl tracking-[0.5em]" />
              </div>
              {pinError && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">{pinError}</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinUser(null)}>Batal</Button>
            <Button onClick={handleResetPin} className="bg-amber-800 hover:bg-amber-900">Reset PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
