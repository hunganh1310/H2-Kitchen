import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  adminListOrders,
  adminUpdateOrder,
  STATUS_LABEL,
  type Order,
  type OrderStatus,
} from '../api/orders'
import KitchenToggle from '../components/KitchenToggle'
import { useAuth } from '../context/AuthContext'
import { formatVnd } from '../lib/format'

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-indigo-400/15 text-indigo-300',
  preparing: 'bg-sky-400/15 text-sky-300',
  done: 'bg-green-400/15 text-green-300',
  cancelled: 'bg-neutral-700/40 text-neutral-400',
}

const FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'preparing', label: 'Đang làm' },
  { value: 'done', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

export default function AdminOrders() {
  const { logout } = useAuth()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setOrders(await adminListOrders(filter === 'all' ? undefined : filter))
    } catch {
      /* keep previous list on transient error */
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Poll for new orders / status changes (no websockets in MVP).
  useEffect(() => {
    const id = setInterval(load, 12000)
    return () => clearInterval(id)
  }, [load])

  async function patch(order: Order, patch: Parameters<typeof adminUpdateOrder>[1]) {
    setBusyId(order.id)
    try {
      const updated = await adminUpdateOrder(order.id, patch)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    } catch {
      alert('Cập nhật thất bại.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="text-lg font-display tracking-tight">
              H<span className="text-indigo-400">2</span> Kitchen
              <span className="ml-2 text-xs font-medium text-neutral-500">ADMIN</span>
            </div>
            <nav className="hidden text-sm text-neutral-400 sm:block">
              <Link to="/admin" className="hover:text-indigo-400">
                Dashboard
              </Link>
              <span className="mx-2 text-neutral-700">/</span>
              <Link to="/admin/menu" className="hover:text-indigo-400">
                Menu
              </Link>
              <span className="mx-2 text-neutral-700">/</span>
              <span className="text-neutral-200">Đơn hàng</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <KitchenToggle />
            <button
              onClick={logout}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-indigo-400 hover:text-indigo-400"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Đơn hàng</h1>
          <button onClick={load} className="text-sm text-neutral-400 hover:text-indigo-400">
            ↻ Làm mới
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                filter === f.value
                  ? 'bg-indigo-400 font-semibold text-neutral-950'
                  : 'border border-neutral-800 text-neutral-400 hover:border-neutral-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-neutral-500">Đang tải…</p>
        ) : orders.length === 0 ? (
          <p className="py-12 text-center text-neutral-500">Không có đơn nào.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                busy={busyId === o.id}
                onPatch={(p) => patch(o, p)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function OrderCard({
  order,
  busy,
  onPatch,
}: {
  order: Order
  busy: boolean
  onPatch: (p: Parameters<typeof adminUpdateOrder>[1]) => void
}) {
  const time = new Date(order.created_at).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const paid = order.payment_status === 'paid'

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono font-bold tracking-wider text-indigo-400">
            {order.order_code}
          </span>
          <span className="ml-2 text-xs text-neutral-500">{time}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <p className="mt-1 text-sm text-neutral-300">
        {order.customer_name} · <span className="text-neutral-400">Phòng {order.room_number}</span>
        {order.phone ? <span className="text-neutral-500"> · {order.phone}</span> : null}
      </p>

      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((it, i) => (
          <li key={i} className="text-neutral-300">
            <span className="text-neutral-500">{it.qty}×</span> {it.name}
            {it.toppings.length > 0 && (
              <span className="text-neutral-500"> (+{it.toppings.map((t) => t.name).join(', ')})</span>
            )}
            {it.note && <span className="italic text-indigo-300/80"> — “{it.note}”</span>}
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t border-neutral-800 pt-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-indigo-400">{formatVnd(order.total)}</span>
          <button
            type="button"
            onClick={() => onPatch({ payment_status: paid ? 'unpaid' : 'paid' })}
            disabled={busy}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
              paid
                ? 'bg-green-500/15 text-green-300 hover:bg-green-500/25'
                : 'border border-neutral-700 text-neutral-400 hover:border-neutral-500'
            }`}
          >
            {paid ? '✓ Đã thu tiền' : 'Chưa thu tiền'}
          </button>
        </div>
        {order.payment_method === 'vietqr' && !paid && (
          <p className="mt-1.5 text-xs text-neutral-400">
            Chờ chuyển khoản{' '}
            <span className="font-mono font-semibold text-indigo-300">
              {formatVnd(order.transfer_amount)}
            </span>{' '}
            <span className="text-neutral-600">— tự động xác nhận, hoặc thu tay bên phải</span>
          </p>
        )}
      </div>

      {/* Status actions */}
      {order.status !== 'done' && order.status !== 'cancelled' && (
        <div className="mt-3 flex gap-2">
          {order.status === 'pending' && (
            <button
              onClick={() => onPatch({ status: 'preparing' })}
              disabled={busy}
              className="flex-1 rounded-lg bg-sky-500/90 px-3 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-sky-400 disabled:opacity-50"
            >
              Nhận làm
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              onClick={() => onPatch({ status: 'done' })}
              disabled={busy}
              className="flex-1 rounded-lg bg-green-500/90 px-3 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-green-400 disabled:opacity-50"
            >
              Hoàn thành
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Huỷ đơn ${order.order_code}?`)) onPatch({ status: 'cancelled' })
            }}
            disabled={busy}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-red-400 hover:text-red-400 disabled:opacity-50"
          >
            Huỷ
          </button>
        </div>
      )}
    </div>
  )
}
