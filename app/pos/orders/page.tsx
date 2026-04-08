"use client"

import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table"
import { formatRupiah } from "@/lib/utils"

type Order = {
  id: string; orderNumber: string; type: string;
  status: string; tableNumber: number | null;
  createdAt: string;
  items: { priceAtOrder: number; quantity: number; menuItem: { name: string } }[]
  createdBy: { name: string }
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  OPEN: "default",
  PAID: "secondary",
  CANCELLED: "destructive",
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aktif",
  PAID: "Lunas",
  CANCELLED: "Batal",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/orders?date=today")
    const data = await res.json()
    if (data.success) setOrders(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pesanan Hari Ini</h1>
        <p className="text-sm text-muted-foreground">{orders.length} pesanan</p>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Pesanan</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Meja</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Belum ada pesanan hari ini
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const total = order.items.reduce((s, i) => s + i.priceAtOrder * i.quantity, 0)
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {order.type === "DINE_IN" ? "Dine-In" : "Takeaway"}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.tableNumber || "-"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {order.items.map((i) => `${i.menuItem.name} ×${i.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatRupiah(total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[order.status]}>
                        {STATUS_LABEL[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{order.createdBy.name}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(order.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
