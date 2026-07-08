import { apiFetch } from './client'

export type OrderStatus = 'pending' | 'preparing' | 'done' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid'
export type PaymentMethod = 'vietqr' | 'cash'

export interface CheckoutItem {
  menu_item_id: string
  qty: number
  toppings: string[]
  note?: string | null
}

export interface CheckoutPayload {
  customer_name: string
  room_number: string
  phone?: string | null
  items: CheckoutItem[]
  payment_method: PaymentMethod
}

export interface OrderItem {
  menu_item_id: string
  name: string
  qty: number
  toppings: { name: string; price: number }[]
  unit_price: number
  price: number
  note?: string | null
}

export interface VietQrInfo {
  qr_image_url: string
  bank_code: string
  bank_name: string
  account_number: string
  account_name: string
  amount: number
  content: string
}

export interface Order {
  id: string
  order_code: string
  customer_name: string
  room_number: string
  phone: string | null
  items: OrderItem[]
  total: number
  transfer_amount: number
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  cancelled_by: 'customer' | 'admin' | null
  created_at: string
  vietqr: VietQrInfo | null
}

export async function checkout(payload: CheckoutPayload): Promise<Order> {
  return apiFetch<Order>('/cart/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getOrder(code: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${encodeURIComponent(code)}`)
}

export async function cancelOrder(code: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${encodeURIComponent(code)}/cancel`, { method: 'PATCH' })
}

// --- Admin ---------------------------------------------------------------

export async function adminListOrders(status?: OrderStatus): Promise<Order[]> {
  const qs = status ? `?status=${status}` : ''
  return apiFetch<Order[]>(`/admin/orders${qs}`)
}

export async function adminUpdateOrder(
  id: string,
  patch: { status?: OrderStatus; payment_status?: PaymentStatus },
): Promise<Order> {
  return apiFetch<Order>(`/admin/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  preparing: 'Đang làm',
  done: 'Hoàn thành',
  cancelled: 'Đã huỷ',
}
