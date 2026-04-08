import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSession, getRoleRedirect } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { userId, pin } = await request.json()

    if (!userId || !pin) {
      return NextResponse.json(
        { success: false, error: "Pilih pengguna dan masukkan PIN" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404 }
      )
    }

    if (user.pin !== pin) {
      return NextResponse.json(
        { success: false, error: "PIN salah" },
        { status: 401 }
      )
    }

    await createSession({
      userId: user.id,
      name: user.name,
      role: user.role,
    })

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        role: user.role,
        redirect: getRoleRedirect(user.role),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
