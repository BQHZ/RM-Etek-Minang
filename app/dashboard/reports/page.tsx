"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter,
} from "@/components/ui/table"
import { formatRupiah, cn } from "@/lib/utils"
import { fetchExportData, exportPDF, exportExcel } from "@/lib/export"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"

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
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
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
type Profit = {
  totalRevenue: number; totalExpenses: number; profit: number;
  revenueCount: number; expenseCount: number; hasExpenses: boolean
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
  const [profit, setProfit] = useState<Profit | null>(null)
  const [menuSales, setMenuSales] = useState<MenuSalesData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [repRes, profRes, menuRes] = await Promise.all([
      fetch(`/api/reports/daily?date=${date}`),
      fetch(`/api/reports/profit?date=${date}`),
      fetch(`/api/reports/menu-sales?date=${date}`),
    ])
    const [repData, profData, menuData] = await Promise.all([repRes.json(), profRes.json(), menuRes.json()])
    if (repData.success) setReport(repData.data)
    if (profData.success) setProfit(profData.data)
    if (menuData.success) setMenuSales(menuData.data)
    setLoading(false)
  }, [date])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDateChange = (val: string) => {
    if (val > todayStr()) return
    setDate(val)
  }

  const [exporting, setExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExport = async (format: "pdf" | "excel") => {
    setShowExportMenu(false)
    setExporting(true)
    try {
      const data = await fetchExportData(date)
      if (!data) { alert("Tidak ada data untuk diekspor"); return }
      if (data.summary.transactionCount === 0 && data.expenses.length === 0) {
        alert("Tidak ada data untuk tanggal ini"); return
      }
      if (format === "pdf") exportPDF(data)
      else exportExcel(data)
    } catch { alert("Gagal mengekspor laporan") }
    setExporting(false)
  }

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
        <div className="flex items-center gap-2">
          <Input type="date" value={date} max={todayStr()}
            onChange={(e) => handleDateChange(e.target.value)} className="w-44" />
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting || loading}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Mengekspor..." : "Export"}
            </Button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg py-1 w-48">
                  <button
                    onClick={() => handleExport("pdf")}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 text-left"
                  >
                    <FileText className="h-4 w-4 text-red-600" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 text-left"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Export Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : report && profit && menuSales && (
        <>
          {/* ===== Profit Section ===== */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 p-5">
              <p className="text-xs text-green-700 font-medium">💰 PENDAPATAN</p>
              <p className="text-2xl md:text-3xl font-bold text-green-800 mt-1">{formatRupiah(profit.totalRevenue)}</p>
              <p className="text-xs text-green-600 mt-1">{profit.revenueCount} transaksi</p>
              {profit.revenueCount === 0 && (
                <p className="text-xs text-gray-500 mt-1">Belum ada penjualan</p>
              )}
            </div>

            <div className="rounded-xl border bg-gradient-to-br from-red-50 to-orange-50 border-red-200 p-5">
              <p className="text-xs text-red-700 font-medium">📤 PENGELUARAN</p>
              <p className="text-2xl md:text-3xl font-bold text-red-800 mt-1">{formatRupiah(profit.totalExpenses)}</p>
              <p className="text-xs text-red-600 mt-1">{profit.expenseCount} entri</p>
              {!profit.hasExpenses && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                    ⚠️ Belum dicatat
                  </Badge>
                  <Link href="/dashboard/expenses" className="text-xs text-blue-600 hover:underline ml-2">
                    Catat →
                  </Link>
                </div>
              )}
            </div>

            <div className={cn(
              "rounded-xl border p-5",
              profit.profit >= 0
                ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                : "bg-gradient-to-br from-red-50 to-pink-50 border-red-300"
            )}>
              <p className={cn("text-xs font-medium", profit.profit >= 0 ? "text-blue-700" : "text-red-700")}>
                📊 PROFIT
              </p>
              <p className={cn("text-2xl md:text-3xl font-bold mt-1", profit.profit >= 0 ? "text-blue-800" : "text-red-800")}>
                {formatRupiah(profit.profit)}
              </p>
              {!profit.hasExpenses && (
                <p className="text-xs text-orange-600 mt-1">= pendapatan (pengeluaran belum dicatat)</p>
              )}
            </div>
          </div>

          {/* ===== Sales Summary ===== */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg">Detail Penjualan</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground">Jumlah Transaksi</p>
                <p className="text-xl font-bold mt-1">{report.totalCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Rata-rata: {formatRupiah(report.avgPerTransaction)}</p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground">Tunai vs QRIS</p>
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
                <p className="text-xs text-muted-foreground">Dine-In vs Takeaway</p>
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
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground">Menu Terjual</p>
                <p className="text-xl font-bold mt-1">{menuSales.totalPortions} porsi</p>
                <p className="text-xs text-muted-foreground mt-1">{menuSales.items.length} jenis menu</p>
              </div>
            </div>
          </div>

          {/* ===== Menu Sales Table ===== */}
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
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada penjualan</TableCell></TableRow>
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

          {/* ===== Stock Summary ===== */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg">Sisa Stok Etalase</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="rounded-xl border bg-white p-4">
                <h3 className="font-bold mb-3">Sisa Stok</h3>
                {report.stock.remaining.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada data</p>
                ) : (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {report.stock.remaining.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.currentStock}/{item.initialStock}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== Charts ===== */}
          {menuSales.items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-white p-5">
                <h3 className="font-bold mb-4">Top 5 Menu Terlaris</h3>
                <RechartsBar data={menuSales.items.slice(0, 5)} />
              </div>
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
