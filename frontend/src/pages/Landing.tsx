import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

// The 3D scene is a separate chunk — loads after the hero shell paints.
const BowlScene = lazy(() => import('../components/BowlScene'))

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
}

const FEATURES = [
  { icon: '⚡', title: 'Nhanh gọn', desc: 'Chọn món → giỏ → xong trong vài chạm' },
  { icon: '📱', title: 'Không đăng nhập', desc: 'Đặt ẩn danh, theo dõi bằng mã đơn' },
  { icon: '🏷️', title: 'Thanh toán QR', desc: 'Quét VietQR, tự động xác nhận' },
]

export default function Landing() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const reducedMotion = !!useReducedMotion()

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Ambient indigo glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[40vh] w-[40vh] rounded-full bg-violet-700/15 blur-[100px]" />
      </div>

      {/* Brand bar */}
      <div className="relative z-20 mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <span className="font-display text-xl tracking-wide text-neutral-200 sm:text-2xl">
          H<span className="text-indigo-400">2</span> Kitchen
        </span>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="text-sm text-neutral-300 transition-colors hover:text-indigo-300 sm:text-base"
        >
          Đơn của tôi
        </button>
      </div>

      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.14 } } }}
        className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-4xl flex-col items-center justify-center px-5 pb-10 text-center"
      >
        <motion.p
          variants={fadeUp}
          className="mb-1 text-xs font-medium uppercase tracking-[0.35em] text-indigo-300/80 sm:text-sm"
        >
          Chào mừng đến với
        </motion.p>

        {/* Layered: big Dela Gothic title behind, 3D bowl in front */}
        <motion.div
          variants={fadeUp}
          className="relative flex h-[50vh] w-full items-center justify-center sm:h-[58vh]"
        >
          <h1
            aria-label="H2 Kitchen"
            className="pointer-events-none absolute inset-0 z-0 flex select-none flex-col items-center justify-between bg-gradient-to-b from-white via-indigo-200 to-indigo-500 bg-clip-text py-[4%] font-display text-6xl leading-[0.85] tracking-tight text-transparent sm:text-8xl"
          >
            <span>H2</span>
            <span>KITCHEN</span>
          </h1>

          <div className="pointer-events-none absolute inset-0 z-10">
            <SceneBoundary fallback={<BowlFallback />}>
              <Suspense fallback={<BowlFallback />}>
                <BowlScene reducedDetail={isMobile} reducedMotion={reducedMotion} />
              </Suspense>
            </SceneBoundary>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-2 text-xs text-neutral-500 sm:text-base"
        >
          This web is powered by{' '}
          <a
            href="https://www.instagram.com/crazybuilders.lab"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300 hover:underline hover:underline-offset-2"
          >
            Crazy Builders Lab
          </a>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-4 mb-7 max-w-md text-sm text-neutral-400 sm:text-base"
        >
          Đồ ăn &amp; đồ uống cho phòng tập nhạc — chọn món, thanh toán QR, theo dõi đơn. Không
          cần đăng nhập.
        </motion.p>

        <motion.button
          type="button"
          variants={fadeUp}
          onClick={() => navigate('/order')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="group inline-flex items-center gap-2 rounded-full bg-indigo-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-400"
        >
          Bắt đầu chọn món
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </motion.button>

        {/* Scroll hint */}
        <motion.div
          variants={fadeUp}
          animate={reducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="mt-10 text-xl text-neutral-600"
        >
          ⌄
        </motion.div>
      </motion.section>

      {/* Scroll-reveal mini features */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-center"
            >
              <div className="text-2xl">{f.icon}</div>
              <div className="mt-2 text-sm font-semibold text-neutral-200">{f.title}</div>
              <div className="mt-1 text-xs text-neutral-500">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

function BowlFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="h-24 w-24 animate-pulse rounded-full bg-indigo-500/30 blur-xl" />
      <span className="absolute text-5xl">🍜</span>
    </div>
  )
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
