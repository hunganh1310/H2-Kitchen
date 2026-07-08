import { apiFetch, getToken } from './client'

export type Category = 'food' | 'drink'

export interface Topping {
  name: string
  price: number
}

export interface MenuItem {
  id: string
  name: string
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
  category: Category
  price: number
  description?: string
  image_url?: string | null
  quantity?: number
  is_available?: boolean
  toppings?: Topping[]
}

// --- Public (customer) ---------------------------------------------------

export async function getPublicMenu(category?: Category): Promise<MenuItem[]> {
  const qs = category ? `?category=${category}` : ''
  return apiFetch<MenuItem[]>(`/menu${qs}`)
}

// --- Admin ---------------------------------------------------------------

export async function adminListMenu(): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>('/admin/menu-items')
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
