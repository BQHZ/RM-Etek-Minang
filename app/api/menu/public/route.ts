import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        menuItems: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            price: true,
            currentStock: true,
            imageUrl: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal memuat menu" },
      { status: 500 }
    )
  }
}
