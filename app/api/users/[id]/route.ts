import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, username, pin, role, isActive } = body

    const data: any = {}
    if (name !== undefined) data.name = name.trim()
    if (username !== undefined) {
      const dup = await prisma.user.findFirst({
        where: { username: username.trim(), NOT: { id: params.id } },
      })
      if (dup) return NextResponse.json({ success: false, error: "Username sudah digunakan" }, { status: 400 })
      data.username = username.trim()
    }
    if (pin !== undefined) {
      if (!/^\d{4}$/.test(pin)) return NextResponse.json({ success: false, error: "PIN harus 4 digit angka" }, { status: 400 })
      data.pin = pin
    }
    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = isActive

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true },
    })

    return NextResponse.json({ success: true, data: user })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal mengupdate pengguna" }, { status: 500 })
  }
}
