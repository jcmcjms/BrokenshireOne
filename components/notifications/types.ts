export interface Notification {
  id: string
  user_id: string
  type: "new_order" | "order_confirmed" | "order_cancelled" | "low_stock"
  title: string
  message: string
  data: Record<string, any>
  read: boolean
  created_at: string
}
