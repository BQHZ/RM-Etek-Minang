"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter,
} from "@/components/ui/table"
import { formatRupiah } from "@/lib/utils"
import dynamic from "next/dynamic"

// Lazy load recharts
const RechartsBar = dynamic(
  () => import("recharts").then((mod) => {
    const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } = mod
    return function TopItemsChart({ data }: { data: any[] }) {
      const colors = ["#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d"]
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}rb` : v.toString()} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => [`${value} porsi`, "Terjual"]} />
            <Bar dataKey="quantity" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }
  }),
  { ssr: false, loading: () => <div className="h-[250px] bg-gray-50 rounded-lg animate-pulse" /> }
)

const RechartsPie = dynamic(
  () => import("recharts").then((mod) => {
    const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } = mod
    return function PaymentPieChart({ data }: { data: any[] }) {
      const colors = ["#16a34a", "#2563eb"]
      return (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(value: number) => formatRupiah(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )
    }
  }),
  { ssr: false, loading: () => <div className="h-[250px] bg-gray-50 rounded-lg animate-pulse" /> }
)

type DailyReport = {
  date: string; totalRevenue: number; totalCount: number; avgPerTransaction: number;
  cash: { count: number; revenue: number }; qris: { count: number; revenue: number };
  dineIn: { count: number; revenue: number }; takeaway: { count: number; revenue: number };
  stock: {
    outOfStock: { name: string; currentStock: number; initialStock: number }[];
    remaining: { name: string; currentStock: number; initialStock: number }[];
  }
}
type MenuSale = { name: string; category: string; quantity: number; price: number; total: number }
type MenuSalesData = { items: MenuSale[]; grandTotal: number; totalPortions: number }

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function ReportsPage() {
  const [date, setDate] = useState(todayStr())
  const [report, setReport] = useState<DailyReport | null>(null)
  const [menuSales, setMenuSales] = useState<MenuSalesData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [repRes, menuRes] = await Promise.all([
      fetch(`/api/reports/daily?date=${date}`),
      fetch(`/api/reports/menu-sales?date=${date}`),
    ])
    const [repData, menuData] = await Promise.all([repRes.json(), menuRes.json()])
    if (repData.success) setReport(repData.data)
    if (menuData.success) setMenuSales(menuData.data)
    setLoading(false)
  }, [date])

  useEffect(() => { fetchData() }, [fetchData])

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Laporan Harian</h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : report && menuSales && (
        <>
          {/* ===== Section 1: Sales Summary ===== */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg">Ringkasan Penjualan</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-4">
                <p className="text-xs text-amber-700">Total Pendapatan</p>
                <p className="text-xl md:text-2xl font-bold text-amber-900 mt-1">{formatRupiah(report.totalRevenue)}</p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground">Jumlah Transaksi</p>
                <p className="text-xl font-bold mt-1">{report.totalCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Rata-rata: {formatRupiah(report.avgPerTransaction)}</p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground">Berdasarkan Metode</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Tunai ({report.cash.count})</span>
                    <span className="font-bold">{formatRupiah(report.cash.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>QRIS ({report.qris.count})</span>
                    <span className="font-bold">{formatRupiah(report.qris.revenue)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground">Berdasarkan Tipe</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Dine-In ({report.dineIn.count})</span>
                    <span className="font-bold">{formatRupiah(report.dineIn.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Takeaway ({report.takeaway.count})</span>
                    <span className="font-bold">{formatRupiah(report.takeaway.revenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Section 2: Menu Items Sold ===== */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg">Detail Penjualan Menu</h2>
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Menu</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Porsi</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuSales.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Belum ada penjualan
                      </TableCell>
                    </TableRow>
                  ) : (
                    menuSales.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatRupiah(item.price)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatRupiah(item.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {menuSales.items.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-center font-bold">{menuSales.totalPortions}</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-bold text-lg">{formatRupiah(menuSales.grandTotal)}</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </div>

          {/* ===== Section 3: Stock Summary ===== */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg">Sisa Stok Etalase</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Out of stock */}
              <div className="rounded-xl border bg-red-50 border-red-200 p-4">
                <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                  Habis <Badge variant="destructive" className="text-xs">{report.stock.outOfStock.length}</Badge>
                </h3>
                {report.stock.outOfStock.length === 0 ? (
                  <p className="text-sm text-red-600">Tidak ada menu yang habis</p>
                ) : (
                  <div className="space-y-1">
                    {report.stock.outOfStock.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="text-red-600 font-medium">0/{item.initialStock}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remaining */}
              <div className="rounded-xl border bg-white p-4">
                <h3 className="font-bold mb-3">Sisa Stok</h3>
                {report.stock.remaining.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada data</p>
                ) : (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {report.stock.remaining.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.currentStock}/{item.initialStock} porsi</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== Section 4: Charts ===== */}
          {menuSales.items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top 5 Best Sellers */}
              <div className="rounded-xl border bg-white p-5">
                <h3 className="font-bold mb-4">Top 5 Menu Terlaris</h3>
                <RechartsBar data={menuSales.items.slice(0, 5)} />
              </div>

              {/* Payment Method Pie */}
              <div className="rounded-xl border bg-white p-5">
                <h3 className="font-bold mb-4">Proporsi Metode Pembayaran</h3>
                <RechartsPie
                  data={[
                    { name: "Tunai", value: report.cash.revenue },
                    { name: "QRIS", value: report.qris.revenue },
                  ].filter((d) => d.value > 0)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
