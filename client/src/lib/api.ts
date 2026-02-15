import { TOKEN_KEY } from "@/lib/authContext"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

type ApiResponse<T> = {
  summary: null
  success: boolean
  data: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  message?: string
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function buildHeaders(overrides?: HeadersInit) {
  const headers = new Headers(overrides)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const authHeaders = getAuthHeaders()
  Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value))
  return headers
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.message || "Request failed")
  }
  return data
}

export function apiGet<T>(path: string) {
  return request<T>(path)
}

export function apiPost<T>(path: string, body: unknown) {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) })
}

export function apiPatch<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) })
}

export function apiPut<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) })
}

export function apiDelete<T>(path: string) {
  return request<T>(path, { method: "DELETE" })
}
