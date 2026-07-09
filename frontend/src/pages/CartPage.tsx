import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkout, type PaymentMethod } from '../api/orders'
import { getKitchenStatus } from '../api/kitchen'
import { ApiError } from '../api/client'
import { lineTotal, useCart } from '../context/CartContext'
import { addMyOrder } from '../lib/orders-store'
import { formatVnd } from '../lib/format'

const ROOM_OPTIONS = ['Phòng chờ (200)', 'Phòng tập chính (201)', 'Smoking Area (400)']

export default function CartPage() {
  const { lines, totalAmount, setQty, removeLine, clear } = useCart()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [room, setRoom] = useState(ROOM_OPTIONS[0])
  const [phone, setPhone] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('vietqr')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kitchenOpen, setKitchenOpen] = useState(true)

  useEffect(() => {
    getKitchenStatus()
      .then((s) => setKitchenOpen(s.is_open))
      .catch(() => setKitchenOpen(true))
  }, [])

  // Closing the kitchen only blocks food; a drinks-only cart can still order.
  const hasFood = lines.some((l) => l.category === 'food')
  const blockedByKitchen = !kitchenOpen && hasFood

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Vui lòng nhập tên.')
    if (!room.trim()) return setError('Vui lòng nhập số phòng.')
    if (lines.length === 0) return setError('Giỏ hàng đang trống.')

    setSubmitting(true)
    try {
      const order = await checkout({
        customer_name: name.trim(),
        room_number: room.trim(),
        phone: phone.trim() || null,
        payment_method: payment,
        items: lines.map((l) => ({
          menu_item_id: l.menuItemId,
          qty: l.qty,
          toppings: l.toppings.map((t) => ({ name: t.name, qty: t.qty })),
          note: l.note || null,
        })),
      })
      addMyOrder({
        code: order.order_code,
        createdAt: order.created_at,
        total: order.total,
        name: order.customer_name,
        summary: order.items.map((it) => `${it.qty} ${it.name}`).join(', '),
      })
      clear()
      navigate(`/order/${order.order_code}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đặt đơn thất bại, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-900 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/order" className="text-neutral-400 hover:text-indigo-400">
            ← Menu
          </Link>
          <h1 className="text-lg font-bold">Giỏ hàng</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {lines.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-neutral-400">Giỏ hàng đang trống.</p>
            <Link
              to="/order"
              className="mt-4 inline-block rounded-lg bg-indigo-400 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-indigo-300"
            >
              Chọn món
            </Link>
          </div>
        ) : (
          <>
            {/* Cart lines */}
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.key} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{l.name}</p>
                      {l.toppings.length > 0 && (
                        <p className="mt-0.5 text-xs text-neutral-400">
                          + {l.toppings.map((t) => (t.qty > 1 ? `${t.qty}× ${t.name}` : t.name)).join(', ')}
                        </p>
                      )}
                      {l.note && <p className="mt-0.5 text-xs italic text-neutral-500">“{l.note}”</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="shrink-0 text-sm text-neutral-500 hover:text-red-400"
                    >
                      Xoá
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQty(l.key, l.qty - 1)}
                        className="h-8 w-8 rounded-lg border border-neutral-700 text-lg leading-none hover:border-neutral-500"
                        aria-label="Giảm"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-semibold">{l.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(l.key, l.qty + 1)}
                        className="h-8 w-8 rounded-lg border border-neutral-700 text-lg leading-none hover:border-neutral-500"
                        aria-label="Tăng"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-semibold text-indigo-400">{formatVnd(lineTotal(l))}</span>
                  </div>
                </li>
              ))}
            </ul>

            {blockedByKitchen && (
              <div className="mt-6 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
                🍜 <span className="font-semibold">Bếp đang đóng</span> — hiện chỉ nhận đồ uống. Vui
                lòng bỏ món ăn khỏi giỏ hoặc quay lại sau.
              </div>
            )}

            {/* Checkout form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <h2 className="text-base font-bold">Thông tin nhận món</h2>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-400">
                  Tên của bạn <span className="text-indigo-400">*</span>
                </label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
              </div>
              <div>
                <label htmlFor="room" className="mb-1 block text-xs font-medium text-neutral-400">
                  Số phòng đang tập <span className="text-indigo-400">*</span>
                </label>
                <select
                  id="room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="input"
                >
                  {ROOM_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-400">
                  Số điện thoại (tuỳ chọn)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  className="input"
                />
              </div>

              <div>
                <span className="mb-1 block text-xs font-medium text-neutral-400">
                  Hình thức thanh toán
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['vietqr', 'cash'] as PaymentMethod[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPayment(m)}
                      className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                        payment === m
                          ? 'border-indigo-400 bg-indigo-400/10 text-indigo-300'
                          : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      {m === 'vietqr' ? 'Chuyển khoản (QR)' : 'Tiền mặt'}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  {payment === 'vietqr'
                    ? 'Sau khi đặt, mã QR chuyển khoản (đã điền sẵn số tiền + nội dung) sẽ hiện ra để bạn thanh toán.'
                    : 'Bạn sẽ trả tiền mặt tại quầy khi nhận món.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                <span className="text-neutral-400">Tổng cộng</span>
                <span className="text-xl font-bold text-indigo-400">{formatVnd(totalAmount)}</span>
              </div>

              {error && (
                <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || blockedByKitchen}
                className="w-full rounded-xl bg-indigo-400 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-indigo-300 disabled:opacity-50"
              >
                {blockedByKitchen ? 'Bếp đóng — bỏ món ăn để đặt' : submitting ? 'Đang đặt đơn…' : 'Đặt đơn'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
