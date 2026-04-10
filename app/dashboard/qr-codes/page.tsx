"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QRCodeSVG } from "qrcode.react"
import { Printer } from "lucide-react"

export default function QRCodesPage() {
  const [tableCount, setTableCount] = useState("15")
  const [generated, setGenerated] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")

  const count = parseInt(tableCount) || 0

  const handleGenerate = () => {
    const url = window.location.origin
    setBaseUrl(url)
    setGenerated(true)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .qr-print-area, .qr-print-area * { visibility: visible !important; }
          .qr-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .no-print { display: none !important; }
          .qr-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
            padding: 10mm !important;
          }
          .qr-card {
            border: 1px dashed #ccc !important;
            padding: 12px !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="no-print">
        <h1 className="text-2xl font-bold">QR Code Meja</h1>
        <p className="text-sm text-muted-foreground">
          Generate QR code untuk setiap meja. Pelanggan scan untuk pesan langsung dari HP.
        </p>
      </div>

      <div className="no-print flex items-end gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Jumlah Meja</label>
          <Input
            type="number"
            value={tableCount}
            onChange={(e) => { setTableCount(e.target.value); setGenerated(false) }}
            min={1}
            max={50}
            className="w-32"
          />
        </div>
        <Button onClick={handleGenerate} className="bg-amber-800 hover:bg-amber-900">
          Generate QR Codes
        </Button>
        {generated && (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print Semua
          </Button>
        )}
      </div>

      {generated && count > 0 && (
        <div className="qr-print-area">
          <div className="qr-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: count }, (_, i) => i + 1).map((num) => {
              const url = `${baseUrl}/order/table/${num}`
              return (
                <div
                  key={num}
                  className="qr-card bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center"
                >
                  <QRCodeSVG
                    value={url}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                  <div className="text-center mt-3">
                    <p className="font-bold text-lg">Meja {num}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Scan untuk pesan</p>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2 break-all text-center">{url}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
