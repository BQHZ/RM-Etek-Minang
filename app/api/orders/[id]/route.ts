import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { items } = await request.json()

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
        { success: false, error: "Pesanan sudah tidak bisa diubah" },
        { status: 400 }
      )
    }

    // Fetch all relevant menu items
    const allMenuIds = [
      ...order.items.map((i) => i.menuItemId),
      ...items.map((i: any) => i.menuItemId),
    ]
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: [...new Set(allMenuIds)] } },
    })
    const menuMap = new Map(menuItems.map((m) => [m.id, m]))

    await prisma.$transaction(async (tx) => {
      // Restore old stock
      for (const oldItem of order.items) {
        await tx.menuItem.update({
          where: { id: oldItem.menuItemId },
          data: { currentStock: { increment: oldItem.quantity } },
        })
      }

      // Delete old items
      await tx.orderItem.deleteMany({ where: { orderId: params.id } })

      // Create new items and reduce stock
      for (const item of items) {
        const menu = menuMap.get(item.menuItemId)!
        // Re-fetch current stock after restoration
        const fresh = await tx.menuItem.findUnique({ where: { id: item.menuItemId } })
        if (!fresh || fresh.currentStock < item.quantity) {
          throw new Error(`Stok "${menu.name}" tidak cukup`)
        }

        await tx.orderItem.create({
          data: {
            orderId: params.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            priceAtOrder: menu.price,
          },
        })

        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { currentStock: { decrement: item.quantity } },
        })

        // Check threshold
        const newStock = fresh.currentStock - item.quantity
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

      await tx.order.update({
        where: { id: params.id },
        data: { updatedAt: new Date() },
      })
    })

    const updated = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { menuItem: true } },
        createdBy: { select: { id: true, name: true } },
        transaction: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengupdate pesanan" },
      { status: 500 }
    )
  }
}
