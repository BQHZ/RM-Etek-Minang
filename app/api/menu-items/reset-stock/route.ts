import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    // Get all active menu items
    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      select: { id: true, initialStock: true },
    })

    // Reset each item and log it
    await prisma.$transaction(
      items.map((item) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: { currentStock: item.initialStock },
        })
      )
    )

    // Create stock logs for the reset
    await prisma.stockLog.createMany({
      data: items.map((item) => ({
        menuItemId: item.id,
        changeType: "DAILY_RESET" as const,
        quantity: item.initialStock,
        note: "Reset stok harian",
      })),
    })

    // Resolve any pending restock notifications
    await prisma.restockNotification.updateMany({
      where: { isResolved: false },
      data: { isResolved: true, resolvedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: { resetCount: items.length },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal mereset stok" },
      { status: 500 }
    )
  }
}
