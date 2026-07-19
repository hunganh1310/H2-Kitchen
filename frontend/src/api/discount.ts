import { apiFetch } from './client'

export interface DiscountValidation {
  valid: boolean
  prepared_percent: number
  bottled_percent: number
}

export interface AdminDiscountCode extends DiscountValidation {
  code: string
  valid_until: string
  rotates_every_hours: number
}

/** Public — preview whether a code is currently valid + the discount rates. */
export async function validateDiscount(code: string): Promise<DiscountValidation> {
  return apiFetch<DiscountValidation>(`/discount/validate?code=${encodeURIComponent(code)}`)
}

/** Admin — the current rotating code to hand to regular customers. */
export async function getAdminDiscountCode(): Promise<AdminDiscountCode> {
  return apiFetch<AdminDiscountCode>('/admin/discount-code')
}
