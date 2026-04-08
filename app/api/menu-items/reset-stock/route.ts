import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST body: { items: [{ menuItemId: string, stock: number }] }
// Items with stock=0 mean "not available today"
export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "Data stok tidak valid" },
        { status: 400 }
      )
    }

    const allItems = await prisma.menuItem.findMany({
      where: { isActive: true },
      select: { id: true, currentStock: true, initialStock: true },
    })

    const stockMap = new Map<string, number>(
      items.map((i: any) => [i.menuItemId, i.stock ?? 0])
    )

    await prisma.$transaction(async (tx) => {
      for (const item of allItems) {
        const newStock = stockMap.get(item.id) ?? 0

        await tx.menuItem.update({
          where: { id: item.id },
          data: {
            currentStock: newStock,
            // Update initialStock so threshold calculations work for today
            initialStock: newStock > 0 ? newStock : item.initialStock,
          },
        })

        await tx.stockLog.create({
          data: {
            menuItemId: item.id,
            changeType: "DAILY_RESET",
            quantity: newStock,
            note: newStock > 0
              ? `Stok harian: ${newStock} porsi (sebelumnya: ${item.currentStock})`
              : `Tidak tersedia hari ini (sebelumnya: ${item.currentStock})`,
          },
        })
      }

      await tx.restockNotification.updateMany({
        where: { isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      })
    })

    const activeCount = items.filter((i: any) => (i.stock ?? 0) > 0).length

    return NextResponse.json({
      success: true,
      data: { totalItems: allItems.length, activeItems: activeCount },
    })
  } catch (error) {
    console.error("Reset stock error:", error)
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan stok harian" },
      { status: 500 }
    )
  }
}
