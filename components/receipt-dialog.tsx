"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Printer, X, Bluetooth } from "lucide-react"
import ReceiptTemplate, { type ReceiptData } from "@/components/receipt-template"
import { buildEscPosReceipt, PRINTER_SERVICE, PRINTER_CHARACTERISTIC } from "@/lib/escpos"

type Props = { open: boolean; onClose: () => void; data: ReceiptData | null }
type BtStatus = "idle" | "connecting" | "connected" | "printing" | "error"

// ─── Simpan device & characteristic di luar component ─────────────────────────
// Supaya tidak hilang meski dialog dibuka/tutup berkali-kali
let cachedDevice:  BluetoothDevice | null = null
let cachedChar:    BluetoothRemoteGATTCharacteristic | null = null

export default function ReceiptDialog({ open, onClose, data }: Props) {
  const [btStatus,  setBtStatus]  = useState<BtStatus>("idle")
  const [errorMsg,  setErrorMsg]  = useState("")
  const [printerName, setPrinterName] = useState<string | null>(null)

  // ─── Saat komponen pertama mount, cek apakah ada device yang sudah pernah di-pair ──
  useEffect(() => {
    const restorePairedDevice = async () => {
      try {
        // getDevices() mengembalikan semua device yang sudah pernah di-pair di browser ini
        const devices = await (navigator.bluetooth as any).getDevices()
        if (devices.length === 0) return

        // Cari printer yang sudah pernah di-pair
        const printer = devices.find((d: BluetoothDevice) =>
          d.name?.toLowerCase().includes("printer") ||
          d.name?.toLowerCase().includes("vsc") ||
          d.name?.toLowerCase().includes("pos") ||
          d.name?.toLowerCase().includes("tm-58") ||
          true  // ← ambil device pertama jika tidak ada yang cocok
        )

        if (!printer) return

        cachedDevice = printer
        setPrinterName(printer.name || "Printer")

        // Pasang listener disconnect
        printer.addEventListener("gattserverdisconnected", handleDisconnect)

        // Coba langsung connect di background
        await connectToDevice(printer)

      } catch {
        // getDevices() tidak support di semua browser — tidak perlu error
      }
    }

    restorePairedDevice()

    // Cleanup listener saat unmount
    return () => {
      cachedDevice?.removeEventListener("gattserverdisconnected", handleDisconnect)
    }
  }, [])

  // ─── Handler disconnect ────────────────────────────────────────────────────────
  const handleDisconnect = () => {
    cachedChar = null
    setBtStatus("idle")
    // Jangan reset cachedDevice — supaya bisa reconnect otomatis
  }

  // ─── Connect ke device (tanpa popup) ──────────────────────────────────────────
  const connectToDevice = async (device: BluetoothDevice): Promise<BluetoothRemoteGATTCharacteristic | null> => {
    try {
      const server  = await device.gatt!.connect()
      const service = await server.getPrimaryService(PRINTER_SERVICE)
      const char    = await service.getCharacteristic(PRINTER_CHARACTERISTIC)
      cachedChar    = char
      setPrinterName(device.name || "Printer")
      setBtStatus("connected")
      return char
    } catch {
      cachedChar = null
      return null
    }
  }

  // ─── Kirim data dalam chunk ────────────────────────────────────────────────────
  const sendInChunks = async (
    char: BluetoothRemoteGATTCharacteristic,
    data: Uint8Array,
    chunkSize = 512
  ) => {
    for (let i = 0; i < data.length; i += chunkSize) {
      await char.writeValue(data.slice(i, i + chunkSize))
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  // ─── Main print handler ────────────────────────────────────────────────────────
  const handlePrint = async () => {
    if (!data) return
    setErrorMsg("")

    try {
      let char = cachedChar

      // Kasus 1: Sudah ada char yang valid → langsung print
      if (char) {
        setBtStatus("printing")
        await sendInChunks(char, buildEscPosReceipt(data))
        setBtStatus("connected")
        onClose()
        return
      }

      // Kasus 2: Device dikenal tapi koneksi putus → reconnect otomatis
      if (cachedDevice) {
        setBtStatus("connecting")
        char = await connectToDevice(cachedDevice)

        if (char) {
          setBtStatus("printing")
          await sendInChunks(char, buildEscPosReceipt(data))
          setBtStatus("connected")
          onClose()
          return
        }

        // Reconnect gagal (printer mati / tidak terjangkau)
        throw new Error("Printer tidak ditemukan. Pastikan printer menyala dan Bluetooth aktif.")
      }

      // Kasus 3: Belum pernah pair → tampilkan popup pilih device (hanya sekali ini)
      setBtStatus("connecting")

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [PRINTER_SERVICE] }],
        // Jika filter tidak cocok, uncomment baris di bawah:
        // acceptAllDevices: true,
        // optionalServices: [PRINTER_SERVICE],
      })

      cachedDevice = device
      device.addEventListener("gattserverdisconnected", handleDisconnect)

      char = await connectToDevice(device)
      if (!char) throw new Error("Gagal terhubung ke printer.")

      setBtStatus("printing")
      await sendInChunks(char, buildEscPosReceipt(data))
      setBtStatus("connected")
      onClose()

    } catch (err: any) {
      // User cancel popup = bukan error
      if (err?.name === "NotFoundError" || err?.message?.includes("cancelled")) {
        setBtStatus(cachedDevice ? "connected" : "idle")
        return
      }

      setErrorMsg(err?.message || "Gagal terhubung ke printer.")
      cachedChar = null
      setBtStatus("error")
    }
  }

  if (!data) return null

  const isLoading = btStatus === "connecting" || btStatus === "printing"

  const statusLabel: Record<BtStatus, string> = {
    idle:       "Cetak Struk",
    connecting: "Menghubungkan...",
    connected:  "Cetak Struk",
    printing:   "Mencetak...",
    error:      "Coba Lagi",
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Preview Struk</h2>
          {printerName && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <Bluetooth className="h-3 w-3" />
              {printerName}
            </span>
          )}
        </div>

        {/* Preview */}
        <div className="flex justify-center p-4 bg-gray-100 max-h-[55vh] overflow-y-auto">
          <div className="bg-white shadow-lg rounded-sm">
            <ReceiptTemplate data={data} />
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
            <X className="h-4 w-4 mr-2" /> Tutup
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isLoading}
            className="flex-1 bg-amber-800 hover:bg-amber-900"
          >
            {isLoading
              ? <span className="animate-pulse">{statusLabel[btStatus]}</span>
              : <><Printer className="h-4 w-4 mr-2" />{statusLabel[btStatus]}</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}