import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const days: {
      date: string; dateISO: string;
      revenue: number; expenses: number; profit: number;
      txCount: number
    }[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const start = new Date(d); start.setHours(0, 0, 0, 0)
      const end = new Date(d); end.setHours(23, 59, 59, 999)

      const [rev, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: { paidAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.expense.aggregate({
          where: { date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ])

      const revenue = rev._sum.totalAmount || 0
      const expenses = exp._sum.amount || 0

      days.push({
        date: start.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
        dateISO: start.toISOString().split("T")[0],
        revenue,
        expenses,
        profit: revenue - expenses,
        txCount: rev._count,
      })
    }

    return NextResponse.json({ success: true, data: days })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal memuat data mingguan" }, { status: 500 })
  }
}
