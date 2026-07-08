import { useEffect, useState } from 'react'
import { adminGetKitchenStatus, adminSetKitchenStatus } from '../api/kitchen'

/** Admin control to open/close the kitchen. Blocks/allows new customer orders. */
export default function KitchenToggle() {
  const [open, setOpen] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    adminGetKitchenStatus()
      .then((s) => setOpen(s.is_open))
      .catch(() => setOpen(null))
  }, [])

  async function toggle() {
    if (open === null) return
    setBusy(true)
    try {
      const s = await adminSetKitchenStatus(!open)
      setOpen(s.is_open)
    } catch {
      alert('Không đổi được trạng thái bếp.')
    } finally {
      setBusy(false)
    }
  }

  if (open === null) {
    return <span className="text-sm text-neutral-500">Bếp: …</span>
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
        open
          ? 'border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20'
          : 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20'
      }`}
      title="Bấm để đổi trạng thái"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${open ? 'bg-green-400' : 'bg-red-400'}`} />
      {open ? 'Bếp đang mở' : 'Bếp đã đóng'}
      <span className="text-neutral-500">·</span>
      <span className="text-neutral-400">{busy ? '…' : open ? 'Đóng bếp' : 'Mở bếp'}</span>
    </button>
  )
}
