"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type UserOption = { id: string; name: string; role: string }

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Pemilik",
  KASIR: "Kasir",
  WAITER: "Pelayan",
  DAPUR: "Dapur",
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUsers(data.data)
      })
  }, [])

  const handlePinChange = (value: string) => {
    if (/^\d{0,4}$/.test(value)) {
      setPin(value)
      setError("")
    }
  }

  const handleLogin = async () => {
    if (!selectedUserId) {
      setError("Pilih nama pengguna")
      return
    }
    if (pin.length !== 4) {
      setError("PIN harus 4 digit")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, pin }),
      })
      const data = await res.json()

      if (data.success) {
        router.push(data.data.redirect)
      } else {
        setError(data.error)
        setPin("")
      }
    } catch {
      setError("Gagal menghubungi server")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="w-full max-w-sm mx-4">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 mb-4 shadow-lg">
            <span className="text-3xl">🍛</span>
          </div>
          <h1 className="text-2xl font-bold text-amber-900 tracking-tight">
            RM. Etek Minang
          </h1>
          <p className="text-amber-700/70 text-sm mt-1">Sistem Kasir</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-900">
              Nama Pengguna
            </label>
            <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setError("") }}>
              <SelectTrigger className="h-12 text-base border-amber-200 focus:ring-amber-500">
                <SelectValue placeholder="Pilih pengguna..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id} className="text-base py-3">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      — {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-900">
              PIN (4 digit)
            </label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••"
              className="h-12 text-center text-2xl tracking-[0.5em] border-amber-200 focus-visible:ring-amber-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">
              {error}
            </div>
          )}

          <Button
            onClick={handleLogin}
            disabled={loading || !selectedUserId || pin.length !== 4}
            className="w-full h-12 text-base font-semibold bg-amber-800 hover:bg-amber-900 text-white"
          >
            {loading ? "Masuk..." : "Masuk"}
          </Button>
        </div>

        <p className="text-center text-xs text-amber-600/50 mt-6">
          Sesi aktif selama 8 jam (satu shift)
        </p>
      </div>
    </div>
  )
}
