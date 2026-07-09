import { useEffect, useState } from 'react'
import { aspectCss, type Ad, type AdMedia } from '../api/ads'

/**
 * Renders a single ad: one or more media (images/videos) laid out at the ad's
 * chosen aspect ratio, responsive to any width. Multiple media auto-advance as
 * a small carousel. Clicking opens the ad's link in a new tab.
 */
export default function AdCarousel({
  ad,
  rounded = 'rounded-2xl',
  autoAdvanceMs = 4500,
}: {
  ad: Ad
  rounded?: string
  autoAdvanceMs?: number
}) {
  const [idx, setIdx] = useState(0)
  const media = ad.media ?? []
  const count = media.length

  useEffect(() => {
    if (count <= 1) return
    const id = setInterval(() => setIdx((i) => (i + 1) % count), autoAdvanceMs)
    return () => clearInterval(id)
  }, [count, autoAdvanceMs])

  if (count === 0) return null

  const content = (
    <>
      <div
        className={`relative w-full overflow-hidden border border-neutral-800 bg-neutral-900 ${rounded}`}
        style={{ aspectRatio: aspectCss(ad.aspect_ratio) }}
      >
        {media.map((m, i) => (
          <MediaLayer key={i} media={m} active={i === idx} alt={ad.caption || ad.title} />
        ))}

        {count > 1 && (
          <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ảnh ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault()
                  setIdx(i)
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {ad.caption && (
        <p className="mt-2 w-full text-center text-sm font-medium text-neutral-300 transition-colors group-hover:text-indigo-300">
          {ad.caption}
        </p>
      )}
    </>
  )

  if (!ad.link_url) return <div>{content}</div>

  return (
    <a
      href={ad.link_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block transition-transform hover:-translate-y-0.5"
      aria-label={ad.caption || ad.title || 'Quảng cáo'}
    >
      {content}
    </a>
  )
}

function MediaLayer({ media, active, alt }: { media: AdMedia; active: boolean; alt: string }) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {media.type === 'video' ? (
        <video
          src={media.url}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <img src={media.url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      )}
    </div>
  )
}
