import { useEffect, useState } from 'react'
import { getAds, type Ad } from '../api/ads'
import AdCarousel from './AdCarousel'

const SEEN_KEY = 'h2_popup_seen' // once per browser session (sessionStorage)

/**
 * Welcome popup ad — shown when a visitor arrives, only if an admin has created
 * an active "popup" ad. No ad → renders nothing. Display frequency is set per ad:
 *   - "session" → once per browser session (tracked in sessionStorage)
 *   - "always"  → on every page load / refresh (no memory)
 */
export default function AdPopup() {
  const [ad, setAd] = useState<Ad | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAds('popup')
      .then((ads) => {
        if (cancelled || ads.length === 0) return
        const first = ads[0]
        // "always" ignores the once-per-session guard entirely.
        if (first.popup_frequency !== 'always' && sessionStorage.getItem(SEEN_KEY)) return
        setAd(first)
        setOpen(true)
      })
      .catch(() => {
        /* ignore — a failed ad fetch must never block the page */
      })
    return () => {
      cancelled = true
    }
  }, [])

  function close() {
    // Only remember the dismissal for session-frequency popups.
    if (ad?.popup_frequency !== 'always') sessionStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }

  if (!open || !ad) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md"
        style={{ animation: 'h2-pop 0.25s ease-out' }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Đóng"
          className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 shadow-lg transition hover:text-white"
        >
          ✕
        </button>
        <AdCarousel ad={ad} />
        {ad.link_url && (
          <p className="mt-2 text-center text-xs text-neutral-500">Bấm vào ảnh để xem thêm →</p>
        )}
      </div>
    </div>
  )
}
