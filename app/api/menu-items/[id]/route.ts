import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, categoryId, price, initialStock, minThreshold, isActive } = body

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama menu wajib diisi" },
        { status: 400 }
      )
    }
    if (price !== undefined && price <= 0) {
      return NextResponse.json(
        { success: false, error: "Harga harus lebih dari 0" },
        { status: 400 }
      )
    }
    if (initialStock !== undefined && initialStock < 1) {
      return NextResponse.json(
        { success: false, error: "Stok awal minimal 1" },
        { status: 400 }
      )
    }

    // Unique name per category check
    if (name && categoryId) {
      const duplicate = await prisma.menuItem.findFirst({
        where: { name: name.trim(), categoryId, NOT: { id: params.id } },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "Nama menu sudah ada di kategori ini" },
          { status: 400 }
        )
      }
    }

    const data: any = {}
    if (name !== undefined) data.name = name.trim()
    if (categoryId !== undefined) data.categoryId = categoryId
    if (price !== undefined) data.price = Math.round(price)
    if (initialStock !== undefined) data.initialStock = initialStock
    if (minThreshold !== undefined) data.minThreshold = minThreshold
    if (isActive !== undefined) data.isActive = isActive

    const item = await prisma.menuItem.update({
      where: { id: params.id },
      data,
      include: { category: true },
    })

    return NextResponse.json({ success: true, data: item })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal mengupdate menu" },
      { status: 500 }
    )
  }
}
