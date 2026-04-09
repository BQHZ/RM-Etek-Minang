import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

type ExportData = {
  date: string
  dateFormatted: string
  summary: {
    totalRevenue: number; totalExpenses: number; profit: number;
    transactionCount: number; hasExpenses: boolean;
    cash: { count: number; revenue: number }
    qris: { count: number; revenue: number }
    dineIn: { count: number; revenue: number }
    takeaway: { count: number; revenue: number }
  }
  menuSales: { name: string; category: string; quantity: number; price: number; total: number }[]
  expenses: { description: string; amount: number; recordedBy: string; time: string }[]
  transactions: {
    orderNumber: string; type: string; method: string;
    total: number; cashier: string; time: string; items: string
  }[]
}

function fmtRp(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export async function fetchExportData(date: string): Promise<ExportData | null> {
  const res = await fetch(`/api/reports/export?date=${date}`)
  const data = await res.json()
  if (!data.success) return null
  return data.data
}

export function exportPDF(data: ExportData) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 15

  // Header
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("LAPORAN PENJUALAN HARIAN", pageWidth / 2, y, { align: "center" })
  y += 7
  doc.setFontSize(12)
  doc.text("RM. ETEK MINANG", pageWidth / 2, y, { align: "center" })
  y += 7
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(data.dateFormatted, pageWidth / 2, y, { align: "center" })
  y += 10

  // Line
  doc.setDrawColor(180)
  doc.line(14, y, pageWidth - 14, y)
  y += 6

  // Summary Table
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("RINGKASAN", 14, y)
  y += 4

  const summaryRows = [
    ["Total Pendapatan", fmtRp(data.summary.totalRevenue)],
    ["Total Pengeluaran", data.summary.hasExpenses ? fmtRp(data.summary.totalExpenses) : fmtRp(0) + " (belum dicatat)"],
    ["Profit", fmtRp(data.summary.profit)],
    ["Jumlah Transaksi", data.summary.transactionCount.toString()],
    ["Tunai", `${data.summary.cash.count} transaksi - ${fmtRp(data.summary.cash.revenue)}`],
    ["QRIS", `${data.summary.qris.count} transaksi - ${fmtRp(data.summary.qris.revenue)}`],
    ["Dine-In", `${data.summary.dineIn.count} transaksi - ${fmtRp(data.summary.dineIn.revenue)}`],
    ["Takeaway", `${data.summary.takeaway.count} transaksi - ${fmtRp(data.summary.takeaway.revenue)}`],
  ]

  autoTable(doc, {
    startY: y,
    head: [["Keterangan", "Nilai"]],
    body: summaryRows,
    theme: "grid",
    headStyles: { fillColor: [180, 83, 9], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // Menu Sales Table
  if (data.menuSales.length > 0) {
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("DETAIL PENJUALAN MENU", 14, y)
    y += 4

    const menuRows = data.menuSales.map((m, i) => [
      (i + 1).toString(), m.name, m.category, m.quantity.toString(), fmtRp(m.price), fmtRp(m.total),
    ])
    const grandTotal = data.menuSales.reduce((s, m) => s + m.total, 0)
    const totalPortions = data.menuSales.reduce((s, m) => s + m.quantity, 0)
    menuRows.push(["", "TOTAL", "", totalPortions.toString(), "", fmtRp(grandTotal)])

    autoTable(doc, {
      startY: y,
      head: [["No", "Menu", "Kategori", "Porsi", "Harga", "Total"]],
      body: menuRows,
      theme: "grid",
      headStyles: { fillColor: [180, 83, 9], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        3: { halign: "center" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData) => {
        if (hookData.row.index === menuRows.length - 1 && hookData.section === "body") {
          hookData.cell.styles.fontStyle = "bold"
          hookData.cell.styles.fillColor = [245, 245, 245]
        }
      },
    })

    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Expenses Table
  if (data.expenses.length > 0) {
    if (y > 240) { doc.addPage(); y = 15 }

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("DAFTAR PENGELUARAN", 14, y)
    y += 4

    const expRows = data.expenses.map((e, i) => [
      (i + 1).toString(), e.description, fmtRp(e.amount), e.recordedBy, e.time,
    ])
    expRows.push(["", "TOTAL", fmtRp(data.summary.totalExpenses), "", ""])

    autoTable(doc, {
      startY: y,
      head: [["No", "Deskripsi", "Jumlah", "Dicatat", "Waktu"]],
      body: expRows,
      theme: "grid",
      headStyles: { fillColor: [180, 83, 9], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        2: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData) => {
        if (hookData.row.index === expRows.length - 1 && hookData.section === "body") {
          hookData.cell.styles.fontStyle = "bold"
          hookData.cell.styles.fillColor = [245, 245, 245]
        }
      },
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(150)
    const footerY = doc.internal.pageSize.getHeight() - 10
    doc.text(
      `Generated by POS System RM. Etek Minang — ${new Date().toLocaleString("id-ID")}`,
      pageWidth / 2, footerY, { align: "center" }
    )
    doc.text(`Halaman ${i}/${pageCount}`, pageWidth - 14, footerY, { align: "right" })
  }

  doc.save(`Laporan_Harian_${data.date.replace(/-/g, "")}.pdf`)
}

export function exportExcel(data: ExportData) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summaryData = [
    ["LAPORAN PENJUALAN HARIAN - RM. ETEK MINANG"],
    [data.dateFormatted],
    [],
    ["Keterangan", "Nilai"],
    ["Total Pendapatan", data.summary.totalRevenue],
    ["Total Pengeluaran", data.summary.totalExpenses],
    ["Profit", data.summary.profit],
    ["Jumlah Transaksi", data.summary.transactionCount],
    [],
    ["Metode", "Transaksi", "Pendapatan"],
    ["Tunai", data.summary.cash.count, data.summary.cash.revenue],
    ["QRIS", data.summary.qris.count, data.summary.qris.revenue],
    [],
    ["Tipe", "Transaksi", "Pendapatan"],
    ["Dine-In", data.summary.dineIn.count, data.summary.dineIn.revenue],
    ["Takeaway", data.summary.takeaway.count, data.summary.takeaway.revenue],
  ]
  if (!data.summary.hasExpenses) {
    summaryData.push([], ["Catatan: Pengeluaran belum dicatat untuk tanggal ini"])
  }
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
  ws1["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan")

  // Sheet 2: Menu Sales
  const salesHeader = [["No", "Menu", "Kategori", "Porsi Terjual", "Harga Satuan", "Total"]]
  const salesRows = data.menuSales.map((m, i) => [i + 1, m.name, m.category, m.quantity, m.price, m.total])
  const totalPortions = data.menuSales.reduce((s, m) => s + m.quantity, 0)
  const grandTotal = data.menuSales.reduce((s, m) => s + m.total, 0)
  salesRows.push(["", "TOTAL", "", totalPortions, "", grandTotal])
  const ws2 = XLSX.utils.aoa_to_sheet([...salesHeader, ...salesRows])
  ws2["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws2, "Penjualan Menu")

  // Sheet 3: Expenses
  const expHeader = [["No", "Deskripsi", "Jumlah", "Dicatat Oleh", "Waktu"]]
  const expRows = data.expenses.map((e, i) => [i + 1, e.description, e.amount, e.recordedBy, e.time])
  if (data.expenses.length > 0) {
    expRows.push(["", "TOTAL", data.summary.totalExpenses, "", ""])
  }
  const ws3 = XLSX.utils.aoa_to_sheet(data.expenses.length > 0
    ? [...expHeader, ...expRows]
    : [["Belum ada pengeluaran yang dicatat"]])
  ws3["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws3, "Pengeluaran")

  // Sheet 4: Transactions
  const txHeader = [["No. Pesanan", "Waktu", "Tipe", "Metode", "Total", "Kasir", "Item"]]
  const txRows = data.transactions.map((tx) => [
    tx.orderNumber, tx.time, tx.type, tx.method, tx.total, tx.cashier, tx.items,
  ])
  const ws4 = XLSX.utils.aoa_to_sheet([...txHeader, ...txRows])
  ws4["!cols"] = [{ wch: 22 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, ws4, "Transaksi")

  XLSX.writeFile(wb, `Laporan_Harian_${data.date.replace(/-/g, "")}.xlsx`)
}
