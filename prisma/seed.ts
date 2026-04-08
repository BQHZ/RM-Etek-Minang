import { PrismaClient, Role } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // --- Users ---
  const users = await Promise.all([
    prisma.user.create({
      data: { name: "Pak Etek", username: "etek", pin: "1234", role: Role.OWNER },
    }),
    prisma.user.create({
      data: { name: "Siti Aisyah", username: "siti", pin: "1111", role: Role.KASIR },
    }),
    prisma.user.create({
      data: { name: "Budi Santoso", username: "budi", pin: "2222", role: Role.WAITER },
    }),
    prisma.user.create({
      data: { name: "Rani Dapur", username: "rani", pin: "3333", role: Role.DAPUR },
    }),
  ])

  console.log(`Seeded ${users.length} users`)

  // --- Categories ---
  const [lauk, sayur, minuman, tambahan] = await Promise.all([
    prisma.category.create({ data: { name: "Lauk", sortOrder: 1 } }),
    prisma.category.create({ data: { name: "Sayur", sortOrder: 2 } }),
    prisma.category.create({ data: { name: "Minuman", sortOrder: 3 } }),
    prisma.category.create({ data: { name: "Tambahan", sortOrder: 4 } }),
  ])

  console.log("Seeded 4 categories")

  // --- Menu Items ---
  const menuItems = [
    // Lauk
    { name: "Rendang Daging", categoryId: lauk.id, price: 18000, initialStock: 40, currentStock: 40 },
    { name: "Ayam Pop", categoryId: lauk.id, price: 15000, initialStock: 30, currentStock: 30 },
    { name: "Ayam Bakar", categoryId: lauk.id, price: 16000, initialStock: 25, currentStock: 25 },
    { name: "Gulai Tambusu", categoryId: lauk.id, price: 12000, initialStock: 35, currentStock: 35 },
    { name: "Dendeng Batokok", categoryId: lauk.id, price: 15000, initialStock: 30, currentStock: 30 },
    { name: "Gulai Otak", categoryId: lauk.id, price: 12000, initialStock: 20, currentStock: 20 },
    { name: "Ikan Bakar", categoryId: lauk.id, price: 20000, initialStock: 20, currentStock: 20 },
    { name: "Gulai Tunjang", categoryId: lauk.id, price: 15000, initialStock: 25, currentStock: 25 },
    { name: "Telur Dadar", categoryId: lauk.id, price: 5000, initialStock: 40, currentStock: 40 },
    { name: "Perkedel", categoryId: lauk.id, price: 4000, initialStock: 50, currentStock: 50 },
    // Sayur
    { name: "Gulai Nangka", categoryId: sayur.id, price: 5000, initialStock: 30, currentStock: 30 },
    { name: "Daun Singkong", categoryId: sayur.id, price: 5000, initialStock: 30, currentStock: 30 },
    { name: "Sayur Nangka", categoryId: sayur.id, price: 5000, initialStock: 25, currentStock: 25 },
    // Minuman
    { name: "Es Teh Manis", categoryId: minuman.id, price: 5000, initialStock: 100, currentStock: 100 },
    { name: "Es Jeruk", categoryId: minuman.id, price: 7000, initialStock: 80, currentStock: 80 },
    { name: "Teh Hangat", categoryId: minuman.id, price: 4000, initialStock: 100, currentStock: 100 },
    { name: "Air Putih", categoryId: minuman.id, price: 3000, initialStock: 200, currentStock: 200 },
    // Tambahan
    { name: "Nasi Putih", categoryId: tambahan.id, price: 5000, initialStock: 150, currentStock: 150 },
    { name: "Kerupuk", categoryId: tambahan.id, price: 2000, initialStock: 200, currentStock: 200 },
  ]

  await prisma.menuItem.createMany({ data: menuItems })
  console.log(`Seeded ${menuItems.length} menu items`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
