"use client"

import TransactionHistory from "@/components/transaction-history"

export default function PosTransactionsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Riwayat Transaksi</h1>
        <p className="text-sm text-muted-foreground">Daftar transaksi yang sudah dibayar</p>
      </div>
      <TransactionHistory canVoid={false} />
    </div>
  )
}
