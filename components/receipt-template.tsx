"use client"

import { forwardRef } from "react"
import { formatRupiah } from "@/lib/utils"

export type ReceiptData = {
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
}

const SEPARATOR = "————————————————————————————————"

const ReceiptTemplate = forwardRef<HTMLDivElement, { data: ReceiptData }>(
  ({ data }, ref) => {
    return (
      <div ref={ref} className="receipt-print">
        <style jsx>{`
          .receipt-print {
            font-family: "Courier New", Courier, monospace;
            font-size: 12px;
            line-height: 1.4;
            width: 280px;
            padding: 8px;
            color: #000;
            background: #fff;
          }
          .receipt-print .center {
            text-align: center;
          }
          .receipt-print .right {
            text-align: right;
          }
          .receipt-print .bold {
            font-weight: bold;
          }
          .receipt-print .large {
            font-size: 16px;
          }
          .receipt-print .sep {
            text-align: center;
            color: #666;
            overflow: hidden;
            white-space: nowrap;
            font-size: 11px;
          }
          .receipt-print .row {
            display: flex;
            justify-content: space-between;
            gap: 4px;
          }
          .receipt-print .row .label {
            flex-shrink: 0;
          }
          .receipt-print .row .value {
            text-align: right;
            flex-shrink: 0;
          }
          .receipt-print .item-row {
            display: flex;
            justify-content: space-between;
          }
          .receipt-print .item-name {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .receipt-print .item-sub {
            flex-shrink: 0;
            text-align: right;
            padding-left: 8px;
          }
          .receipt-print .item-detail {
            font-size: 11px;
            color: #555;
            padding-left: 8px;
          }
          .receipt-print .total-section {
            padding: 4px 0;
          }
          .receipt-print .mt-1 { margin-top: 4px; }
          .receipt-print .mt-2 { margin-top: 8px; }
          .receipt-print .mb-1 { margin-bottom: 4px; }

          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body * {
              visibility: hidden !important;
            }
            .receipt-print,
            .receipt-print * {
              visibility: visible !important;
            }
            .receipt-print {
              position: fixed;
              left: 0;
              top: 0;
              width: 80mm;
              padding: 4mm;
              font-size: 11px;
            }
          }
        `}</style>

        {/* Header */}
        <div className="center bold large">RM. ETEK MINANG</div>
        <div className="center" style={{ fontSize: "11px" }}>
          Restoran Padang
        </div>
        <div className="center" style={{ fontSize: "10px", color: "#666" }}>
          Jl. Contoh Alamat No. 123
        </div>
        <div className="center" style={{ fontSize: "10px", color: "#666" }}>
          Telp: (021) 1234-5678
        </div>

        <div className="sep mt-1">{SEPARATOR}</div>

        {/* Order Info */}
        <div className="mt-1">
          <div className="row">
            <span className="label">No. Pesanan</span>
            <span className="value bold">{data.orderNumber}</span>
          </div>
          <div className="row">
            <span className="label">Tanggal</span>
            <span className="value">{data.date}</span>
          </div>
          <div className="row">
            <span className="label">Waktu</span>
            <span className="value">{data.time}</span>
          </div>
          <div className="row">
            <span className="label">Tipe</span>
            <span className="value">
              {data.type === "DINE_IN" ? "Dine-In" : "Takeaway"}
            </span>
          </div>
          {data.type === "DINE_IN" && data.tableNumber && (
            <div className="row">
              <span className="label">Meja</span>
              <span className="value">{data.tableNumber}</span>
            </div>
          )}
          <div className="row">
            <span className="label">Kasir</span>
            <span className="value">{data.cashierName}</span>
          </div>
        </div>

        <div className="sep mt-1">{SEPARATOR}</div>

        {/* Items */}
        <div className="mt-1 mb-1">
          {data.items.map((item, i) => (
            <div key={i}>
              <div className="item-row">
                <span className="item-name">{item.name}</span>
                <span className="item-sub">{formatRupiah(item.subtotal)}</span>
              </div>
              <div className="item-detail">
                {item.quantity} x {formatRupiah(item.price)}
              </div>
            </div>
          ))}
        </div>

        <div className="sep">{SEPARATOR}</div>

        {/* Total */}
        <div className="total-section">
          <div className="row bold large">
            <span>TOTAL</span>
            <span>{formatRupiah(data.total)}</span>
          </div>
        </div>

        <div className="sep">{SEPARATOR}</div>

        {/* Payment Info */}
        <div className="mt-1">
          <div className="row">
            <span className="label">Metode</span>
            <span className="value bold">
              {data.paymentMethod === "CASH" ? "Tunai" : "QRIS"}
            </span>
          </div>
          {data.paymentMethod === "CASH" && (
            <>
              <div className="row">
                <span className="label">Dibayar</span>
                <span className="value">
                  {formatRupiah(data.cashReceived || 0)}
                </span>
              </div>
              <div className="row bold">
                <span className="label">Kembali</span>
                <span className="value">
                  {formatRupiah(data.changeAmount || 0)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="sep mt-1">{SEPARATOR}</div>

        {/* Footer */}
        <div className="center mt-2 bold">
          Terima kasih atas kunjungan Anda!
        </div>
        <div className="center" style={{ fontSize: "11px" }}>
          Silakan datang kembali
        </div>
        <div className="center mt-2" style={{ fontSize: "9px", color: "#999" }}>
          RM. Etek Minang POS System
        </div>
      </div>
    )
  }
)

ReceiptTemplate.displayName = "ReceiptTemplate"

export default ReceiptTemplate
