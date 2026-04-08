"use client"

import { SessionProvider, useSession } from "@/components/session-provider"
import AppHeader from "@/components/app-header"

function KitchenShell({ children }: { children: React.ReactNode }) {
  const session = useSession()
  return (
    <div className="h-screen flex flex-col">
      <AppHeader userName={session.name} role={session.role} />
      <main className="flex-1 overflow-auto bg-gray-50 p-4">
        {children}
      </main>
    </div>
  )
}

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <KitchenShell>{children}</KitchenShell>
    </SessionProvider>
  )
}
