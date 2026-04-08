import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const days: { date: string; revenue: number; count: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const start = new Date(date); start.setHours(0, 0, 0, 0)
      const end = new Date(date); end.setHours(23, 59, 59, 999)

      const result = await prisma.transaction.aggregate({
        where: { paidAt: { gte: start, lte: end } },
        _count: true,
        _sum: { totalAmount: true },
      })

      days.push({
        date: start.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
        revenue: result._sum.totalAmount || 0,
        count: result._count,
      })
    }

    return NextResponse.json({ success: true, data: days })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal memuat laporan mingguan" }, { status: 500 })
  }
}
