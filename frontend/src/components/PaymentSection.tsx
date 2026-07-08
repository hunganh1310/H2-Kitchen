import { useState } from 'react'
import type { Order } from '../api/orders'
import { formatVnd } from '../lib/format'

export default function PaymentSection({ order }: { order: Order }) {
  if (order.status === 'cancelled') return null

  if (order.payment_status === 'paid') {
    return (
      <div className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
        ✓ <span className="font-semibold">Đã thanh toán.</span> Cảm ơn bạn!
      </div>
    )
  }

  if (order.payment_method === 'cash') {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-300">
        💵 <span className="font-semibold">Thanh toán tiền mặt.</span> Vui lòng trả tiền tại quầy khi
        nhận món.
      </div>
    )
  }

  // VietQR, unpaid
  if (!order.vietqr) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-400">
        Chuyển khoản — thông tin tài khoản chưa được cấu hình. Vui lòng liên hệ quầy để thanh toán.
      </div>
    )
  }

  const q = order.vietqr

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="text-center text-sm font-semibold text-neutral-200">
        Quét mã QR để chuyển khoản
      </h3>

      <div className="mx-auto mt-3 w-full max-w-[260px] overflow-hidden rounded-xl bg-white p-2">
        <img
          src={q.qr_image_url}
          alt={`Mã QR chuyển khoản đơn ${order.order_code}`}
          className="w-full"
          loading="lazy"
        />
      </div>

      <div className="mx-auto mt-4 max-w-xs rounded-xl bg-indigo-400/10 px-4 py-3 text-center">
        <p className="text-xs text-indigo-200/70">Số tiền cần chuyển</p>
        <div className="mt-0.5 flex items-center justify-center gap-2">
          <span className="text-2xl font-bold text-indigo-300">{formatVnd(q.amount)}</span>
          <Copy value={String(q.amount)} />
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <Row label="Ngân hàng" value={q.bank_name} />
        <Row label="Số tài khoản" value={q.account_number} copy={q.account_number} />
        <Row label="Chủ tài khoản" value={q.account_name} />
      </div>

      <p className="mt-3 rounded-lg bg-neutral-800/60 px-3 py-2 text-center text-xs text-neutral-300">
        Quét mã bằng app ngân hàng — số tiền &amp; nội dung đã điền sẵn.{' '}
        <span className="font-semibold text-indigo-300">
          Đơn sẽ tự động xác nhận sau khi chuyển khoản.
        </span>
      </p>
    </div>
  )
}

function Row({ label, value, copy }: { label: string; value: string; copy?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-800/60 pb-2 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-neutral-200">{value}</span>
        {copy && <Copy value={copy} />}
      </span>
    </div>
  )
}

function Copy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-neutral-700 px-1.5 py-0.5 text-xs text-neutral-400 hover:border-indigo-400 hover:text-indigo-400"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  )
}
