import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { menuItemId: string } }
) {
  try {
    const { quantity, note } = await request.json()

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, error: "Jumlah stok minimal 1" },
        { status: 400 }
      )
    }

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: params.menuItemId },
    })

    if (!menuItem) {
      return NextResponse.json(
        { success: false, error: "Menu tidak ditemukan" },
        { status: 404 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Increase stock
      const item = await tx.menuItem.update({
        where: { id: params.menuItemId },
        data: { currentStock: { increment: quantity } },
        include: { category: true },
      })

      // Log the restock
      await tx.stockLog.create({
        data: {
          menuItemId: params.menuItemId,
          changeType: "RESTOCK",
          quantity,
          note: note || "Tambah stok dari dapur",
        },
      })

      // Auto-resolve any pending restock notification for this item
      await tx.restockNotification.updateMany({
        where: {
          menuItemId: params.menuItemId,
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      })

      return item
    })

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal menambah stok" },
      { status: 500 }
    )
  }
}
