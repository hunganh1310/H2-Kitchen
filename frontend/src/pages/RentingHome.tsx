import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicMenu, type MenuItem } from '../api/menu'
import CartBar from '../components/CartBar'
import MenuCard from '../components/MenuCard'
import ProductModal from '../components/ProductModal'

/**
 * Standalone rental page (`/renting`) — gear for hire (guitar, bass, IEM…).
 * Groups are admin-defined `category` values. Independent from the F&B menu and
 * uses its own cart (mounted with a separate storage key in App.tsx).
 */
export default function RentingHome() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<MenuItem | null>(null)

  useEffect(() => {
    getPublicMenu('rental')
      .then(setItems)
      .catch(() => setError('Không tải được danh sách đồ thuê. Vui lòng thử lại.'))
      .finally(() => setLoading(false))
  }, [])

  // Group by admin-defined category, keeping groups in alphabetical order.
  const groups = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    for (const item of items) {
      const key = item.category || 'Khác'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'))
  }, [items])

  return (
    <div className="min-h-screen bg-neutral-950 pb-24 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-900 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-xl font-display tracking-tight">
            H<span className="text-indigo-400">2</span> Kitchen
            <span className="ml-2 align-middle font-sans text-xs font-medium text-neutral-500">THUÊ ĐỒ</span>
          </span>
          <Link to="/orders" className="text-sm text-neutral-400 hover:text-indigo-400">
            Đơn của tôi
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">Cho thuê thiết bị</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Thuê đàn, tai nghe IEM và thiết bị cho ca tập của bạn.
          </p>
        </div>

        {loading && <p className="text-neutral-500">Đang tải…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-neutral-500">Hiện chưa có đồ cho thuê.</p>
        )}

        {groups.map(([category, groupItems]) => (
          <section key={category} className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-indigo-400">{category}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {groupItems.map((item) => (
                <MenuCard key={item.id} item={item} onSelect={() => setActive(item)} />
              ))}
            </div>
          </section>
        ))}
      </main>

      {active && <ProductModal item={active} onClose={() => setActive(null)} />}
      <CartBar cartPath="/renting/cart" />
    </div>
  )
}
