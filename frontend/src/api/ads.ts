import { apiFetch, getToken } from './client'

export type AdPlacement = 'landing' | 'popup'
export type AdMediaType = 'image' | 'video'
export type AdAspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9'
/** How often a popup ad reappears: once per session, or on every refresh. */
export type AdPopupFrequency = 'session' | 'always'

export const ASPECT_RATIOS: AdAspectRatio[] = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9']

export interface AdMedia {
  type: AdMediaType
  url: string
}

export interface Ad {
  id: string
  title: string
  placement: AdPlacement
  media: AdMedia[]
  aspect_ratio: AdAspectRatio
  link_url: string
  is_active: boolean
  sort_order: number
  popup_frequency: AdPopupFrequency
  created_at: string
}

export interface AdInput {
  title?: string
  placement?: AdPlacement
  media?: AdMedia[]
  aspect_ratio?: AdAspectRatio
  link_url?: string
  is_active?: boolean
  sort_order?: number
  popup_frequency?: AdPopupFrequency
}

/** CSS aspect-ratio value ("16:9" -> "16 / 9") for inline styles. */
export function aspectCss(ratio: AdAspectRatio): string {
  return ratio.replace(':', ' / ')
}

// --- Public (customer) ---------------------------------------------------

export async function getAds(placement?: AdPlacement): Promise<Ad[]> {
  const qs = placement ? `?placement=${placement}` : ''
  return apiFetch<Ad[]>(`/ads${qs}`)
}

// --- Admin ---------------------------------------------------------------

export async function adminListAds(): Promise<Ad[]> {
  return apiFetch<Ad[]>('/admin/ads')
}

export async function createAd(input: AdInput): Promise<Ad> {
  return apiFetch<Ad>('/admin/ads', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateAd(id: string, patch: AdInput): Promise<Ad> {
  return apiFetch<Ad>(`/admin/ads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function deleteAd(id: string): Promise<void> {
  return apiFetch<void>(`/admin/ads/${id}`, { method: 'DELETE' })
}

/** Upload an image/video to Cloudinary; returns its hosted URL + detected type. */
export async function uploadAdMedia(file: File): Promise<AdMedia> {
  const form = new FormData()
  form.append('file', file)
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
  const token = getToken()
  const res = await fetch(`${API_URL}/admin/ads/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      if (data?.detail) detail = data.detail
    } catch {
      /* keep statusText */
    }
    throw new Error(detail)
  }
  return (await res.json()) as AdMedia
}
