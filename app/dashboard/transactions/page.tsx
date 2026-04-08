"use client"

import TransactionHistory from "@/components/transaction-history"

export default function DashboardTransactionsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Riwayat Transaksi</h1>
        <p className="text-sm text-muted-foreground">Kelola dan pantau semua transaksi</p>
      </div>
      <TransactionHistory canVoid={true} />
    </div>
  )
}
