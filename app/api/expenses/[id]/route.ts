import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: params.id } })
    if (!expense) {
      return NextResponse.json({ success: false, error: "Pengeluaran tidak ditemukan" }, { status: 404 })
    }
    if (!isSameDay(new Date(expense.date), new Date())) {
      return NextResponse.json({ success: false, error: "Hanya bisa mengedit pengeluaran hari ini" }, { status: 400 })
    }

    const { description, amount } = await request.json()
    if (!description?.trim()) {
      return NextResponse.json({ success: false, error: "Deskripsi wajib diisi" }, { status: 400 })
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Jumlah harus lebih dari 0" }, { status: 400 })
    }

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: { description: description.trim(), amount: Math.round(amount) },
      include: { recordedBy: { select: { name: true } } },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal mengupdate" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: params.id } })
    if (!expense) {
      return NextResponse.json({ success: false, error: "Tidak ditemukan" }, { status: 404 })
    }
    if (!isSameDay(new Date(expense.date), new Date())) {
      return NextResponse.json({ success: false, error: "Hanya bisa menghapus pengeluaran hari ini" }, { status: 400 })
    }
    await prisma.expense.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal menghapus" }, { status: 500 })
  }
}
