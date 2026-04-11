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
  const grandTotal = data.menuSales.reduce((s, m) => s + m.total, 0)
  const totalPortions = data.menuSales.reduce((s, m) => s + m.quantity, 0)

  const html = `<!DOCTYPE html>
<html><head><title>Laporan Harian - ${data.dateFormatted}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 15mm; color: #333; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 2px; }
  h2 { font-size: 13px; text-align: center; margin-bottom: 4px; color: #666; }
  .date { text-align: center; margin-bottom: 15px; color: #888; font-size: 11px; }
  .section { margin-top: 18px; margin-bottom: 8px; font-size: 13px; font-weight: bold; border-bottom: 2px solid #b45309; padding-bottom: 3px; color: #92400e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #92400e; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  tr:nth-child(even) { background: #fef9ee; }
  .right { text-align: right; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .total-row { background: #f5f5f5 !important; font-weight: bold; }
  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
  .note { color: #d97706; font-style: italic; }
  @media print { body { padding: 10mm; } @page { size: A4; margin: 10mm; } }
</style>
</head><body>
<h1>LAPORAN PENJUALAN HARIAN</h1>
<h2>RM. ETEK MINANG</h2>
<div class="date">${data.dateFormatted}</div>

<div class="section">RINGKASAN</div>
<table>
  <tr><td>Total Pendapatan</td><td class="right bold">${fmtRp(data.summary.totalRevenue)}</td></tr>
  <tr><td>Total Pengeluaran</td><td class="right bold">${data.summary.hasExpenses ? fmtRp(data.summary.totalExpenses) : fmtRp(0) + ' <span class="note">(belum dicatat)</span>'}</td></tr>
  <tr><td>Profit</td><td class="right bold">${fmtRp(data.summary.profit)}</td></tr>
  <tr><td>Jumlah Transaksi</td><td class="right bold">${data.summary.transactionCount}</td></tr>
  <tr><td>Tunai</td><td class="right">${data.summary.cash.count} transaksi — ${fmtRp(data.summary.cash.revenue)}</td></tr>
  <tr><td>QRIS</td><td class="right">${data.summary.qris.count} transaksi — ${fmtRp(data.summary.qris.revenue)}</td></tr>
  <tr><td>Dine-In</td><td class="right">${data.summary.dineIn.count} transaksi — ${fmtRp(data.summary.dineIn.revenue)}</td></tr>
  <tr><td>Takeaway</td><td class="right">${data.summary.takeaway.count} transaksi — ${fmtRp(data.summary.takeaway.revenue)}</td></tr>
</table>

${data.menuSales.length > 0 ? `
<div class="section">DETAIL PENJUALAN MENU</div>
<table>
  <tr><th class="center">No</th><th>Menu</th><th>Kategori</th><th class="center">Porsi</th><th class="right">Harga</th><th class="right">Total</th></tr>
  ${data.menuSales.map((m, i) => `<tr><td class="center">${i + 1}</td><td>${m.name}</td><td>${m.category}</td><td class="center">${m.quantity}</td><td class="right">${fmtRp(m.price)}</td><td class="right">${fmtRp(m.total)}</td></tr>`).join("")}
  <tr class="total-row"><td></td><td>TOTAL</td><td></td><td class="center">${totalPortions}</td><td></td><td class="right">${fmtRp(grandTotal)}</td></tr>
</table>` : ""}

${data.expenses.length > 0 ? `
<div class="section">DAFTAR PENGELUARAN</div>
<table>
  <tr><th class="center">No</th><th>Deskripsi</th><th class="right">Jumlah</th><th>Dicatat</th><th>Waktu</th></tr>
  ${data.expenses.map((e, i) => `<tr><td class="center">${i + 1}</td><td>${e.description}</td><td class="right">${fmtRp(e.amount)}</td><td>${e.recordedBy}</td><td>${e.time}</td></tr>`).join("")}
  <tr class="total-row"><td></td><td>TOTAL</td><td class="right">${fmtRp(data.summary.totalExpenses)}</td><td></td><td></td></tr>
</table>` : ""}

<div class="footer">Generated by POS System RM. Etek Minang — ${new Date().toLocaleString("id-ID")}</div>
</body></html>`

  const win = window.open("", "_blank", "width=800,height=600")
  if (!win) { alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak."); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.print(); win.onafterprint = () => win.close() }
}

export async function exportExcel(data: ExportData) {
  const XLSX = await import("xlsx")
  const wb = XLSX.utils.book_new()

  const summaryData = [
    ["LAPORAN PENJUALAN HARIAN - RM. ETEK MINANG"], [data.dateFormatted], [],
    ["Keterangan", "Nilai"],
    ["Total Pendapatan", data.summary.totalRevenue],
    ["Total Pengeluaran", data.summary.totalExpenses],
    ["Profit", data.summary.profit],
    ["Jumlah Transaksi", data.summary.transactionCount],
    [], ["Metode", "Transaksi", "Pendapatan"],
    ["Tunai", data.summary.cash.count, data.summary.cash.revenue],
    ["QRIS", data.summary.qris.count, data.summary.qris.revenue],
    [], ["Tipe", "Transaksi", "Pendapatan"],
    ["Dine-In", data.summary.dineIn.count, data.summary.dineIn.revenue],
    ["Takeaway", data.summary.takeaway.count, data.summary.takeaway.revenue],
  ]
  if (!data.summary.hasExpenses) summaryData.push([], ["Catatan: Pengeluaran belum dicatat"])
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
  ws1["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan")

  const salesRows = data.menuSales.map((m, i) => [i + 1, m.name, m.category, m.quantity, m.price, m.total])
  const tp = data.menuSales.reduce((s, m) => s + m.quantity, 0)
  const gt = data.menuSales.reduce((s, m) => s + m.total, 0)
  salesRows.push(["", "TOTAL", "", tp, "", gt])
  const ws2 = XLSX.utils.aoa_to_sheet([["No", "Menu", "Kategori", "Porsi", "Harga", "Total"], ...salesRows])
  ws2["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws2, "Penjualan Menu")

  const expRows = data.expenses.map((e, i) => [i + 1, e.description, e.amount, e.recordedBy, e.time])
  if (data.expenses.length > 0) expRows.push(["", "TOTAL", data.summary.totalExpenses, "", ""])
  const ws3 = XLSX.utils.aoa_to_sheet(data.expenses.length > 0
    ? [["No", "Deskripsi", "Jumlah", "Dicatat", "Waktu"], ...expRows]
    : [["Belum ada pengeluaran"]])
  ws3["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws3, "Pengeluaran")

  const txRows = data.transactions.map((tx) => [tx.orderNumber, tx.time, tx.type, tx.method, tx.total, tx.cashier, tx.items])
  const ws4 = XLSX.utils.aoa_to_sheet([["No. Pesanan", "Waktu", "Tipe", "Metode", "Total", "Kasir", "Item"], ...txRows])
  ws4["!cols"] = [{ wch: 22 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, ws4, "Transaksi")

  XLSX.writeFile(wb, `Laporan_Harian_${data.date.replace(/-/g, "")}.xlsx`)
}
