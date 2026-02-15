import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { API_URL, AuthContext, TOKEN_KEY } from "@/lib/authContext"
import type { AuthContextType, AuthUser } from "@/lib/authContext"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  const setAuth = (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser)
    setToken(nextToken)
    setLoading(false)
    localStorage.setItem(TOKEN_KEY, nextToken)
    axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`
  }

  const clearAuth = () => {
    setUser(null)
    setToken(null)
    setLoading(false)
    localStorage.removeItem(TOKEN_KEY)
    delete axios.defaults.headers.common.Authorization
  }

  useEffect(() => {
    if (!token) return

    axios.defaults.headers.common.Authorization = `Bearer ${token}`

    let canceled = false
    axios
      .get(`${API_URL}/api/auth/me`)
      .then((res) => {
        if (canceled) return
        if (res.data?.success && res.data?.user) {
          setUser(res.data.user)
        } else {
          clearAuth()
        }
      })
      .catch(() => {
        if (!canceled) clearAuth()
      })
      .finally(() => {
        if (!canceled) setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [token])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      role: user?.role ?? null,
      token,
      loading,
      setAuth,
      clearAuth,
    }),
    [user, token, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
