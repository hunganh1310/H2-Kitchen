import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Category, Kind } from '../api/menu'

export interface CartTopping {
  name: string
  price: number
  qty: number // how many of this topping (e.g. x2 bò viên)
}

export interface CartLine {
  key: string
  menuItemId: string
  name: string
  kind: Kind
  category: Category
  basePrice: number
  toppings: CartTopping[]
  note: string
  qty: number
  maxQty: number
}

export type NewCartLine = Omit<CartLine, 'key'>

interface CartState {
  lines: CartLine[]
  totalQty: number
  totalAmount: number
  addLine: (line: NewCartLine) => void
  setQty: (key: string, qty: number) => void
  removeLine: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartState | undefined>(undefined)
const DEFAULT_STORAGE_KEY = 'h2_cart'

/** Two lines merge only if the same product, toppings (name + qty), and note. */
function makeKey(line: Pick<NewCartLine, 'menuItemId' | 'toppings' | 'note'>): string {
  const toppings = [...line.toppings.map((t) => `${t.name}x${t.qty}`)].sort().join(',')
  return `${line.menuItemId}|${toppings}|${line.note.trim()}`
}

export function lineTotal(line: CartLine): number {
  const unit = line.basePrice + line.toppings.reduce((s, t) => s + t.price * t.qty, 0)
  return unit * line.qty
}

/**
 * A cart scoped to `storageKey`. The F&B menu and the rental page each mount
 * their own provider with a distinct key, so their carts stay independent.
 */
export function CartProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  children: ReactNode
  storageKey?: string
}) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as CartLine[]
      // Migrate carts saved before per-topping quantities existed.
      return parsed.map((l) => ({
        ...l,
        toppings: (l.toppings ?? []).map((t) => ({ ...t, qty: t.qty ?? 1 })),
      }))
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(lines))
  }, [storageKey, lines])

  function addLine(input: NewCartLine) {
    const key = makeKey(input)
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key)
      if (existing) {
        const qty = Math.min(existing.qty + input.qty, input.maxQty || 99)
        return prev.map((l) => (l.key === key ? { ...l, qty } : l))
      }
      return [...prev, { ...input, key }]
    })
  }

  function setQty(key: string, qty: number) {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, l.maxQty || 99) } : l)),
    )
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  function clear() {
    setLines([])
  }

  const totalQty = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines])
  const totalAmount = useMemo(() => lines.reduce((s, l) => s + lineTotal(l), 0), [lines])

  return (
    <CartContext.Provider
      value={{ lines, totalQty, totalAmount, addLine, setQty, removeLine, clear }}
    >
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
