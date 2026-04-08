import type {
  User,
  Category,
  MenuItem,
  Order,
  OrderItem,
  Transaction,
  Expense,
  StockLog,
  RestockNotification,
} from "@prisma/client"

// Re-export Prisma types
export type {
  User,
  Category,
  MenuItem,
  Order,
  OrderItem,
  Transaction,
  Expense,
  StockLog,
  RestockNotification,
}

// Extended types with relations
export type MenuItemWithCategory = MenuItem & {
  category: Category
}

export type OrderWithItems = Order & {
  items: (OrderItem & { menuItem: MenuItem })[]
  createdBy: User
  transaction?: Transaction | null
}

export type CategoryWithItems = Category & {
  menuItems: MenuItem[]
}

// API response wrapper
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

// Order creation payload
export type CreateOrderPayload = {
  type: "DINE_IN" | "TAKEAWAY"
  tableNumber?: number
  createdById: string
  items: {
    menuItemId: string
    quantity: number
  }[]
}

// Payment payload
export type ProcessPaymentPayload = {
  orderId: string
  paymentMethod: "CASH" | "QRIS"
  cashReceived?: number
}
