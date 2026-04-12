export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOrderNumber } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status")
    const dateParam = request.nextUrl.searchParams.get("date")

    const where: any = {}
    if (status) where.status = status

    if (dateParam === "today") {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      where.createdAt = { gte: start, lte: end }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { menuItem: true } },
        createdBy: { select: { id: true, name: true } },
        transactions: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: orders })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal memuat pesanan" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, tableNumber, createdById, items } = await request.json()

    if (!type || !createdById || !items?.length) {
      return NextResponse.json(
        { success: false, error: "Data pesanan tidak lengkap" },
        { status: 400 }
      )
    }

    // Generate unique order number
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayCount = await prisma.order.count({
      where: { createdAt: { gte: todayStart } },
    })
    const orderNumber = generateOrderNumber(todayCount + 1)

    // Fetch menu items for prices and stock validation
    const menuItemIds = items.map((i: any) => i.menuItemId)
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    })
    const menuMap = new Map(menuItems.map((m) => [m.id, m]))

    // Validate stock
    for (const item of items) {
      const menu = menuMap.get(item.menuItemId)
      if (!menu) {
        return NextResponse.json(
          { success: false, error: `Menu tidak ditemukan` },
          { status: 400 }
        )
      }
      if (menu.currentStock < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Stok "${menu.name}" tidak cukup (sisa ${menu.currentStock})`,
          },
          { status: 400 }
        )
      }
    }

    // Create order + items + reduce stock in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          type,
          tableNumber: tableNumber || null,
          createdById,
          items: {
            create: items.map((item: any) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              priceAtOrder: menuMap.get(item.menuItemId)!.price,
            })),
          },
        },
        include: {
          items: { include: { menuItem: true } },
          createdBy: { select: { id: true, name: true } },
        },
      })

      // Reduce stock and create stock logs
      for (const item of items) {
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
            note: `Pesanan ${orderNumber}`,
          },
        })

        // Check threshold for restock notification
        const threshold = menu.initialStock * menu.minThreshold
        if (newStock <= threshold) {
          // Check operating hours (06:00 - 22:00)
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

      return newOrder
    })

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json(
      { success: false, error: "Gagal membuat pesanan" },
      { status: 500 }
    )
  }
}
