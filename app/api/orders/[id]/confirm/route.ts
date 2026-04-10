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
      return NextResponse.json({ success: false, error: "Pesanan tidak ditemukan" }, { status: 404 })
    }

    if (order.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json({ success: false, error: "Pesanan sudah dikonfirmasi atau dibatalkan" }, { status: 400 })
    }

    // Validate stock and reduce
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: order.items.map((i) => i.menuItemId) } },
    })
    const menuMap = new Map(menuItems.map((m) => [m.id, m]))

    for (const item of order.items) {
      const menu = menuMap.get(item.menuItemId)
      if (!menu || menu.currentStock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Stok "${menu?.name || "menu"}" tidak cukup (sisa ${menu?.currentStock || 0})` },
          { status: 400 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      // Update order status to OPEN
      await tx.order.update({
        where: { id: params.id },
        data: { status: "OPEN" },
      })

      // Reduce stock and create logs
      for (const item of order.items) {
        const menu = menuMap.get(item.menuItemId)!
        const newStock = menu.currentStock - item.quantity

        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { currentStock: newStock },
        })

        await tx.stockLog.create({
          data: {
            menuItemId: item.menuItemId,
            changeType: "SOLD",
            quantity: -item.quantity,
            note: `Pesanan online ${order.orderNumber}`,
          },
        })

        // Check threshold for restock notification
        const threshold = menu.initialStock * menu.minThreshold
        if (newStock <= threshold) {
          const hour = new Date().getHours()
          if (hour >= 8 && hour < 21) {
            const existing = await tx.restockNotification.findFirst({
              where: { menuItemId: item.menuItemId, isResolved: false },
            })
            if (!existing) {
              await tx.restockNotification.create({
                data: { menuItemId: item.menuItemId },
              })
            }
          }
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengkonfirmasi pesanan" },
      { status: 500 }
    )
  }
}
