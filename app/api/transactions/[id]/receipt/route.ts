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

    const paidAt = new Date(transaction.paidAt)

    const receiptData = {
      orderNumber: transaction.order.orderNumber,
      date: paidAt.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      time: paidAt.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: transaction.order.type,
      tableNumber: transaction.order.tableNumber,
      cashierName: transaction.order.createdBy?.name || "Pelanggan",
      items: transaction.order.items.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.priceAtOrder,
        subtotal: item.priceAtOrder * item.quantity,
      })),
      total: transaction.totalAmount,
      paymentMethod: transaction.paymentMethod,
      cashReceived: transaction.cashReceived,
      changeAmount: transaction.changeAmount,
    }

    return NextResponse.json({ success: true, data: receiptData })
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal memuat data struk" },
      { status: 500 }
    )
  }
}
