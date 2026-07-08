import { apiFetch, clearToken, setToken } from './client'

export interface Admin {
  id: string
  username: string
  name: string
  role: 'admin'
}

interface TokenResponse {
  access_token: string
  token_type: string
}

/** Log in with admin credentials, store the JWT, and return the admin profile. */
export async function login(username: string, password: string): Promise<Admin> {
  const { access_token } = await apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(access_token)
  return getMe()
}

/** Fetch the currently authenticated admin from the stored token. */
export async function getMe(): Promise<Admin> {
  return apiFetch<Admin>('/auth/me')
}

export function logout(): void {
  clearToken()
}

/** Change the current admin's password (no old password required). */
export async function changePassword(newPassword: string): Promise<void> {
  await apiFetch<void>('/admin/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ new_password: newPassword }),
  })
}
