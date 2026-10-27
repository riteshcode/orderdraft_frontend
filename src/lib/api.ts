// Saari API calls yahin se. Token localStorage mein rehta hai.
// Use: const orders = await api.get<Paged<OrderSummary>>('/orders?status=needs_review')

const BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'od_token'
const ADMIN_TOKEN_KEY = 'od_admin_token' // impersonate se pehle wala super admin token

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    window.location.href = '/login'
  },
  /** Super admin "login as" - apna token side mein save karo */
  startImpersonation: (token: string) => {
    const current = localStorage.getItem(TOKEN_KEY)
    if (current) localStorage.setItem(ADMIN_TOKEN_KEY, current)
    localStorage.setItem(TOKEN_KEY, token)
    window.location.href = '/'
  },
  stopImpersonation: () => {
    const admin = localStorage.getItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    if (admin) localStorage.setItem(TOKEN_KEY, admin)
    window.location.href = '/admin'
  },
}

async function request<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = {}
  const token = auth.getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    })
  } catch {
    throw new ApiError("Can't reach the server - check your internet connection and try again", 0)
  }

  if (res.status === 401 && !path.startsWith('/auth/')) {
    auth.logout()
    throw new ApiError('Session expired', 401)
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    // FastAPI: {detail: "..."} ya validation errors list
    let message = (data && (data as { detail?: unknown }).detail) || 'Something went wrong'
    // Server error: reference number support ko bhejne ke liye (backend logs/app.log mein yahi id)
    const ref = res.headers.get('X-Request-ID')
    if (res.status >= 500 && ref && !String(message).includes(ref)) message = `${message} (reference ${ref})`
    if (Array.isArray(message)) message = message.map((e: { msg: string }) => e.msg).join(', ')
    throw new ApiError(String(message), res.status)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, form, true),
}

/** Token ke saath file download (CSV / PDF) */
export async function downloadFile(path: string, filename: string, openInTab = false) {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${auth.getToken()}` } })
  if (!res.ok) throw new ApiError('Download failed', res.status)
  const url = URL.createObjectURL(await res.blob())
  if (openInTab) {
    window.open(url, '_blank')
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Query string banao, khali values chhod do */
export function qs(params: Record<string, string | number | boolean | null | undefined>) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}
