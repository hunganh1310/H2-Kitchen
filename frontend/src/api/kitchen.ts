import { apiFetch } from './client'

export interface KitchenStatus {
  is_open: boolean
  updated_at: string | null
  updated_by?: string | null
}

export async function getKitchenStatus(): Promise<KitchenStatus> {
  return apiFetch<KitchenStatus>('/kitchen-status')
}

export async function adminGetKitchenStatus(): Promise<KitchenStatus> {
  return apiFetch<KitchenStatus>('/admin/kitchen-status')
}

export async function adminSetKitchenStatus(is_open: boolean): Promise<KitchenStatus> {
  return apiFetch<KitchenStatus>('/admin/kitchen-status', {
    method: 'PATCH',
    body: JSON.stringify({ is_open }),
  })
}
