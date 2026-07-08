import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMe, login as apiLogin, logout as apiLogout, type Admin } from '../api/auth'
import { getToken } from '../api/client'

interface AuthState {
  user: Admin | null
  loading: boolean
  login: (username: string, password: string) => Promise<Admin>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  // On first load, if we have a token, restore the session from /auth/me.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    getMe()
      .then(setUser)
      .catch(() => apiLogout())
      .finally(() => setLoading(false))
  }, [])

  async function login(username: string, password: string): Promise<Admin> {
    const admin = await apiLogin(username, password)
    setUser(admin)
    return admin
  }

  function logout(): void {
    apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
