import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { portalAuth, portalRequest, PortalError } from '@/lib/portalApi'
import type { PortalInfo, PortalMe } from '@/lib/types'

/**
 * Portal ka shared state: slug, business info, login (me), cart.
 *   const { slug, info, me, get, cart } = usePortal()
 * Cart browser mein (localStorage, har client ka alag) - checkout pe server prices dobara check karta hai.
 */
export type CartItem = { product_id: number; quantity: number }

type Ctx = {
  slug: string
  info?: PortalInfo
  infoLoading: boolean
  infoError: unknown
  me?: PortalMe
  meLoading: boolean
  loggedIn: boolean
  get: <T>(path: string) => Promise<T>
  post: <T>(path: string, body?: unknown) => Promise<T>
  put: <T>(path: string, body?: unknown) => Promise<T>
  del: <T>(path: string) => Promise<T>
  logout: () => void
  cart: CartItem[]
  cartCount: number
  setQty: (productId: number, qty: number) => void
  add: (productId: number, qty: number) => void
  clearCart: () => void
  qtyOf: (productId: number) => number
}

const PortalContext = createContext<Ctx | null>(null)

const cartKey = (slug: string) => `od_cart_${slug}`
function readCart(slug: string): CartItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(cartKey(slug)) || '[]')
    return Array.isArray(v) ? v.filter((x) => x && x.product_id && x.quantity > 0) : []
  } catch {
    return []
  }
}

export function PortalProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const qc = useQueryClient()
  const token = portalAuth.getToken(slug)
  const get = useCallback(<T,>(path: string) => portalRequest<T>(slug, 'GET', `/portal/${slug}${path}`), [slug])
  const post = useCallback(
    <T,>(path: string, body?: unknown) => portalRequest<T>(slug, 'POST', `/portal/${slug}${path}`, body ?? {}),
    [slug],
  )
  const put = useCallback(
    <T,>(path: string, body?: unknown) => portalRequest<T>(slug, 'PUT', `/portal/${slug}${path}`, body ?? {}),
    [slug],
  )

  const del = useCallback(<T,>(path: string) => portalRequest<T>(slug, 'DELETE', `/portal/${slug}${path}`), [slug])

  const info = useQuery({ queryKey: ['portal', slug, 'info'], queryFn: () => get<PortalInfo>('/info'), retry: false })
  const me = useQuery({
    queryKey: ['portal', slug, 'me', token],
    queryFn: () => portalRequest<PortalMe>(slug, 'GET', '/portal/me'),
    enabled: !!token,
    retry: false,
  })
  // Token expire / login disable -> chupchap logout (guest ban jao)
  useEffect(() => {
    if (me.error instanceof PortalError && me.error.status === 401) {
      portalAuth.setToken(slug, '')
      qc.invalidateQueries({ queryKey: ['portal', slug] })
    }
  }, [me.error, slug, qc])

  const [cart, setCart] = useState<CartItem[]>(() => readCart(slug))
  useEffect(() => {
    try {
      localStorage.setItem(cartKey(slug), JSON.stringify(cart))
    } catch {
      /* private mode - cart sirf is tab tak */
    }
  }, [cart, slug])

  const setQty = useCallback((productId: number, qty: number) => {
    setCart((c) => {
      const q = Math.max(0, Math.round(qty * 100) / 100)
      if (!q) return c.filter((x) => x.product_id !== productId)
      return c.some((x) => x.product_id === productId)
        ? c.map((x) => (x.product_id === productId ? { ...x, quantity: q } : x))
        : [...c, { product_id: productId, quantity: q }]
    })
  }, [])
  const add = useCallback(
    (productId: number, qty: number) =>
      setCart((c) => {
        const hit = c.find((x) => x.product_id === productId)
        return hit
          ? c.map((x) => (x.product_id === productId ? { ...x, quantity: x.quantity + qty } : x))
          : [...c, { product_id: productId, quantity: qty }]
      }),
    [],
  )

  const value = useMemo<Ctx>(
    () => ({
      slug,
      info: info.data,
      infoLoading: info.isLoading,
      infoError: info.error,
      me: token ? me.data : undefined,
      meLoading: !!token && me.isLoading,
      loggedIn: !!token && !!me.data,
      get,
      post,
      put,
      del,
      logout: () => portalAuth.logout(slug),
      cart,
      cartCount: cart.length,
      setQty,
      add,
      clearCart: () => setCart([]),
      qtyOf: (id: number) => cart.find((x) => x.product_id === id)?.quantity || 0,
    }),
    [slug, info.data, info.isLoading, info.error, me.data, me.isLoading, token, get, post, put, del, cart, setQty, add],
  )
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const c = useContext(PortalContext)
  if (!c) throw new Error('usePortal outside PortalProvider')
  return c
}
