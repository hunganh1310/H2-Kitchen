// Tracks the order codes placed on this device (CLAUDE.md §4.1 — no login).

const KEY = 'h2_my_orders'
const MAX = 25

export interface SavedOrder {
  code: string
  createdAt: string
  total: number
  name: string
}

export function getMyOrders(): SavedOrder[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedOrder[]) : []
  } catch {
    return []
  }
}

export function addMyOrder(order: SavedOrder): void {
  const existing = getMyOrders().filter((o) => o.code !== order.code)
  const next = [order, ...existing].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
}
