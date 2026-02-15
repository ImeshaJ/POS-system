import { createContext, useContext } from "react"

export type UserRole = "admin" | "staff" | null

export interface AuthUser {
  id: number
  email: string
  username: string
  role: Exclude<UserRole, null>
  created_at?: string
  updated_at?: string
}

export interface AuthContextType {
  user: AuthUser | null
  role: UserRole
  token: string | null
  loading: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

export const TOKEN_KEY = "ff_token"
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  token: null,
  loading: true,
  setAuth: () => {},
  clearAuth: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
