import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, sortOrder } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama kategori wajib diisi" },
        { status: 400 }
      )
    }

    const duplicate = await prisma.category.findFirst({
      where: { name: name.trim(), NOT: { id: params.id } },
    })
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: "Nama kategori sudah ada" },
        { status: 400 }
      )
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: { name: name.trim(), sortOrder: sortOrder ?? 0 },
      include: { _count: { select: { menuItems: true } } },
    })

    return NextResponse.json({ success: true, data: category })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal mengupdate kategori" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const menuCount = await prisma.menuItem.count({
      where: { categoryId: params.id },
    })

    if (menuCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak bisa menghapus: masih ada ${menuCount} menu terkait`,
        },
        { status: 400 }
      )
    }

    await prisma.category.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal menghapus kategori" },
      { status: 500 }
    )
  }
}
