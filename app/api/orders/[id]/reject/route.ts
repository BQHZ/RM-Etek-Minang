import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reason } = await request.json()

    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) {
      return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan" }, { status: 404 })
    }
    if (order.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json({ success: false, error: "Pesanan sudah diproses" }, { status: 400 })
    }

    await prisma.order.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
        rejectReason: reason?.trim() || "Ditolak oleh pelayan",
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal menolak pesanan" }, { status: 500 })
  }
}
