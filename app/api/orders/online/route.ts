import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOrderNumber } from "@/lib/utils"

// Simple rate limiting: track IPs
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5 // max orders per window
const RATE_WINDOW = 10 * 60 * 1000 // 10 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get("x-forwarded-for") || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak pesanan. Silakan coba lagi nanti." },
        { status: 429 }
      )
    }

    const { tableNumber, items, customerNote } = await request.json()

    if (!tableNumber || !items?.length) {
      return NextResponse.json(
        { success: false, error: "Data pesanan tidak lengkap" },
        { status: 400 }
      )
    }

    if (tableNumber < 1 || tableNumber > 100) {
      return NextResponse.json(
        { success: false, error: "Nomor meja tidak valid" },
        { status: 400 }
      )
    }

    if (items.length > 20) {
      return NextResponse.json(
        { success: false, error: "Maksimal 20 item per pesanan" },
        { status: 400 }
      )
    }

    // Validate menu items exist and have stock
    const menuItemIds = items.map((i: any) => i.menuItemId)
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isActive: true },
    })
    const menuMap = new Map(menuItems.map((m) => [m.id, m]))

    for (const item of items) {
      const menu = menuMap.get(item.menuItemId)
      if (!menu) {
        return NextResponse.json(
          { success: false, error: "Menu tidak ditemukan" },
          { status: 400 }
        )
      }
      if (menu.currentStock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Stok "${menu.name}" tidak cukup` },
          { status: 400 }
        )
      }
    }

    // Generate order number
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayCount = await prisma.order.count({
      where: { createdAt: { gte: todayStart } },
    })
    const orderNumber = generateOrderNumber(todayCount + 1)

    // Create order with PENDING_CONFIRMATION status
    // Stock is NOT reduced here — only after waiter confirms
    const order = await prisma.order.create({
      data: {
        orderNumber,
        type: "DINE_IN",
        status: "PENDING_CONFIRMATION",
        source: "ONLINE",
        tableNumber: parseInt(tableNumber),
        customerNote: customerNote?.trim() || null,
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
      },
    })

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    console.error("Online order error:", error)
    return NextResponse.json(
      { success: false, error: "Gagal membuat pesanan" },
      { status: 500 }
    )
  }
}
