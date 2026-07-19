import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { cancelOrder, getOrder, STATUS_LABEL, type Order, type OrderStatus } from '../api/orders'
import { ApiError } from '../api/client'
import PaymentSection from '../components/PaymentSection'
import { useCart } from '../context/CartContext'
import { formatVnd } from '../lib/format'

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-indigo-400/15 text-indigo-300',
  preparing: 'bg-sky-400/15 text-sky-300',
  done: 'bg-green-400/15 text-green-300',
  cancelled: 'bg-neutral-700/40 text-neutral-400',
}

export default function OrderPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { addLine } = useCart()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setOrder(await getOrder(code))
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? 'Không tìm thấy đơn hàng.' : 'Lỗi tải đơn.')
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    load()
  }, [load])

  // Auto-refresh while the order is still in progress OR awaiting payment
  // (so an auto-confirmed transfer flips to "Đã thanh toán" without a refresh).
  useEffect(() => {
    if (!order || order.status === 'cancelled') return
    const inProgress = order.status === 'pending' || order.status === 'preparing'
    const awaitingPayment = order.payment_status === 'unpaid'
    if (!inProgress && !awaitingPayment) return
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [order, load])

  async function handleCancel() {
    if (!confirm('Huỷ đơn này?')) return
    setBusy(true)
    try {
      setOrder(await cancelOrder(code))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Huỷ thất bại.')
    } finally {
      setBusy(false)
    }
  }

  // Reorder restores into the F&B cart (this page is under the F&B provider),
  // so only F&B lines are re-added. Rental orders show a "Thuê lại" link instead.
  function handleReorder() {
    if (!order) return
    for (const it of order.items) {
      if (it.kind !== 'fnb') continue
      const toppingSum = it.toppings.reduce((s, t) => s + t.price * t.qty, 0)
      addLine({
        menuItemId: it.menu_item_id,
        name: it.name,
        kind: 'fnb',
        category: it.category ?? 'prepared',
        basePrice: it.unit_price - toppingSum,
        toppings: it.toppings.map((t) => ({ name: t.name, price: t.price, qty: t.qty })),
        note: it.note ?? '',
        qty: it.qty,
        maxQty: 99,
      })
    }
    navigate('/cart')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-900 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/order" className="text-neutral-400 hover:text-indigo-400">
            ← Menu
          </Link>
          <h1 className="text-lg font-bold">Chi tiết đơn</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading && <p className="text-neutral-500">Đang tải…</p>}
        {error && !loading && (
          <div className="py-12 text-center">
            <p className="text-neutral-400">{error}</p>
            <Link to="/orders" className="mt-4 inline-block text-indigo-400 hover:underline">
              Xem đơn của tôi
            </Link>
          </div>
        )}

        {order && (
          <div className="space-y-5">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500">Mã đơn</p>
                  <p className="font-mono text-lg font-bold tracking-wider text-indigo-400">
                    {order.order_code}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[order.status]}`}
                >
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-400">
                {order.customer_name} · Phòng {order.room_number}
                {order.phone ? ` · ${order.phone}` : ''}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Thanh toán:{' '}
                {order.payment_method === 'vietqr' ? 'Chuyển khoản' : 'Tiền mặt'} ·{' '}
                {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </p>
            </div>

            <PaymentSection order={order} />

            <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/50">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="text-neutral-500">{it.qty}×</span> {it.name}
                    </p>
                    {it.toppings.length > 0 && (
                      <p className="mt-0.5 text-xs text-neutral-400">
                        + {it.toppings.map((t) => (t.qty > 1 ? `${t.qty}× ${t.name}` : t.name)).join(', ')}
                      </p>
                    )}
                    {it.note && <p className="mt-0.5 text-xs italic text-neutral-500">“{it.note}”</p>}
                  </div>
                  <span className="shrink-0 text-sm text-indigo-300">{formatVnd(it.price)}</span>
                </li>
              ))}
              {order.discount_amount > 0 && (
                <>
                  <li className="flex justify-between px-4 pt-4 text-sm text-neutral-400">
                    <span>Tạm tính</span>
                    <span>{formatVnd(order.subtotal)}</span>
                  </li>
                  <li className="flex justify-between px-4 pt-1 text-sm text-green-400">
                    <span>Giảm giá{order.discount_code ? ` (${order.discount_code})` : ''}</span>
                    <span>−{formatVnd(order.discount_amount)}</span>
                  </li>
                </>
              )}
              <li className="flex justify-between p-4 font-bold">
                <span>Tổng cộng</span>
                <span className="text-indigo-400">{formatVnd(order.total)}</span>
              </li>
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row">
              {order.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={busy}
                  className="rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-neutral-300 transition hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                >
                  Huỷ đơn
                </button>
              )}
              {order.kind === 'rental' ? (
                <Link
                  to="/renting"
                  className="flex-1 rounded-xl bg-indigo-400 px-5 py-3 text-center font-semibold text-neutral-950 transition hover:bg-indigo-300"
                >
                  Thuê lại
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleReorder}
                  className="flex-1 rounded-xl bg-indigo-400 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-indigo-300"
                >
                  Đặt lại
                </button>
              )}
            </div>

            {order.status === 'preparing' && (
              <p className="text-center text-xs text-neutral-600">
                Đơn đang được làm — không thể tự huỷ. Cần gấp vui lòng liên hệ quầy.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
