import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in -> straight to the dashboard.
  if (user) return <Navigate to="/admin" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const admin = await login(username.trim(), password)
      // Redirect by role: admin -> /admin (only role today).
      navigate(admin.role === 'admin' ? '/admin' : '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không kết nối được tới máy chủ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-3xl font-display tracking-tight">
            H<span className="text-indigo-400">2</span> Kitchen
          </div>
          <p className="text-sm text-neutral-500">Khu vực quản lý — đăng nhập admin</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl shadow-black/40"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-indigo-300 disabled:opacity-50"
          >
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Khách đặt món không cần đăng nhập —{' '}
          <a href="/order" className="text-neutral-400 underline hover:text-indigo-400">
            về trang đặt món
          </a>
        </p>
      </div>
    </div>
  )
}
