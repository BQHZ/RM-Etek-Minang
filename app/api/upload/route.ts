import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { menuItemId, imageData } = await request.json()

    if (!menuItemId || !imageData) {
      return NextResponse.json(
        { success: false, error: "Data tidak lengkap" },
        { status: 400 }
      )
    }

    // Validate it's a data URI
    if (!imageData.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, error: "Format gambar tidak valid" },
        { status: 400 }
      )
    }

    // Check size (max ~500KB base64)
    if (imageData.length > 700000) {
      return NextResponse.json(
        { success: false, error: "Ukuran gambar terlalu besar (max 500KB)" },
        { status: 400 }
      )
    }

    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { imageUrl: imageData },
    })

    return NextResponse.json({ success: true, data: { id: updated.id, imageUrl: updated.imageUrl } })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal mengupload gambar" },
      { status: 500 }
    )
  }
}
