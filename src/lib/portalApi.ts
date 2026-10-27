// Customer portal API - staff app se alag token (od_portal_<slug>), alag 401 handling.
const BASE = import.meta.env.VITE_API_URL || '/api'

export class PortalError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const key = (slug: string) => `od_portal_${slug}`

export const portalAuth = {
  getToken: (slug: string) => {
    try {
      return localStorage.getItem(key(slug))
    } catch {
      return null
    }
  },
  setToken: (slug: string, token: string) => {
    try {
      localStorage.setItem(key(slug), token)
    } catch {
      /* private mode */
    }
  },
  logout: (slug: string) => {
    try {
      localStorage.removeItem(key(slug))
    } catch {
      /* ignore */
    }
    window.location.href = `/portal/${slug}`
  },
}

export async function portalRequest<T>(slug: string, method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = portalAuth.getToken(slug)
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new PortalError("Can't reach the server - check your internet connection", 0)
  }
  const data = (res.headers.get('content-type') || '').includes('application/json') ? await res.json() : null
  if (!res.ok) {
    let message = data?.detail || 'Something went wrong'
    if (Array.isArray(message)) message = message.map((e: { msg: string }) => e.msg).join(', ')
    throw new PortalError(String(message), res.status)
  }
  return data as T
}
