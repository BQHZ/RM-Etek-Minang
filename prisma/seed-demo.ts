import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateOrderNumber(date: Date, seq: number): string {
  const y = date.getFullYear().toString()
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const d = date.getDate().toString().padStart(2, "0")
  return `ORD-${y}${m}${d}-${seq.toString().padStart(3, "0")}`
}

async function main() {
  console.log("🌱 Generating demo data for the past 7 days...")

  const users = await prisma.user.findMany({ where: { role: { in: ["KASIR", "WAITER"] }, isActive: true } })
  const menuItems = await prisma.menuItem.findMany({ where: { isActive: true } })

  if (users.length === 0 || menuItems.length === 0) {
    console.log("❌ No users or menu items found. Run `npx prisma db seed` first.")
    return
  }

  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const date = new Date()
    date.setDate(date.getDate() - dayOffset)
    date.setHours(0, 0, 0, 0)

    const dateStr = date.toISOString().split("T")[0]
    console.log(`\n📅 Generating data for ${dateStr}...`)

    // Generate 8-15 orders per day
    const orderCount = randomInt(8, 15)

    for (let i = 1; i <= orderCount; i++) {
      const user = users[randomInt(0, users.length - 1)]
      const orderType = Math.random() > 0.3 ? "DINE_IN" : "TAKEAWAY"
      const tableNumber = orderType === "DINE_IN" ? randomInt(1, 10) : null
      const orderNumber = generateOrderNumber(date, i)

      // Random time between 09:00 and 20:00
      const hour = randomInt(9, 20)
      const minute = randomInt(0, 59)
      const orderTime = new Date(date)
      orderTime.setHours(hour, minute, randomInt(0, 59))

      // Pick 2-5 random menu items
      const itemCount = randomInt(2, 5)
      const selectedItems = new Set<number>()
      while (selectedItems.size < Math.min(itemCount, menuItems.length)) {
        selectedItems.add(randomInt(0, menuItems.length - 1))
      }

      const orderItems = Array.from(selectedItems).map((idx) => {
        const menu = menuItems[idx]
        return {
          menuItemId: menu.id,
          quantity: randomInt(1, 3),
          priceAtOrder: menu.price,
        }
      })

      const totalAmount = orderItems.reduce((s, i) => s + i.priceAtOrder * i.quantity, 0)
      const paymentMethod = Math.random() > 0.4 ? "CASH" : "QRIS"
      const cashReceived = paymentMethod === "CASH"
        ? Math.ceil(totalAmount / 10000) * 10000
        : null
      const changeAmount = paymentMethod === "CASH" && cashReceived
        ? cashReceived - totalAmount
        : null

      // Create order
      await prisma.order.create({
        data: {
          orderNumber,
          type: orderType,
          status: "PAID",
          tableNumber,
          createdById: user.id,
          createdAt: orderTime,
          updatedAt: orderTime,
          items: {
            create: orderItems,
          },
          transaction: {
            create: {
              totalAmount,
              paymentMethod,
              cashReceived,
              changeAmount,
              paidAt: new Date(orderTime.getTime() + randomInt(5, 30) * 60000),
            },
          },
        },
      })
    }

    console.log(`  ✅ ${orderCount} orders created`)

    // Generate 2-4 expenses per day
    const expenseCount = randomInt(2, 4)
    const expenseTemplates = [
      { desc: "Belanja bahan baku di pasar", min: 200000, max: 800000 },
      { desc: "Pembelian gas LPG", min: 20000, max: 50000 },
      { desc: "Pembelian perlengkapan", min: 30000, max: 150000 },
      { desc: "Biaya listrik", min: 50000, max: 200000 },
      { desc: "Belanja bumbu dapur", min: 50000, max: 200000 },
      { desc: "Pembelian es batu", min: 15000, max: 40000 },
    ]

    for (let j = 0; j < expenseCount; j++) {
      const template = expenseTemplates[randomInt(0, expenseTemplates.length - 1)]
      const expTime = new Date(date)
      expTime.setHours(randomInt(6, 10), randomInt(0, 59))

      await prisma.expense.create({
        data: {
          date: expTime,
          description: template.desc,
          amount: Math.round(randomInt(template.min, template.max) / 1000) * 1000,
          recordedById: users[0].id,
          createdAt: expTime,
        },
      })
    }

    console.log(`  ✅ ${expenseCount} expenses created`)
  }

  console.log("\n🎉 Demo data generation complete!")
  console.log("Login as Pak Etek (PIN: 1234) to view the dashboard with populated data.")
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
