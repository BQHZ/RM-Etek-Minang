"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Printer, X, Bluetooth, BluetoothOff } from "lucide-react"
import ReceiptTemplate, { type ReceiptData } from "@/components/receipt-template"
import { buildEscPosReceipt, PRINTER_SERVICE, PRINTER_CHARACTERISTIC } from "@/lib/escpos"

type Props    = { open: boolean; onClose: () => void; data: ReceiptData | null }
type BtStatus = "idle" | "connecting" | "connected" | "printing" | "error"

const STORAGE_KEY = "pos_printer_name"

let cachedDevice: BluetoothDevice | null = null
let cachedChar:   BluetoothRemoteGATTCharacteristic | null = null

export default function ReceiptDialog({ open, onClose, data }: Props) {
  const [btStatus,    setBtStatus]    = useState<BtStatus>("idle")
  const [errorMsg,    setErrorMsg]    = useState("")
  const [printerName, setPrinterName] = useState<string | null>(null)

  // ─── Mount: restore printer dari session sebelumnya ─────────────────────────
  useEffect(() => {
    const savedName = localStorage.getItem(STORAGE_KEY)
    if (savedName) setPrinterName(savedName)

    autoConnectSavedPrinter(savedName)

    return () => {
      cachedDevice?.removeEventListener("gattserverdisconnected", handleDisconnect)
    }
  }, [])

  // ─── Auto connect ke printer yang pernah di-pair ─────────────────────────────
  const autoConnectSavedPrinter = async (savedName: string | null) => {
    try {
      // getDevices() mengembalikan semua device yang sudah di-grant permission
      // di browser ini — persists meski app ditutup & dibuka lagi
      const devices: BluetoothDevice[] = await (navigator.bluetooth as any).getDevices()
      if (devices.length === 0) return

      // Prioritas: cocokkan dengan nama yang tersimpan
      let printer = savedName
        ? devices.find((d) => d.name === savedName)
        : null

      // Fallback: ambil device pertama kalau nama tidak cocok
      if (!printer) printer = devices[0]
      if (!printer) return

      cachedDevice = printer
      printer.addEventListener("gattserverdisconnected", handleDisconnect)
      setPrinterName(printer.name || savedName || "Printer")
      // Connect di background — tidak tampilkan loading ke user
      await connectToDevice(printer, false)

    } catch {
      // getDevices() tidak support / gagal — tidak perlu error ke user
    }
  }

  // ─── Handler disconnect ───────────────────────────────────────────────────────
  const handleDisconnect = () => {
    cachedChar = null
    setBtStatus("idle")
    // cachedDevice tetap ada → reconnect otomatis saat print berikutnya
  }

  // ─── Connect ke device ────────────────────────────────────────────────────────
  const connectToDevice = async (
    device: BluetoothDevice,
    showStatus = true
  ): Promise<BluetoothRemoteGATTCharacteristic | null> => {
    try {
      if (showStatus) setBtStatus("connecting")

      const server  = await device.gatt!.connect()
      const service = await server.getPrimaryService(PRINTER_SERVICE)
      const char    = await service.getCharacteristic(PRINTER_CHARACTERISTIC)

      cachedChar = char

      const name = device.name || "Printer"
      setPrinterName(name)

      // ✅ Simpan nama printer ke localStorage
      // Sehingga saat app dibuka ulang bisa langsung auto connect
      localStorage.setItem(STORAGE_KEY, name)

      if (showStatus) setBtStatus("connected")
      return char

    } catch {
      cachedChar = null
      if (showStatus) setBtStatus("error")
      return null
    }
  }

  // ─── Kirim data dalam chunk ───────────────────────────────────────────────────
  const sendInChunks = async (
    char: BluetoothRemoteGATTCharacteristic,
    bytes: Uint8Array,
    chunkSize = 512
  ) => {
    for (let i = 0; i < bytes.length; i += chunkSize) {
      await char.writeValue(bytes.slice(i, i + chunkSize))
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  // ─── Main print handler ───────────────────────────────────────────────────────
  const handlePrint = async () => {
    if (!data) return
    setErrorMsg("")

    try {
      let char = cachedChar

      // Kasus 1: Char valid → langsung print
      if (char) {
        setBtStatus("printing")
        await sendInChunks(char, buildEscPosReceipt(data))
        setBtStatus("connected")
        onClose()
        return
      }

      // Kasus 2: Device dikenal, koneksi putus → reconnect otomatis (TANPA popup)
      if (cachedDevice) {
        setBtStatus("connecting")

        // Retry hingga 3x — kadang perlu beberapa detik setelah app baru dibuka
        let char: BluetoothRemoteGATTCharacteristic | null = null
        for (let attempt = 1; attempt <= 3; attempt++) {
          char = await connectToDevice(cachedDevice)
          if (char) break
          // Tunggu sebentar sebelum retry
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }

        if (char) {
          setBtStatus("printing")
          await sendInChunks(char, buildEscPosReceipt(data))
          setBtStatus("connected")
          onClose()
          return
        }

        throw new Error(
          "Printer tidak dapat dijangkau setelah 3x percobaan. Pastikan printer menyala."
        )
      }
      // Kasus 3: Belum pernah pair → popup pilih device (hanya sekali)
      setBtStatus("connecting")

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [PRINTER_SERVICE] }],
        // Jika filter tidak cocok, uncomment:
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
      if (err?.name === "NotFoundError" || err?.message?.includes("cancelled")) {
        setBtStatus(cachedDevice ? "connected" : "idle")
        return
      }

      setErrorMsg(err?.message || "Gagal terhubung ke printer.")
      cachedChar = null
      setBtStatus("error")
    }
  }

  // ─── Reset / ganti printer ────────────────────────────────────────────────────
  const handleForgetPrinter = () => {
    cachedDevice?.gatt?.disconnect()
    cachedDevice = null
    cachedChar   = null
    localStorage.removeItem(STORAGE_KEY)
    setPrinterName(null)
    setBtStatus("idle")
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
          <div className="flex items-center gap-2">
            {printerName ? (
              <>
                <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <Bluetooth className="h-3 w-3" />
                  {printerName}
                </span>
                {/* Tombol ganti printer */}
                <button
                  onClick={handleForgetPrinter}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  title="Ganti printer"
                >
                  <BluetoothOff className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <BluetoothOff className="h-3 w-3" />
                Belum terhubung
              </span>
            )}
          </div>
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
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
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