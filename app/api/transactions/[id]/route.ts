import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
            createdBy: { select: { name: true } },
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: transaction })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal memuat transaksi" },
      { status: 500 }
    )
  }
}
