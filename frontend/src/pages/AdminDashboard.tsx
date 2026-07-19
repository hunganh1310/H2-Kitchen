import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword } from '../api/auth'
import { testDiscord } from '../api/diagnostics'
import { getAdminDiscountCode, type AdminDiscountCode } from '../api/discount'
import { ApiError } from '../api/client'
import KitchenToggle from '../components/KitchenToggle'
import { useAuth } from '../context/AuthContext'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pwOpen, setPwOpen] = useState(false)
  const [testingDiscord, setTestingDiscord] = useState(false)
  const [discordResult, setDiscordResult] = useState<{ ok: boolean; text: string } | null>(null)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleTestDiscord() {
    setTestingDiscord(true)
    setDiscordResult(null)
    try {
      const res = await testDiscord()
      setDiscordResult({ ok: true, text: res.message })
    } catch (err) {
      setDiscordResult({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Gửi thất bại.',
      })
    } finally {
      setTestingDiscord(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-display tracking-tight">
            H<span className="text-indigo-400">2</span> Kitchen
            <span className="ml-2 align-middle text-xs font-medium text-neutral-500">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <KitchenToggle />
            <button
              type="button"
              onClick={handleTestDiscord}
              disabled={testingDiscord}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-indigo-400 hover:text-indigo-400 disabled:opacity-50"
            >
              {testingDiscord ? 'Đang gửi…' : 'Kiểm tra Discord'}
            </button>
            <button
              type="button"
              onClick={() => setPwOpen(true)}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-indigo-400 hover:text-indigo-400"
            >
              Đổi mật khẩu
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-indigo-400 hover:text-indigo-400"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-10">
        <h1 className="text-3xl font-bold">Xin chào, {user?.name} 👋</h1>
        <p className="mt-2 text-neutral-400">
          Đăng nhập với tài khoản{' '}
          <span className="font-mono text-indigo-300">{user?.username}</span> · quyền{' '}
          <span className="font-mono text-indigo-300">{user?.role}</span>
        </p>

        {discordResult && (
          <div
            className={`mt-4 flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm ${
              discordResult.ok
                ? 'bg-green-500/10 text-green-300'
                : 'bg-red-950/60 text-red-300'
            }`}
          >
            <span>
              {discordResult.ok ? '✓ ' : '✗ '}
              {discordResult.text}
            </span>
            <button
              type="button"
              onClick={() => setDiscordResult(null)}
              className="shrink-0 text-neutral-500 hover:text-neutral-300"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        )}

        <DiscountCard />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {([
            { label: 'Đơn hàng', to: '/admin/orders', hint: 'Xem & xử lý đơn, đóng/mở bếp' },
            { label: 'Quản lý menu', to: '/admin/menu', hint: 'Đồ đóng chai / chế biến, topping, tồn kho' },
            { label: 'Cho thuê đồ', to: '/admin/rental', hint: 'Đàn, IEM… — trang /renting' },
            { label: 'Quảng cáo', to: '/admin/ads', hint: 'Banner trang chủ & popup' },
            { label: 'Thống kê', hint: 'Sắp ra mắt' },
          ] as const).map((card) => {
            const inner = (
              <>
                <div className="text-sm font-semibold text-neutral-300">{card.label}</div>
                <div className="mt-1 text-xs text-neutral-500">{card.hint}</div>
              </>
            )
            return 'to' in card ? (
              <Link
                key={card.label}
                to={card.to}
                className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-indigo-400/60"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={card.label}
                className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5"
              >
                {inner}
              </div>
            )
          })}
        </div>
      </main>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  )
}

function DiscountCard() {
  const [data, setData] = useState<AdminDiscountCode | null>(null)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [remaining, setRemaining] = useState('')

  async function load() {
    try {
      setData(await getAdminDiscountCode())
      setError(false)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Countdown to the next rotation; reload the code when it expires.
  useEffect(() => {
    if (!data) return
    const until = new Date(data.valid_until).getTime()
    const tick = () => {
      const ms = until - Date.now()
      if (ms <= 0) {
        setRemaining('Đang đổi mã…')
        load()
        return
      }
      const h = Math.floor(ms / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      const s = Math.floor((ms % 60_000) / 1000)
      setRemaining(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [data])

  async function copy() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — the code is visible to copy manually */
    }
  }

  if (error) {
    return (
      <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 text-sm text-neutral-500">
        Không tải được mã giảm giá.
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-neutral-300">Mã giảm giá khách quen</div>
          <p className="mt-1 text-xs text-neutral-500">
            {data
              ? `Giảm ${data.prepared_percent}% đồ chế biến · ${data.bottled_percent}% đồ đóng chai · đổi mã mỗi ${data.rotates_every_hours}h`
              : 'Đang tải…'}
          </p>
          {data && (
            <p className="mt-1 text-xs text-neutral-500">
              Đổi mã sau: <span className="font-mono text-neutral-300">{remaining}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-neutral-950 px-4 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-indigo-300">
            {data?.code ?? '••••••'}
          </span>
          <button
            type="button"
            onClick={copy}
            disabled={!data}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-indigo-400 hover:text-indigo-400 disabled:opacity-50"
          >
            {copied ? '✓ Đã chép' : 'Sao chép'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw.length < 4) return setError('Mật khẩu tối thiểu 4 ký tự.')
    if (pw !== confirm) return setError('Mật khẩu nhập lại không khớp.')
    setSaving(true)
    try {
      await changePassword(pw)
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đổi mật khẩu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Đổi mật khẩu</h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            ✕
          </button>
        </div>

        {done ? (
          <p className="rounded-lg bg-green-500/15 px-3 py-2 text-sm text-green-300">
            ✓ Đã đổi mật khẩu.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">Mật khẩu mới</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoFocus
                className="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">
                Nhập lại mật khẩu
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-indigo-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-indigo-300 disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Cập nhật'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
