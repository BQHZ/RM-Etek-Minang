"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "@/components/session-provider"
import { formatRupiah } from "@/lib/utils"
import {
  TrendingUp, TrendingDown, Receipt, Banknote, BarChart3,
} from "lucide-react"
import dynamic from "next/dynamic"

// Lazy load recharts to avoid SSR issues
const RechartsLine = dynamic(
  () => import("recharts").then((mod) => {
    const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } = mod
    return function WeeklyChart({ data }: { data: any[] }) {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000)}rb` : v.toString()}
            />
            <Tooltip
              formatter={(value: number) => [formatRupiah(value), "Pendapatan"]}
              labelStyle={{ fontWeight: "bold" }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#b45309" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      )
    }
  }),
  { ssr: false, loading: () => <div className="h-[260px] bg-gray-50 rounded-lg animate-pulse" /> }
)

type DailyReport = {
  totalRevenue: number; totalCount: number; avgPerTransaction: number;
  cash: { count: number; revenue: number }; qris: { count: number; revenue: number }
}
type WeeklyDay = { date: string; revenue: number; count: number }

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function DashboardPage() {
  const session = useSession()
  const [today, setToday] = useState<DailyReport | null>(null)
  const [yesterday, setYesterday] = useState<DailyReport | null>(null)
  const [weekly, setWeekly] = useState<WeeklyDay[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [todayRes, yestRes, weekRes] = await Promise.all([
      fetch(`/api/reports/daily?date=${todayStr()}`),
      fetch(`/api/reports/daily?date=${yesterdayStr()}`),
      fetch("/api/reports/weekly"),
    ])
    const [todayData, yestData, weekData] = await Promise.all([
      todayRes.json(), yestRes.json(), weekRes.json(),
    ])
    if (todayData.success) setToday(todayData.data)
    if (yestData.success) setYesterday(yestData.data)
    if (weekData.success) setWeekly(weekData.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const revDiff = today && yesterday && yesterday.totalRevenue > 0
    ? Math.round(((today.totalRevenue - yesterday.totalRevenue) / yesterday.totalRevenue) * 100)
    : null
  const countDiff = today && yesterday && yesterday.totalCount > 0
    ? Math.round(((today.totalCount - yesterday.totalCount) / yesterday.totalCount) * 100)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang, {session.name}. Ringkasan hari ini,{" "}
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : today && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="col-span-2 md:col-span-1 rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-5">
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Banknote className="h-4 w-4" />
                <span className="text-xs font-medium">Pendapatan Hari Ini</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-amber-900">{formatRupiah(today.totalRevenue)}</p>
              {revDiff !== null && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${revDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {revDiff >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {revDiff >= 0 ? "+" : ""}{revDiff}% dari kemarin
                </div>
              )}
            </div>

            {/* Transaction Count */}
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Receipt className="h-4 w-4" />
                <span className="text-xs font-medium">Transaksi</span>
              </div>
              <p className="text-2xl font-bold">{today.totalCount}</p>
              {countDiff !== null && (
                <p className={`text-xs mt-2 font-medium ${countDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {countDiff >= 0 ? "+" : ""}{countDiff}% dari kemarin
                </p>
              )}
            </div>

            {/* Average */}
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-medium">Rata-rata / Transaksi</span>
              </div>
              <p className="text-2xl font-bold">{formatRupiah(today.avgPerTransaction)}</p>
            </div>

            {/* Method Breakdown */}
            <div className="rounded-xl border bg-white p-5">
              <p className="text-xs text-muted-foreground mb-2">Metode Pembayaran</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>Tunai</span>
                  <span className="font-bold">{formatRupiah(today.cash.revenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>QRIS</span>
                  <span className="font-bold">{formatRupiah(today.qris.revenue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-bold mb-4">Pendapatan 7 Hari Terakhir</h2>
            <RechartsLine data={weekly} />
          </div>
        </>
      )}
    </div>
  )
}
