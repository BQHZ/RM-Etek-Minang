import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { menuItems: true } } },
    })
    return NextResponse.json({ success: true, data: categories })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal memuat kategori" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, sortOrder } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama kategori wajib diisi" },
        { status: 400 }
      )
    }

    const exists = await prisma.category.findUnique({ where: { name: name.trim() } })
    if (exists) {
      return NextResponse.json(
        { success: false, error: "Nama kategori sudah ada" },
        { status: 400 }
      )
    }

    // Auto-increment sortOrder if not provided
    let finalSortOrder = sortOrder
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const last = await prisma.category.findFirst({ orderBy: { sortOrder: "desc" } })
      finalSortOrder = (last?.sortOrder ?? 0) + 1
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), sortOrder: finalSortOrder },
      include: { _count: { select: { menuItems: true } } },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal membuat kategori" },
      { status: 500 }
    )
  }
}
