import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatVnd } from '../lib/format'

/** Fixed bottom bar shown when the cart has items (mobile-first). */
export default function CartBar() {
  const { totalQty, totalAmount } = useCart()
  if (totalQty === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-900/95 p-3 backdrop-blur">
      <Link
        to="/cart"
        className="mx-auto flex max-w-3xl items-center justify-between rounded-xl bg-indigo-400 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-indigo-300"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-neutral-950 px-1.5 text-xs text-indigo-400">
            {totalQty}
          </span>
          Xem giỏ hàng
        </span>
        <span>{formatVnd(totalAmount)}</span>
      </Link>
    </div>
  )
}
