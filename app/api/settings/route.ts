import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Settings are stored as simple key-value in a JSON file approach
// For simplicity, we'll use environment variables + a settings object
// In production, this could be a Settings table

const DEFAULT_SETTINGS = {
  restaurantName: "RM. Etek Minang",
  restaurantAddress: "Jl. Contoh Alamat No. 123",
  restaurantPhone: "(021) 1234-5678",
  openTime: "08:00",
  closeTime: "21:00",
}

// In-memory settings (resets on server restart - fine for demo)
let settings = { ...DEFAULT_SETTINGS }

export async function GET() {
  return NextResponse.json({ success: true, data: settings })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    settings = { ...settings, ...body }
    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: "Gagal menyimpan pengaturan" }, { status: 500 })
  }
}
