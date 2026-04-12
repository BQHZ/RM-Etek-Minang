export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const dateParam = request.nextUrl.searchParams.get("date")

    const where: any = {}
    if (dateParam) {
      const date = new Date(dateParam)
      const start = new Date(date); start.setHours(0, 0, 0, 0)
      const end = new Date(date); end.setHours(23, 59, 59, 999)
      where.paidAt = { gte: start, lte: end }
    }

    const [total, cash, qris] = await Promise.all([
      prisma.transaction.aggregate({
        where,
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, paymentMethod: "CASH" },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, paymentMethod: "QRIS" },
        _count: true,
        _sum: { totalAmount: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalCount: total._count,
        totalRevenue: total._sum.totalAmount || 0,
        cashCount: cash._count,
        cashRevenue: cash._sum.totalAmount || 0,
        qrisCount: qris._count,
        qrisRevenue: qris._sum.totalAmount || 0,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal memuat ringkasan" },
      { status: 500 }
    )
  }
}
