import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      select: { id: true, initialStock: true, currentStock: true },
    })

    await prisma.$transaction(async (tx) => {
      // Reset all stocks
      for (const item of items) {
        await tx.menuItem.update({
          where: { id: item.id },
          data: { currentStock: item.initialStock },
        })
      }

      // Log all resets
      await tx.stockLog.createMany({
        data: items.map((item) => ({
          menuItemId: item.id,
          changeType: "DAILY_RESET" as const,
          quantity: item.initialStock,
          note: `Reset harian (stok sebelumnya: ${item.currentStock})`,
        })),
      })

      // Resolve all pending notifications
      await tx.restockNotification.updateMany({
        where: { isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      })
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
