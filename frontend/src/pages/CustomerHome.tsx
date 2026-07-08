import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicMenu, type Category, type MenuItem } from '../api/menu'
import { getKitchenStatus } from '../api/kitchen'
import CartBar from '../components/CartBar'
import ProductModal from '../components/ProductModal'
import { formatVnd } from '../lib/format'

const CATEGORY_LABEL: Record<Category, string> = {
  food: 'Đồ ăn',
  drink: 'Đồ uống',
}

export default function CustomerHome() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<MenuItem | null>(null)
  const [kitchenOpen, setKitchenOpen] = useState(true)

  useEffect(() => {
    getPublicMenu()
      .then(setItems)
      .catch(() => setError('Không tải được menu. Vui lòng thử lại.'))
      .finally(() => setLoading(false))
    getKitchenStatus()
      .then((s) => setKitchenOpen(s.is_open))
      .catch(() => setKitchenOpen(true))
  }, [])

  const grouped = useMemo(() => {
    const g: Record<Category, MenuItem[]> = { food: [], drink: [] }
    for (const item of items) g[item.category].push(item)
    return g
  }, [items])

  return (
    <div className="min-h-screen bg-neutral-950 pb-24 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-900 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="text-xl font-display tracking-tight">
            H<span className="text-indigo-400">2</span> Kitchen
          </Link>
          <Link to="/orders" className="text-sm text-neutral-400 hover:text-indigo-400">
            Đơn của tôi
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {!kitchenOpen && (
          <div className="mb-5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
            🍜 <span className="font-semibold">Bếp đang đóng.</span> Hiện chỉ nhận{' '}
            <span className="font-semibold">đồ uống</span> — tạm không nhận đồ ăn.
          </div>
        )}
        {loading && <p className="text-neutral-500">Đang tải menu…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-neutral-500">Chưa có món nào trong menu.</p>
        )}

        {(['food', 'drink'] as Category[]).map((cat) =>
          grouped[cat].length === 0 ? null : (
            <section key={cat} className="mb-8">
              <h2 className="mb-3 text-lg font-bold text-indigo-400">{CATEGORY_LABEL[cat]}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {grouped[cat].map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    disabled={!kitchenOpen && item.category === 'food'}
                    onSelect={() => setActive(item)}
                  />
                ))}
              </div>
            </section>
          ),
        )}
      </main>

      {active && <ProductModal item={active} onClose={() => setActive(null)} />}
      <CartBar />
    </div>
  )
}

function MenuCard({
  item,
  disabled,
  onSelect,
}: {
  item: MenuItem
  disabled?: boolean
  onSelect: () => void
}) {
  const soldOut = !item.in_stock
  const blocked = soldOut || !!disabled
  return (
    <button
      type="button"
      onClick={blocked ? undefined : onSelect}
      disabled={blocked}
      className={`flex gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-left transition ${
        blocked ? 'opacity-60' : 'hover:border-neutral-700 active:scale-[0.99]'
      }`}
    >
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-800/60">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl">{item.category === 'food' ? '🍜' : '🥤'}</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{item.name}</h3>
          {soldOut && (
            <span className="shrink-0 rounded bg-red-950/70 px-2 py-0.5 text-[10px] font-semibold text-red-300">
              Hết hàng
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-400">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-indigo-400">{formatVnd(item.price)}</span>
          {!blocked && (
            <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-200">
              + Thêm
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
