"use client"

import { useSession } from "@/components/session-provider"

export default function DashboardPage() {
  const session = useSession()
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-1">
        Selamat datang, {session.name}. Dashboard pemilik akan dibangun di tahap berikutnya.
      </p>
    </div>
  )
}
