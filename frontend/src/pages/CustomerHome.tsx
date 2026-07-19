import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicMenu, FNB_CATEGORY_LABEL, type FnbCategory, type MenuItem } from '../api/menu'
import { getKitchenStatus } from '../api/kitchen'
import CartBar from '../components/CartBar'
import MenuCard from '../components/MenuCard'
import ProductModal from '../components/ProductModal'

// Prepared first (the kitchen's signature items), bottled below.
const SECTION_ORDER: FnbCategory[] = ['prepared', 'bottled']

export default function CustomerHome() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<MenuItem | null>(null)
  const [kitchenOpen, setKitchenOpen] = useState(true)

  useEffect(() => {
    getPublicMenu('fnb')
      .then(setItems)
      .catch(() => setError('Không tải được menu. Vui lòng thử lại.'))
      .finally(() => setLoading(false))
    getKitchenStatus()
      .then((s) => setKitchenOpen(s.is_open))
      .catch(() => setKitchenOpen(true))
  }, [])

  const grouped = useMemo(() => {
    const g: Record<FnbCategory, MenuItem[]> = { prepared: [], bottled: [] }
    for (const item of items) {
      if (item.category === 'prepared' || item.category === 'bottled') g[item.category].push(item)
    }
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
            <span className="font-semibold">đồ đóng chai</span> — tạm không nhận đồ chế biến.
          </div>
        )}
        {loading && <p className="text-neutral-500">Đang tải menu…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-neutral-500">Chưa có món nào trong menu.</p>
        )}

        {SECTION_ORDER.map((cat) =>
          grouped[cat].length === 0 ? null : (
            <section key={cat} className="mb-8">
              <h2 className="mb-3 text-lg font-bold text-indigo-400">{FNB_CATEGORY_LABEL[cat]}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {grouped[cat].map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    disabled={!kitchenOpen && item.category === 'prepared'}
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
