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
        className="relative w-full max-w-2xl"
        style={{ animation: 'h2-pop 0.25s ease-out' }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Đóng"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-sm text-white shadow-md backdrop-blur-sm transition hover:bg-black/75"
        >
          ✕
        </button>
        <div className="flex flex-col items-center">
          <AdCarousel ad={ad} boxClassName="max-h-[80dvh]" />
          {ad.link_url && (
            <p className="mt-2 w-full text-center text-xs text-neutral-500">
              Bấm vào ảnh để xem thêm →
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
