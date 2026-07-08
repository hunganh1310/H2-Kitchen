import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import AdminMenu from './pages/AdminMenu'
import AdminOrders from './pages/AdminOrders'
import CartPage from './pages/CartPage'
import CustomerHome from './pages/CustomerHome'
import LoginPage from './pages/LoginPage'
import MyOrdersPage from './pages/MyOrdersPage'
import OrderPage from './pages/OrderPage'

// Lazy so the 3D/animation bundle stays in the landing chunk, off every other route.
const Landing = lazy(() => import('./pages/Landing'))

function LandingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-2xl font-display tracking-tight text-neutral-100">
      H<span className="text-indigo-400">2</span> Kitchen
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Landing at / (lazy-loaded) */}
      <Route
        path="/"
        element={
          <Suspense fallback={<LandingFallback />}>
            <Landing />
          </Suspense>
        }
      />

      {/* Public customer area — no login required (CLAUDE.md §3, §4.1) */}
      <Route path="/order" element={<CustomerHome />} />
      <Route path="/order/:code" element={<OrderPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/orders" element={<MyOrdersPage />} />

      {/* Admin login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin area — JWT required */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/menu"
        element={
          <ProtectedRoute>
            <AdminMenu />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute>
            <AdminOrders />
          </ProtectedRoute>
        }
      />

      {/* Unknown routes fall back to the menu */}
      <Route path="*" element={<CustomerHome />} />
    </Routes>
  )
}
