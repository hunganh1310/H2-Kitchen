import { useState } from 'react'
import type { MenuItem } from '../api/menu'
import { useCart, type CartTopping } from '../context/CartContext'
import { formatVnd } from '../lib/format'

export default function ProductModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { addLine } = useCart()
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)

  const chosen: CartTopping[] = item.toppings.filter((t) => selected[t.name])
  const unit = item.price + chosen.reduce((s, t) => s + t.price, 0)
  const soldOut = !item.in_stock

  function toggle(name: string) {
    setSelected((s) => ({ ...s, [name]: !s[name] }))
  }

  function handleAdd() {
    addLine({
      menuItemId: item.id,
      name: item.name,
      category: item.category,
      basePrice: item.price,
      toppings: chosen,
      note: note.trim(),
      qty,
      maxQty: item.quantity,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-neutral-800 bg-neutral-950 sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex h-40 items-center justify-center bg-neutral-800/60">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl">{item.category === 'food' ? '🍜' : '🥤'}</span>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{item.name}</h2>
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
              ✕
            </button>
          </div>
          {item.description && <p className="mt-1 text-sm text-neutral-400">{item.description}</p>}
          <p className="mt-2 font-semibold text-indigo-400">{formatVnd(item.price)}</p>

          {item.toppings.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-neutral-300">Topping</h3>
              <div className="space-y-2">
                {item.toppings.map((t) => (
                  <label
                    key={t.name}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-800 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={!!selected[t.name]}
                        onChange={() => toggle(t.name)}
                        className="h-4 w-4 accent-indigo-400"
                      />
                      {t.name}
                    </span>
                    <span className="text-sm text-neutral-400">+{formatVnd(t.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <label className="mb-1 block text-sm font-semibold text-neutral-300">Ghi chú</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: ít cay, không hành…"
              className="input"
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm text-neutral-400">Số lượng</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-9 w-9 rounded-lg border border-neutral-700 text-lg leading-none hover:border-neutral-500"
                aria-label="Giảm"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(item.quantity || 99, q + 1))}
                className="h-9 w-9 rounded-lg border border-neutral-700 text-lg leading-none hover:border-neutral-500"
                aria-label="Tăng"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-neutral-800 bg-neutral-950 p-4">
          <button
            onClick={handleAdd}
            disabled={soldOut}
            className="flex w-full items-center justify-between rounded-xl bg-indigo-400 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-indigo-300 disabled:opacity-50"
          >
            <span>{soldOut ? 'Hết hàng' : 'Thêm vào giỏ'}</span>
            {!soldOut && <span>{formatVnd(unit * qty)}</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
