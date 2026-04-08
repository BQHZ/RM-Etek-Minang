"use client"

import { SessionProvider, useSession } from "@/components/session-provider"
import AppHeader from "@/components/app-header"
import AppSidebar, { SidebarItem } from "@/components/app-sidebar"
import {
  ShoppingCart,
  ClipboardList,
  Package,
  Receipt,
  BarChart3,
  Wallet,
} from "lucide-react"

const POS_NAV: SidebarItem[] = [
  { label: "Kasir", href: "/pos", icon: ShoppingCart },
  { label: "Pesanan", href: "/pos/orders", icon: ClipboardList },
  { label: "Stok Menu", href: "/pos/stock", icon: Package },
  { label: "Transaksi", href: "/pos/transactions", icon: Receipt },
  { label: "Pengeluaran", href: "/pos/expenses", icon: Wallet },
]

function PosShell({ children }: { children: React.ReactNode }) {
  const session = useSession()
  return (
    <div className="h-screen flex flex-col">
      <AppHeader userName={session.name} role={session.role} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar items={POS_NAV} />
        <main className="flex-1 overflow-auto bg-gray-50 p-4">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PosShell>{children}</PosShell>
    </SessionProvider>
  )
}
