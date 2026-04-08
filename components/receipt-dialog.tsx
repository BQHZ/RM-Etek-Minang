"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog"
import { Printer, X } from "lucide-react"
import ReceiptTemplate, { type ReceiptData } from "@/components/receipt-template"

type ReceiptDialogProps = {
  open: boolean
  onClose: () => void
  data: ReceiptData | null
}

export default function ReceiptDialog({ open, onClose, data }: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!receiptRef.current) return

    const printWindow = window.open("", "_blank", "width=320,height=600")
    if (!printWindow) {
      // Fallback: use window.print with hidden iframe
      window.print()
      return
    }

    const content = receiptRef.current.innerHTML
    const styles = receiptRef.current.querySelector("style")?.innerHTML || ""

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk - ${data?.orderNumber || ""}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { display: flex; justify-content: center; padding: 0; }
            ${styles}
            .receipt-print {
              font-family: "Courier New", Courier, monospace;
              font-size: 12px;
              line-height: 1.4;
              width: 280px;
              padding: 8px;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .large { font-size: 16px; }
            .sep { text-align: center; color: #666; overflow: hidden; white-space: nowrap; font-size: 11px; }
            .row { display: flex; justify-content: space-between; gap: 4px; }
            .row .label { flex-shrink: 0; }
            .row .value { text-align: right; flex-shrink: 0; }
            .item-row { display: flex; justify-content: space-between; }
            .item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .item-sub { flex-shrink: 0; text-align: right; padding-left: 8px; }
            .item-detail { font-size: 11px; color: #555; padding-left: 8px; }
            .total-section { padding: 4px 0; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mb-1 { margin-bottom: 4px; }
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body { padding: 0; }
              .receipt-print { width: 80mm; padding: 4mm; font-size: 11px; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-print">${content}</div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Preview Struk</h2>
        </div>

        {/* Receipt Preview */}
        <div className="flex justify-center p-4 bg-gray-100 max-h-[60vh] overflow-y-auto">
          <div className="bg-white shadow-lg rounded-sm">
            <ReceiptTemplate ref={receiptRef} data={data} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X className="h-4 w-4 mr-2" /> Tutup
          </Button>
          <Button
            onClick={handlePrint}
            className="flex-1 bg-amber-800 hover:bg-amber-900"
          >
            <Printer className="h-4 w-4 mr-2" /> Cetak Struk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
