"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { formatRupiah, cn } from "@/lib/utils"

type MenuItem = { id: string; name: string; price: number; currentStock: number; imageUrl: string | null }
type Category = { id: string; name: string; menuItems: MenuItem[] }
type CartItem = { menuItemId: string; name: string; price: number; quantity: number }
type OrderStatusType = "PENDING_CONFIRMATION" | "OPEN" | "CANCELLED" | null

export default function CustomerOrderPage() {
  const params = useParams()
  const tableNumber = parseInt(params.tableNumber as string)

  const [categories, setCategories] = useState<Category[]>([])
  const [activeCat, setActiveCat] = useState<string>("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [customerNote, setCustomerNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<OrderStatusType>(null)
  const [rejectReason, setRejectReason] = useState<string | null>(null)

  const fetchMenu = useCallback(async () => {
    const res = await fetch("/api/menu/public")
    const data = await res.json()
    if (data.success) setCategories(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMenu() }, [fetchMenu])

  // Poll order status
  useEffect(() => {
    if (!orderId) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/orders/${orderId}/status`)
      const data = await res.json()
      if (data.success) {
        setOrderStatus(data.data.status)
        if (data.data.rejectReason) setRejectReason(data.data.rejectReason)
        if (data.data.status === "OPEN" || data.data.status === "CANCELLED") clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [orderId])

  const allItems = activeCat === "all"
    ? categories.flatMap((c) => c.menuItems)
    : categories.find((c) => c.id === activeCat)?.menuItems || []

  const addToCart = (item: MenuItem) => {
    if (item.currentStock <= 0) return
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.menuItemId === item.id)
      if (idx >= 0) {
        if (prev[idx].quantity >= item.currentStock) return prev
        const updated = [...prev]
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
        return updated
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.menuItemId !== menuItemId) return c
      const newQty = c.quantity + delta
      if (newQty <= 0) return null
      return { ...c, quantity: newQty }
    }).filter(Boolean) as CartItem[])
  }

  const removeItem = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId))
  }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0)
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0)

  const handleSubmit = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/orders/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber, customerNote,
          items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrderId(data.data.id)
        setOrderNumber(data.data.orderNumber)
        setOrderStatus("PENDING_CONFIRMATION")
        setShowCart(false)
      } else { alert(data.error) }
    } catch { alert("Gagal mengirim pesanan. Coba lagi.") }
    setSubmitting(false)
  }

  const tabCount = categories.length + 1
  const fitTabs = tabCount <= 5

  // ===== ORDER STATUS PAGE =====
  if (orderId) {
    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden"
        style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fff7ed 40%, #fef9ee 100%)" }}>
        <header className="px-4 py-4 text-center">
          <h1 className="font-black text-xl text-amber-900 tracking-tight">🍛 RM. ETEK MINANG</h1>
          <p className="text-amber-600 text-xs font-medium mt-0.5">Meja {tableNumber}</p>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm w-full">
            {orderStatus === "PENDING_CONFIRMATION" && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-amber-100">
                <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-5">
                  <span className="text-4xl animate-bounce">⏳</span>
                </div>
                <h2 className="text-xl font-bold text-amber-900 mb-2">Pesanan Terkirim!</h2>
                <p className="text-gray-500 text-sm mb-1">No. Pesanan</p>
                <p className="font-mono font-bold text-lg text-amber-800 mb-4">{orderNumber}</p>
                <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-700 border border-amber-200">
                  <div className="flex items-center justify-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    Menunggu konfirmasi pelayan...
                  </div>
                </div>
              </div>
            )}
            {orderStatus === "OPEN" && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-green-100">
                <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-5">
                  <span className="text-4xl">✅</span>
                </div>
                <h2 className="text-xl font-bold text-green-800 mb-2">Pesanan Dikonfirmasi!</h2>
                <p className="font-mono font-bold text-lg text-green-700 mb-4">{orderNumber}</p>
                <div className="bg-green-50 rounded-2xl p-4 text-sm text-green-700 border border-green-200">
                  🍽️ Makanan Anda sedang disiapkan. Silakan menunggu!
                </div>
              </div>
            )}
            {orderStatus === "CANCELLED" && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-red-100">
                <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-5">
                  <span className="text-4xl">😔</span>
                </div>
                <h2 className="text-xl font-bold text-red-800 mb-2">Pesanan Ditolak</h2>
                <p className="text-gray-500 text-sm mb-4">Maaf, pesanan tidak dapat diproses.</p>
                {rejectReason && (
                  <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-700 border border-red-200 mb-5">
                    {rejectReason}
                  </div>
                )}
                <button onClick={() => {
                  setOrderId(null); setOrderNumber(null); setOrderStatus(null)
                  setRejectReason(null); setCart([]); setCustomerNote(""); fetchMenu()
                }} className="w-full py-3.5 bg-amber-800 text-white rounded-2xl font-bold active:scale-[0.98] transition-transform">
                  🔄 Pesan Lagi
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-amber-400 pb-4">RM. Etek Minang · Restoran Padang</p>
      </div>
    )
  }

  // ===== MAIN MENU PAGE =====
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: "linear-gradient(180deg, #fffbeb 0%, #f5f5f4 15%)" }}>

      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)" }}>
        <div className="text-center">
          <h1 className="font-black text-lg text-white tracking-tight drop-shadow-sm">
            🍛 RM. ETEK MINANG
          </h1>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="bg-white/20 text-amber-100 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Meja {tableNumber}
            </span>
            <span className="text-amber-200 text-xs">Pesan dari HP Anda</span>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-[56px] z-20 bg-white/95 backdrop-blur-sm border-b border-amber-100 px-2 py-2">
        <div className={cn("flex gap-1.5", fitTabs ? "justify-center" : "overflow-x-auto")}>
          <button onClick={() => setActiveCat("all")}
            className={cn(
              "py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
              fitTabs ? "flex-1 px-2" : "px-4",
              activeCat === "all"
                ? "bg-amber-800 text-white shadow-md shadow-amber-800/25"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            )}>
            Semua
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)}
              className={cn(
                "py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                fitTabs ? "flex-1 px-2" : "px-4",
                activeCat === cat.id
                  ? "bg-amber-800 text-white shadow-md shadow-amber-800/25"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              )}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className={cn("flex-1 px-3 py-3 overflow-x-hidden", cart.length > 0 && "pb-24")}>
        {loading ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-pulse">🍛</div>
            <p className="text-amber-600 font-medium">Memuat menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 w-full">
            {allItems.map((item) => {
              const outOfStock = item.currentStock <= 0
              const inCart = cart.find((c) => c.menuItemId === item.id)
              const qty = inCart?.quantity || 0
              return (
                <div key={item.id} className={cn(
                  "relative rounded-2xl overflow-hidden bg-white transition-all min-w-0",
                  outOfStock ? "opacity-50 grayscale" : "shadow-sm hover:shadow-lg",
                  qty > 0 && "ring-2 ring-amber-400 shadow-md shadow-amber-100"
                )}>
                  {/* Photo */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl"
                        style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)" }}>🍛</div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Habis</span>
                      </div>
                    )}
                    {qty > 0 && (
                      <span className="absolute top-2 left-2 bg-amber-600 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-lg ring-2 ring-white">
                        {qty}
                      </span>
                    )}
                    {!outOfStock && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6">
                        <p className="text-white font-bold text-sm drop-shadow-md">{formatRupiah(item.price)}</p>
                      </div>
                    )}
                  </div>

                  {/* Info + Controls */}
                  <div className="p-2.5">
                    <p className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.25rem]">{item.name}</p>
                    {outOfStock && <p className="text-xs text-red-500 font-medium mt-1">Tidak tersedia</p>}
                    {!outOfStock && (
                      <div className="mt-2">
                        {qty === 0 ? (
                          <button onClick={() => addToCart(item)}
                            className="w-full py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-transform shadow-sm">
                            + Tambah
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-amber-50 rounded-xl border border-amber-200 px-1 py-0.5">
                            <button onClick={() => updateQty(item.id, -1)}
                              className="h-9 w-9 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-lg font-bold text-amber-800 active:bg-amber-100 shadow-sm">−</button>
                            <span className="text-lg font-bold text-amber-900 w-8 text-center">{qty}</span>
                            <button onClick={() => addToCart(item)} disabled={qty >= item.currentStock}
                              className="h-9 w-9 rounded-lg bg-amber-700 text-white flex items-center justify-center text-lg font-bold active:bg-amber-900 disabled:opacity-40 shadow-sm">+</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-white via-white to-white/80">
          <button onClick={() => setShowCart(true)}
            className="w-full py-4 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-xl shadow-green-700/30"
            style={{ background: "linear-gradient(135deg, #15803d 0%, #166534 100%)" }}>
            <span className="bg-white/20 rounded-full px-3 py-0.5 text-sm font-bold">{itemCount}</span>
            Lihat Keranjang · {formatRupiah(total)}
          </button>
        </div>
      )}

      {/* Cart Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-4 py-2 border-b border-amber-100">
              <h2 className="font-bold text-lg text-amber-900">🛒 Keranjang · Meja {tableNumber}</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-amber-600">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(item.menuItemId, -1)}
                      className="h-8 w-8 rounded-lg border border-amber-200 bg-white flex items-center justify-center text-lg font-bold active:bg-amber-50">−</button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menuItemId, 1)}
                      className="h-8 w-8 rounded-lg border border-amber-200 bg-white flex items-center justify-center text-lg font-bold active:bg-amber-50">+</button>
                  </div>
                  <div className="text-right w-20 shrink-0">
                    <p className="text-sm font-bold">{formatRupiah(item.price * item.quantity)}</p>
                    <button onClick={() => removeItem(item.menuItemId)} className="text-red-400 text-xs hover:text-red-600">Hapus</button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <label className="text-sm font-medium text-amber-700">📝 Catatan (opsional)</label>
                <textarea value={customerNote} onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Contoh: Rendang jangan terlalu pedas"
                  className="w-full mt-1 px-3 py-2.5 border border-amber-200 rounded-xl text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/30" />
              </div>
            </div>

            <div className="border-t border-amber-100 px-4 py-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-amber-600 text-sm font-medium">{itemCount} item</span>
                <div className="text-right">
                  <p className="text-xs text-amber-600">Total</p>
                  <p className="text-2xl font-black text-amber-900">{formatRupiah(total)}</p>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-4 text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-green-700/25"
                style={{ background: "linear-gradient(135deg, #15803d 0%, #166534 100%)" }}>
                {submitting ? "⏳ Mengirim..." : "✅ Kirim Pesanan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
