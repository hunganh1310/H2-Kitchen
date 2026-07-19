import type { MenuItem } from '../api/menu'
import { formatVnd } from '../lib/format'

/** Emoji fallback icon for a product without an image. */
export function productIcon(item: Pick<MenuItem, 'kind' | 'category'>): string {
  if (item.kind === 'rental') return '🎸'
  return item.category === 'prepared' ? '🍜' : '🥤'
}

/** Product tile used on the customer menu + rental pages. */
export default function MenuCard({
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
          <span className="text-3xl">{productIcon(item)}</span>
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
