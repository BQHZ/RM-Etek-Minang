import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan" },
        { status: 404 }
      )
    }

    if (order.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "Hanya pesanan OPEN yang bisa dibatalkan" },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock for each item
      for (const item of order.items) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { currentStock: { increment: item.quantity } },
        })

        await tx.stockLog.create({
          data: {
            menuItemId: item.menuItemId,
            changeType: "RESTOCK",
            quantity: item.quantity,
            note: `Batal pesanan ${order.orderNumber}`,
          },
        })
      }

      await tx.order.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
      })
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal membatalkan pesanan" },
      { status: 500 }
    )
  }
}
