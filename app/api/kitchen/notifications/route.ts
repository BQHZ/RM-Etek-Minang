import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const notifications = await prisma.restockNotification.findMany({
      where: { isResolved: false },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            currentStock: true,
            initialStock: true,
            minThreshold: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ success: true, data: notifications })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal memuat notifikasi" },
      { status: 500 }
    )
  }
}
