export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function fmtDate(d: Date) {
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const startDate = sp.get("startDate")
    const endDate = sp.get("endDate")

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: "startDate and endDate required" }, { status: 400 })
    }

    const start = new Date(startDate); start.setHours(0, 0, 0, 0)
    const end = new Date(endDate); end.setHours(23, 59, 59, 999)

    // Transactions
    const transactions = await prisma.transaction.findMany({
      where: { paidAt: { gte: start, lte: end } },
      include: {
        order: {
          include: {
            items: { include: { menuItem: { select: { name: true, category: { select: { name: true } } } } } },
            createdBy: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: "asc" },
    })

    // Expenses
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      include: { recordedBy: { select: { name: true } } },
      orderBy: { date: "asc" },
    })

    // Previous period
    const diff = end.getTime() - start.getTime()
    const prevEnd = new Date(start.getTime() - 1); prevEnd.setHours(23, 59, 59, 999)
    const prevStart = new Date(prevEnd.getTime() - diff); prevStart.setHours(0, 0, 0, 0)

    const [prevRevAgg, prevExpAgg, prevCountAgg] = await Promise.all([
      prisma.transaction.aggregate({ where: { paidAt: { gte: prevStart, lte: prevEnd } }, _sum: { totalAmount: true } }),
      prisma.expense.aggregate({ where: { date: { gte: prevStart, lte: prevEnd } }, _sum: { amount: true } }),
      prisma.transaction.count({ where: { paidAt: { gte: prevStart, lte: prevEnd } } }),
    ])

    // Daily breakdown
    const dailyMap = new Map<string, { revenue: number; expenses: number; count: number }>()

    // Fill all days in range
    const d = new Date(start)
    while (d <= end) {
      dailyMap.set(d.toISOString().split("T")[0], { revenue: 0, expenses: 0, count: 0 })
      d.setDate(d.getDate() + 1)
    }

    let totalRevenue = 0, totalCount = 0
    let cashRev = 0, cashCount = 0, qrisRev = 0, qrisCount = 0
    let dineInRev = 0, dineInCount = 0, takeawayRev = 0, takeawayCount = 0

    for (const tx of transactions) {
      const dateKey = tx.paidAt.toISOString().split("T")[0]
      const entry = dailyMap.get(dateKey)
      if (entry) { entry.revenue += tx.totalAmount; entry.count++ }
      totalRevenue += tx.totalAmount; totalCount++

      if (tx.paymentMethod === "CASH") { cashRev += tx.totalAmount; cashCount++ }
      else { qrisRev += tx.totalAmount; qrisCount++ }

      if (tx.order.type === "DINE_IN") { dineInRev += tx.totalAmount; dineInCount++ }
      else { takeawayRev += tx.totalAmount; takeawayCount++ }
    }

    let totalExpenses = 0
    for (const exp of expenses) {
      const dateKey = exp.date.toISOString().split("T")[0]
      const entry = dailyMap.get(dateKey)
      if (entry) entry.expenses += exp.amount
      totalExpenses += exp.amount
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, d]) => ({
        date,
        dateFormatted: fmtDate(new Date(date)),
        revenue: d.revenue,
        expenses: d.expenses,
        profit: d.revenue - d.expenses,
        count: d.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const daysWithRevenue = daily.filter((d) => d.revenue > 0)
    const bestDay = daysWithRevenue.length > 0
      ? daysWithRevenue.reduce((a, b) => a.revenue > b.revenue ? a : b) : null
    const worstDay = daysWithRevenue.length > 0
      ? daysWithRevenue.reduce((a, b) => a.revenue < b.revenue ? a : b) : null

    const totalDays = daily.length
    const profit = totalRevenue - totalExpenses

    const prevRevenue = prevRevAgg._sum.totalAmount || 0
    const prevExpenses = prevExpAgg._sum.amount || 0
    const prevCount = prevCountAgg

    // Menu sales
    const menuMap = new Map<string, { name: string; category: string; qty: number; revenue: number }>()
    for (const tx of transactions) {
      for (const item of tx.order.items) {
        const key = item.menuItemId
        const rev = item.priceAtOrder * item.quantity
        const m = menuMap.get(key)
        if (m) { m.qty += item.quantity; m.revenue += rev }
        else { menuMap.set(key, { name: item.menuItem.name, category: item.menuItem.category.name, qty: item.quantity, revenue: rev }) }
      }
    }
    const menuSales = Array.from(menuMap.values()).sort((a, b) => b.qty - a.qty)

    // Transaction list for export
    const transactionList = transactions.map((tx) => ({
      orderNumber: tx.order.orderNumber,
      date: tx.paidAt.toISOString().split("T")[0],
      time: tx.paidAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      type: tx.order.type === "DINE_IN" ? "Dine-In" : "Takeaway",
      method: tx.paymentMethod === "CASH" ? "Tunai" : "QRIS",
      total: tx.totalAmount,
      cashier: tx.order.createdBy?.name || "Pelanggan",
      items: tx.order.items.map((i) => `${i.menuItem.name} x${i.quantity}`).join(", "),
    }))

    // Expense list
    const expenseList = expenses.map((e) => ({
      date: e.date.toISOString().split("T")[0],
      description: e.description,
      amount: e.amount,
      recordedBy: e.recordedBy?.name || "-",
      time: e.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    }))

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue, totalExpenses, profit, totalCount,
          avgDailyRevenue: totalDays > 0 ? Math.round(totalRevenue / totalDays) : 0,
          bestDay, worstDay,
          cash: { count: cashCount, revenue: cashRev },
          qris: { count: qrisCount, revenue: qrisRev },
          dineIn: { count: dineInCount, revenue: dineInRev },
          takeaway: { count: takeawayCount, revenue: takeawayRev },
          hasExpenses: totalExpenses > 0,
        },
        previous: {
          revenue: prevRevenue, expenses: prevExpenses,
          profit: prevRevenue - prevExpenses, count: prevCount,
        },
        daily,
        menuSales,
        transactionList,
        expenseList,
      },
    })
  } catch (error) {
    console.error("Range report error:", error)
    return NextResponse.json({ success: false, error: "Gagal memuat laporan" }, { status: 500 })
  }
}
