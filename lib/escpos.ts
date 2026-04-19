// lib/escpos.ts

const ESC = 0x1b
const GS  = 0x1d

// 58mm = ~32 karakter per baris
const LINE_WIDTH = 32

// Paksa ASCII only, karakter non-ASCII diganti "?"
function textToBytes(text: string): number[] {
  return Array.from(text).map((c) => {
    const code = c.charCodeAt(0)
    return code < 128 ? code : "?".charCodeAt(0)
  })
}

// Format rupiah manual — hanya ASCII, tidak pakai Intl.NumberFormat
const fmt = (n: number): string =>
  "Rp " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")

// Sanitasi string — hapus aksen & karakter non-ASCII
function sanitize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "?")
    .trim()
}

// Rata kiri-kanan dalam satu baris
function pad(left: string, right: string, width = LINE_WIDTH): string {
  const gap = width - left.length - right.length
  return gap > 0
    ? left + " ".repeat(gap) + right
    : left.slice(0, width - right.length - 1) + " " + right
}

// Garis pemisah
function separator(width = LINE_WIDTH): string {
  return "-".repeat(width)
}

// Push satu baris teks + newline ke array bytes
function pushLine(bytes: number[], text = ""): void {
  bytes.push(...textToBytes(text + "\n"))
}

// Push bytes mentah
function push(bytes: number[], ...args: number[]): void {
  bytes.push(...args)
}

export function buildEscPosReceipt(data: {
  orderNumber: string
  date: string
  time: string
  type: "DINE_IN" | "TAKEAWAY"
  tableNumber?: number | null
  cashierName: string
  items: {
    name: string
    quantity: number
    price: number
    subtotal: number
  }[]
  total: number
  paymentMethod: "CASH" | "QRIS"
  cashReceived?: number | null
  changeAmount?: number | null
}): Uint8Array {
  const bytes: number[] = []

  // ─── Init printer ────────────────────────────────────────
  push(bytes, ESC, 0x40)

  // ─── Header ──────────────────────────────────────────────
  push(bytes, ESC, 0x61, 0x01)       // center align
  push(bytes, ESC, 0x45, 0x01)       // bold on
  push(bytes, GS,  0x21, 0x11)       // double width + height
  pushLine(bytes, "RM. ETEK MINANG")
  push(bytes, GS,  0x21, 0x00)       // normal size
  push(bytes, ESC, 0x45, 0x00)       // bold off
  pushLine(bytes, "Restoran Padang")
  pushLine(bytes, "Jl. Contoh Alamat No. 123")
  pushLine(bytes, "Telp: (021) 1234-5678")
  push(bytes, ESC, 0x61, 0x00)       // left align

  pushLine(bytes, separator())

  // ─── Info Pesanan ─────────────────────────────────────────
  pushLine(bytes, pad("No. Pesanan", sanitize(data.orderNumber)))
  pushLine(bytes, pad("Tanggal",     sanitize(data.date)))
  pushLine(bytes, pad("Waktu",       sanitize(data.time)))
  pushLine(bytes, pad("Tipe",        data.type === "DINE_IN" ? "Dine-In" : "Takeaway"))

  if (data.type === "DINE_IN" && data.tableNumber) {
    pushLine(bytes, pad("Meja", String(data.tableNumber)))
  }

  pushLine(bytes, pad("Kasir", sanitize(data.cashierName)))

  pushLine(bytes, separator())

  // ─── Item Pesanan ─────────────────────────────────────────
  for (const item of data.items) {
    const name = sanitize(item.name)
    const truncated = name.length > LINE_WIDTH
      ? name.slice(0, LINE_WIDTH - 1)
      : name

    pushLine(bytes, truncated)
    pushLine(bytes, pad(
      `  ${item.quantity} x ${fmt(item.price)}`,
      fmt(item.subtotal)
    ))
  }

  pushLine(bytes, separator())

  // ─── Total ────────────────────────────────────────────────
  push(bytes, ESC, 0x45, 0x01)       // bold on
  push(bytes, GS,  0x21, 0x01)       // double height
  pushLine(bytes, pad("TOTAL", fmt(data.total)))
  push(bytes, GS,  0x21, 0x00)       // normal size
  push(bytes, ESC, 0x45, 0x00)       // bold off

  pushLine(bytes, separator())

  // ─── Pembayaran ───────────────────────────────────────────
  pushLine(bytes, pad(
    "Metode",
    data.paymentMethod === "CASH" ? "Tunai" : "QRIS"
  ))

  if (data.paymentMethod === "CASH") {
    pushLine(bytes, pad("Dibayar", fmt(data.cashReceived || 0)))
    push(bytes, ESC, 0x45, 0x01)     // bold on
    pushLine(bytes, pad("Kembali", fmt(data.changeAmount || 0)))
    push(bytes, ESC, 0x45, 0x00)     // bold off
  }

  pushLine(bytes, separator())

  // ─── Footer ───────────────────────────────────────────────
  push(bytes, ESC, 0x61, 0x01)       // center align
  push(bytes, ESC, 0x45, 0x01)       // bold on
  pushLine(bytes, "Terima kasih!")
  push(bytes, ESC, 0x45, 0x00)       // bold off
  pushLine(bytes, "Silakan datang kembali")
  pushLine(bytes, "")
  pushLine(bytes, "RM. Etek Minang POS System")
  push(bytes, ESC, 0x61, 0x00)       // left align

  // ─── Feed & Cut ───────────────────────────────────────────
  pushLine(bytes, "")
  pushLine(bytes, "")
  pushLine(bytes, "")
  push(bytes, GS, 0x56, 0x41, 0x03)  // partial cut

  return new Uint8Array(bytes)
}

// UUID umum printer thermal Bluetooth China (termasuk VSC)
// Ganti dengan UUID asli dari nRF Connect jika tidak bisa connect
export const PRINTER_SERVICE        = "000018f0-0000-1000-8000-00805f9b34fb"
export const PRINTER_CHARACTERISTIC = "00002af1-0000-1000-8000-00805f9b34fb"