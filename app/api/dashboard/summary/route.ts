export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const today = new Date()
    const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)

    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const yesterdayEnd = new Date(yesterdayStart); yesterdayEnd.setHours(23, 59, 59, 999)

    // Today's data
    const [todayRevAgg, todayExpAgg, yesterdayRevAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { paidAt: { gte: todayStart, lte: todayEnd } },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.expense.aggregate({
        where: { date: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true }, _count: true,
      }),
      prisma.transaction.aggregate({
        where: { paidAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        _sum: { totalAmount: true },
      }),
    ])

    const todayRevenue = todayRevAgg._sum.totalAmount || 0
    const todayExpenses = todayExpAgg._sum.amount || 0
    const todayCount = todayRevAgg._count
    const yesterdayRevenue = yesterdayRevAgg._sum.totalAmount || 0

    // Weekly trend (last 7 days)
    const weekly = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const s = new Date(d); s.setHours(0, 0, 0, 0)
      const e = new Date(d); e.setHours(23, 59, 59, 999)

      const [rev, exp] = await Promise.all([
        prisma.transaction.aggregate({ where: { paidAt: { gte: s, lte: e } }, _sum: { totalAmount: true } }),
        prisma.expense.aggregate({ where: { date: { gte: s, lte: e } }, _sum: { amount: true } }),
      ])

      weekly.push({
        date: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
        revenue: rev._sum.totalAmount || 0,
        profit: (rev._sum.totalAmount || 0) - (exp._sum.amount || 0),
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        today: {
          revenue: todayRevenue,
          expenses: todayExpenses,
          profit: todayRevenue - todayExpenses,
          count: todayCount,
          hasExpenses: todayExpAgg._count > 0,
          avgPerTransaction: todayCount > 0 ? Math.round(todayRevenue / todayCount) : 0,
        },
        yesterdayRevenue,
        revChange: yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : null,
        weekly,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal memuat data" }, { status: 500 })
  }
}
