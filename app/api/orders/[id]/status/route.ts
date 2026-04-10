import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        tableNumber: true,
        rejectReason: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            priceAtOrder: true,
            menuItem: { select: { name: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: order })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal memuat status" }, { status: 500 })
  }
}
