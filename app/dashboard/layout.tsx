"use client"

import { SessionProvider, useSession } from "@/components/session-provider"
import AppHeader from "@/components/app-header"
import AppSidebar, { SidebarItem } from "@/components/app-sidebar"
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Wallet,
  Package,
  List,
} from "lucide-react"

const DASHBOARD_NAV: SidebarItem[] = [
  { label: "Ringkasan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Laporan", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Pengeluaran", href: "/dashboard/expenses", icon: Wallet },
  { label: "Kategori", href: "/dashboard/categories", icon: List },
  { label: "Stok & Menu", href: "/dashboard/menu", icon: Package },
  { label: "Pengguna", href: "/dashboard/users", icon: Users },
]

function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = useSession()
  return (
    <div className="h-screen flex flex-col">
      <AppHeader userName={session.name} role={session.role} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar items={DASHBOARD_NAV} />
        <main className="flex-1 overflow-auto bg-gray-50 p-4">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  )
}
