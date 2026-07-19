import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  adminListMenu,
  createMenuItem,
  deleteMenuItem,
  updateMenuItem,
  uploadMenuImage,
  type MenuItem,
  type MenuItemInput,
} from '../api/menu'
import { formatVnd } from '../lib/format'
import { useAuth } from '../context/AuthContext'

interface FormState {
  name: string
  category: string
  price: string
  quantity: string
  description: string
  image_url: string
  is_available: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  price: '',
  quantity: '0',
  description: '',
  image_url: '',
  is_available: true,
}

export default function AdminRental() {
  const { logout } = useAuth()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null) // null = closed, '' = new
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      setItems(await adminListMenu('rental'))
      setError(null)
    } catch {
      setError('Không tải được danh sách đồ thuê.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  // Existing groups, for the category suggestion datalist.
  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')),
    [items],
  )

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId('')
    setFormError(null)
  }

  function openEdit(item: MenuItem) {
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      quantity: String(item.quantity),
      description: item.description,
      image_url: item.image_url ?? '',
      is_available: item.is_available,
    })
    setEditingId(item.id)
    setFormError(null)
  }

  function closeForm() {
    setEditingId(null)
    setFormError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const price = Number(form.price)
    const quantity = Number(form.quantity)
    if (!form.name.trim()) return setFormError('Tên sản phẩm không được để trống.')
    if (!form.category.trim()) return setFormError('Vui lòng nhập nhóm phân loại.')
    if (!Number.isFinite(price) || price < 0) return setFormError('Giá không hợp lệ.')
    if (!Number.isInteger(quantity) || quantity < 0) return setFormError('Số lượng không hợp lệ.')

    const payload: MenuItemInput = {
      name: form.name.trim(),
      kind: 'rental',
      category: form.category.trim(),
      price,
      quantity,
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      is_available: form.is_available,
      toppings: [],
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateMenuItem(editingId, payload)
      } else {
        await createMenuItem(payload)
      }
      closeForm()
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`Xoá "${item.name}"? Hành động này không thể hoàn tác.`)) return
    try {
      await deleteMenuItem(item.id)
      await refresh()
    } catch {
      alert('Xoá thất bại.')
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editingId) return
    try {
      const updated = await uploadMenuImage(editingId, file)
      setForm((f) => ({ ...f, image_url: updated.image_url ?? '' }))
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Tải ảnh thất bại.')
    }
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
            <span className="text-neutral-200">Cho thuê đồ</span>
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý đồ thuê</h1>
          </div>
          <button
            onClick={openCreate}
            className="rounded-lg bg-indigo-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-indigo-300"
          >
            + Thêm đồ thuê
          </button>
        </div>

        {error && <p className="mb-4 text-red-400">{error}</p>}
        {loading ? (
          <p className="text-neutral-500">Đang tải…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 text-left text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Sản phẩm</th>
                  <th className="px-4 py-3 font-medium">Nhóm</th>
                  <th className="px-4 py-3 font-medium">Giá thuê</th>
                  <th className="px-4 py-3 font-medium">Tồn kho</th>
                  <th className="px-4 py-3 font-medium">Hiển thị</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-neutral-800/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded bg-neutral-800 text-lg">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="h-9 w-9 rounded object-cover" />
                          ) : (
                            '🎸'
                          )}
                        </span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{item.category}</td>
                    <td className="px-4 py-3 text-indigo-300">{formatVnd(item.price)}</td>
                    <td className="px-4 py-3">
                      <span className={item.quantity === 0 ? 'text-red-400' : 'text-neutral-200'}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.is_available ? (
                        <span className="text-green-400">Đang cho thuê</span>
                      ) : (
                        <span className="text-neutral-500">Đã ẩn</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(item)}
                        className="mr-3 text-neutral-300 hover:text-indigo-400"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-neutral-400 hover:text-red-400"
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                      Chưa có đồ cho thuê nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              {editingId ? 'Sửa đồ thuê' : 'Thêm đồ thuê'}
            </h2>

            <div className="space-y-4">
              <Field label="Tên sản phẩm">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nhóm phân loại">
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    list="rental-categories"
                    placeholder="VD: Guitar, Bass, IEM"
                    className="input"
                  />
                  <datalist id="rental-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Giá thuê (VND)">
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Số lượng tồn kho">
                <input
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Mô tả ngắn">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="input resize-none"
                />
              </Field>

              <Field label="Ảnh sản phẩm">
                <input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="URL ảnh (hoặc tải lên bên dưới)"
                  className="input"
                />
                {editingId ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-2 text-xs text-neutral-400 file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
                  />
                ) : (
                  <p className="mt-1 text-xs text-neutral-600">
                    Lưu sản phẩm trước, rồi mở lại để tải ảnh lên.
                  </p>
                )}
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                  className="h-4 w-4 accent-indigo-400"
                />
                Hiển thị cho khách (đang cho thuê)
              </label>

              {formError && (
                <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
                  {formError}
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
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
