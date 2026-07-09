import { apiFetch } from './client'

/** Ask the backend to send a test message to the configured Discord webhook. */
export async function testDiscord(): Promise<{ ok: boolean; message: string }> {
  return apiFetch('/admin/notifications/test', { method: 'POST' })
}
