import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ASPECT_RATIOS,
  adminListAds,
  createAd,
  deleteAd,
  updateAd,
  uploadAdMedia,
  type Ad,
  type AdAspectRatio,
  type AdInput,
  type AdMedia,
  type AdPlacement,
} from '../api/ads'
import { useAuth } from '../context/AuthContext'

interface FormState {
  title: string
  placement: AdPlacement
  aspect_ratio: AdAspectRatio
  link_url: string
  is_active: boolean
  sort_order: string
  media: AdMedia[]
}

const EMPTY_FORM: FormState = {
  title: '',
  placement: 'landing',
  aspect_ratio: '16:9',
  link_url: '',
  is_active: true,
  sort_order: '0',
  media: [],
}

const PLACEMENT_LABEL: Record<AdPlacement, string> = {
  landing: 'Banner trang chủ',
  popup: 'Popup chào mừng',
}

export default function AdminAds() {
  const { logout } = useAuth()
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null) // null = closed, '' = new
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [urlDraft, setUrlDraft] = useState('')

  async function refresh() {
    setLoading(true)
    try {
      setAds(await adminListAds())
      setError(null)
    } catch {
      setError('Không tải được danh sách quảng cáo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  function openCreate() {
    setForm(EMPTY_FORM)
    setUrlDraft('')
    setEditingId('')
    setFormError(null)
  }

  function openEdit(ad: Ad) {
    setForm({
      title: ad.title,
      placement: ad.placement,
      aspect_ratio: ad.aspect_ratio,
      link_url: ad.link_url,
      is_active: ad.is_active,
      sort_order: String(ad.sort_order),
      media: ad.media.map((m) => ({ ...m })),
    })
    setUrlDraft('')
    setEditingId(ad.id)
    setFormError(null)
  }

  function closeForm() {
    setEditingId(null)
    setFormError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (form.media.length === 0) return setFormError('Cần ít nhất 1 ảnh/video.')

    const payload: AdInput = {
      title: form.title.trim(),
      placement: form.placement,
      aspect_ratio: form.aspect_ratio,
      link_url: form.link_url.trim(),
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      media: form.media,
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateAd(editingId, payload)
      } else {
        await createAd(payload)
      }
      closeForm()
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(ad: Ad) {
    if (!confirm(`Xoá quảng cáo "${ad.title || '(không tên)'}"?`)) return
    try {
      await deleteAd(ad.id)
      await refresh()
    } catch {
      alert('Xoá thất bại.')
    }
  }

  async function toggleActive(ad: Ad) {
    try {
      await updateAd(ad.id, { is_active: !ad.is_active })
      await refresh()
    } catch {
      alert('Cập nhật thất bại.')
    }
  }

  // --- media editor helpers ---
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setFormError(null)
    try {
      for (const file of Array.from(files)) {
        const media = await uploadAdMedia(file)
        setForm((f) => ({ ...f, media: [...f.media, media] }))
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Tải media thất bại.')
    } finally {
      setUploading(false)
      e.target.value = '' // allow re-selecting the same file
    }
  }

  function addUrlMedia() {
    const url = urlDraft.trim()
    if (!url) return
    const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
    setForm((f) => ({ ...f, media: [...f.media, { type: isVideo ? 'video' : 'image', url }] }))
    setUrlDraft('')
  }

  function removeMedia(i: number) {
    setForm((f) => ({ ...f, media: f.media.filter((_, idx) => idx !== i) }))
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="text-lg font-display tracking-tight">
            H<span className="text-indigo-400">2</span> Kitchen
            <span className="ml-2 align-middle text-xs font-medium text-neutral-500">ADMIN</span>
          </div>
          <nav className="text-sm text-neutral-400">
            <Link to="/admin" className="hover:text-indigo-400">
              Dashboard
            </Link>
            <span className="mx-2 text-neutral-700">/</span>
            <span className="text-neutral-200">Quảng cáo</span>
          </nav>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-indigo-400 hover:text-indigo-400"
        >
          Đăng xuất
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Quảng cáo</h1>
          <button
            onClick={openCreate}
            className="rounded-lg bg-indigo-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-indigo-300"
          >
            + Thêm quảng cáo
          </button>
        </div>
        <p className="mb-6 text-sm text-neutral-500">
          Banner hiển thị ở trang chủ; popup mở ra khi khách truy cập. Chỉ mục{' '}
          <span className="text-neutral-300">đang bật</span> mới hiển thị cho khách.
        </p>

        {error && <p className="mb-4 text-red-400">{error}</p>}
        {loading ? (
          <p className="text-neutral-500">Đang tải…</p>
        ) : ads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 py-16 text-center text-neutral-500">
            Chưa có quảng cáo nào. Bấm “+ Thêm quảng cáo” để tạo.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50"
              >
                <div className="relative aspect-video bg-neutral-800">
                  {ad.media[0] &&
                    (ad.media[0].type === 'video' ? (
                      <video src={ad.media[0].url} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={ad.media[0].url} alt="" className="h-full w-full object-cover" />
                    ))}
                  {!ad.is_active && (
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-neutral-300">
                      Đã tắt
                    </span>
                  )}
                  {ad.media.length > 1 && (
                    <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-neutral-300">
                      {ad.media.length} media
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{ad.title || '(không tên)'}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {PLACEMENT_LABEL[ad.placement]} · {ad.aspect_ratio} · #{ad.sort_order}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleActive(ad)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        ad.is_active
                          ? 'bg-green-400/15 text-green-300 hover:bg-green-400/25'
                          : 'bg-neutral-700/40 text-neutral-400 hover:bg-neutral-700/60'
                      }`}
                    >
                      {ad.is_active ? 'Đang bật' : 'Đang tắt'}
                    </button>
                  </div>
                  {ad.link_url && (
                    <p className="mt-1 truncate text-xs text-indigo-300/80">{ad.link_url}</p>
                  )}
                  <div className="mt-3 flex gap-3 text-sm">
                    <button
                      onClick={() => openEdit(ad)}
                      className="text-neutral-300 hover:text-indigo-400"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(ad)}
                      className="text-neutral-400 hover:text-red-400"
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / edit panel */}
      {editingId !== null && (
        <div className="fixed inset-0 z-10 flex justify-end bg-black/60" onClick={closeForm}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="h-full w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-6"
          >
            <h2 className="mb-5 text-lg font-bold">
              {editingId ? 'Sửa quảng cáo' : 'Thêm quảng cáo'}
            </h2>

            <div className="space-y-4">
              <Field label="Tiêu đề (nội bộ)">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Show đêm nhạc tháng 8"
                  className="input"
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Vị trí">
                  <select
                    value={form.placement}
                    onChange={(e) =>
                      setForm({ ...form, placement: e.target.value as AdPlacement })
                    }
                    className="input"
                  >
                    <option value="landing">Banner trang chủ</option>
                    <option value="popup">Popup chào mừng</option>
                  </select>
                </Field>
                <Field label="Tỉ lệ khung">
                  <select
                    value={form.aspect_ratio}
                    onChange={(e) =>
                      setForm({ ...form, aspect_ratio: e.target.value as AdAspectRatio })
                    }
                    className="input"
                  >
                    {ASPECT_RATIOS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Link khi bấm vào (tuỳ chọn)">
                <input
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://…"
                  className="input"
                />
              </Field>

              {/* Media */}
              <div>
                <span className="mb-1 block text-xs font-medium text-neutral-400">
                  Ảnh / Video ({form.media.length})
                </span>

                {form.media.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {form.media.map((m, i) => (
                      <div
                        key={i}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
                      >
                        {m.type === 'video' ? (
                          <video src={m.url} className="h-full w-full object-cover" muted />
                        ) : (
                          <img src={m.url} alt="" className="h-full w-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(i)}
                          aria-label="Xoá"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100"
                        >
                          ✕
                        </button>
                        {m.type === 'video' && (
                          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] text-white">
                            video
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleUpload}
                  disabled={uploading}
                  className="w-full text-xs text-neutral-400 file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
                />
                {uploading && <p className="mt-1 text-xs text-indigo-300">Đang tải lên…</p>}

                <div className="mt-2 flex gap-2">
                  <input
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addUrlMedia()
                      }
                    }}
                    placeholder="…hoặc dán URL ảnh/video"
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={addUrlMedia}
                    className="rounded-lg border border-neutral-700 px-3 text-sm text-neutral-300 hover:border-indigo-400 hover:text-indigo-400"
                  >
                    Thêm
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Nhiều ảnh sẽ hiển thị dạng carousel tự chạy.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Thứ tự (nhỏ hiện trước)">
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="input"
                  />
                </Field>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 accent-indigo-400"
                  />
                  Bật hiển thị
                </label>
              </div>

              {formError && (
                <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
                  {formError}
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 rounded-lg bg-indigo-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-indigo-300 disabled:opacity-50"
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
              >
                Huỷ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-400">{label}</span>
      {children}
    </label>
  )
}
