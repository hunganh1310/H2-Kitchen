import { apiFetch, getToken } from './client'

/** Product kind: food & drink, or rental gear. */
export type Kind = 'fnb' | 'rental'
/** F&B category: đồ đóng chai (bottled) or đồ chế biến (prepared). */
export type FnbCategory = 'bottled' | 'prepared'
/** For rentals `category` is a free admin-defined group name, hence `string`. */
export type Category = string

export const FNB_CATEGORY_LABEL: Record<FnbCategory, string> = {
  prepared: 'Đồ chế biến',
  bottled: 'Đồ đóng chai',
}

export interface Topping {
  name: string
  price: number
}

export interface MenuItem {
  id: string
  name: string
  kind: Kind
  category: Category
  price: number
  description: string
  image_url: string | null
  quantity: number
  is_available: boolean
  toppings: Topping[]
  in_stock: boolean
}

export interface MenuItemInput {
  name: string
  kind?: Kind
  category: Category
  price: number
  description?: string
  image_url?: string | null
  quantity?: number
  is_available?: boolean
  toppings?: Topping[]
}

// --- Public (customer) ---------------------------------------------------

export async function getPublicMenu(kind: Kind = 'fnb', category?: Category): Promise<MenuItem[]> {
  const params = new URLSearchParams({ kind })
  if (category) params.set('category', category)
  return apiFetch<MenuItem[]>(`/menu?${params.toString()}`)
}

// --- Admin ---------------------------------------------------------------

export async function adminListMenu(kind?: Kind): Promise<MenuItem[]> {
  const qs = kind ? `?kind=${kind}` : ''
  return apiFetch<MenuItem[]>(`/admin/menu-items${qs}`)
}

export async function createMenuItem(input: MenuItemInput): Promise<MenuItem> {
  return apiFetch<MenuItem>('/admin/menu-items', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateMenuItem(
  id: string,
  patch: Partial<MenuItemInput>,
): Promise<MenuItem> {
  return apiFetch<MenuItem>(`/admin/menu-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteMenuItem(id: string): Promise<void> {
  return apiFetch<void>(`/admin/menu-items/${id}`, { method: 'DELETE' })
}

/** Upload a product image (multipart). Returns the updated item with image_url. */
export async function uploadMenuImage(id: string, file: File): Promise<MenuItem> {
  const form = new FormData()
  form.append('file', file)
  // Don't set Content-Type — the browser adds the multipart boundary.
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
  const token = getToken()
  const res = await fetch(`${API_URL}/admin/menu-items/${id}/image`, {
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
  return (await res.json()) as MenuItem
}
