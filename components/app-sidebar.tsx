"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export type SidebarItem = {
  label: string
  href: string
  icon: LucideIcon
}

export default function AppSidebar({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r bg-white shrink-0 hidden md:flex flex-col">
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const isRoot = item.href === "/pos" || item.href === "/dashboard"
          const active = isRoot
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-100 text-amber-900"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
