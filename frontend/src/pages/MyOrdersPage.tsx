import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyOrders } from '../lib/orders-store'
import { formatVnd } from '../lib/format'

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const orders = getMyOrders()
  const [code, setCode] = useState('')

  function handleLookup(e: FormEvent) {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (c) navigate(`/order/${c}`)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-900 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link to="/order" className="text-neutral-400 hover:text-indigo-400">
            ← Menu
          </Link>
          <h1 className="text-lg font-bold">Đơn của tôi</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={handleLookup} className="mb-6 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Nhập mã đơn (VD: H2ABC123)"
            className="input font-mono uppercase"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-indigo-400 px-4 py-2 font-semibold text-neutral-950 hover:bg-indigo-300"
          >
            Tra cứu
          </button>
        </form>

        <h2 className="mb-2 text-sm font-medium text-neutral-400">Đơn đã đặt trên thiết bị này</h2>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-neutral-500">Chưa có đơn nào.</p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.code}>
                <Link
                  to={`/order/${o.code}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-700"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-100">
                      {o.summary || o.name || o.code}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                      <span className="font-mono tracking-wider text-indigo-400">{o.code}</span>
                      <span>·</span>
                      <span>{new Date(o.createdAt).toLocaleString('vi-VN')}</span>
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">{formatVnd(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
