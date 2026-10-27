import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ClipboardList, Home, LayoutGrid, RefreshCw, Search, ShoppingBag, User, WifiOff } from 'lucide-react'
import type { PortalInfo } from '@/lib/types'
import { cn } from '@/lib/utils'
import { usePortal } from './context'
import { Brand, CategoryBar, NotificationBell } from './PortalApp'
import { cachedInfo, cacheInfo, canGoBack, haptic, isMobileNow, screenFor, useIsMobile, type TabKey } from './native'
import { isStandalone } from './pwa'
import { headerClasses } from './theme'

/**
 * Phone par portal = native app:
 *   MobileHeader     upar app bar (back / title / bell / cart), Home + Shop pe search, Shop pe category chips
 *   BottomTabs       neeche Home · Shop · Cart · Orders · Account (deep screens pe chhup jaata hai)
 *   MobileActionBar  neeche chipka button (Add to cart / Checkout / Place order)
 *   Screen           screen badalne pe slide / fade + naye screen pe upar se shuru
 *   PullToRefresh, SwipeBack (installed app mein left edge se), SheetSwipe (bottom sheet neeche kheencho = band)
 *   OfflineBanner, Splash, useAppChrome (body class, viewport, info cache)
 * Desktop (>= 768px) pe in sab mein se kuch nahi dikhta - wahan purana layout.
 */

// ---------------- app chrome ----------------
export function useAppChrome(slug: string, info: PortalInfo | undefined) {
  useEffect(() => {
    const body = document.body
    body.classList.add('od-portal')
    if (isStandalone()) body.classList.add('od-standalone')
    const viewport = document.querySelector('meta[name="viewport"]')
    const before = viewport?.getAttribute('content')
    return () => {
      body.classList.remove('od-portal', 'od-standalone')
      // Staff app pe wapas - normal zoom wapas
      if (viewport && before) document.querySelector('meta[name="viewport"]')?.setAttribute('content', before)
    }
  }, [])
  useEffect(() => {
    if (info) cacheInfo(slug, info)
  }, [slug, info])
}

/** App khulte hi: brand rang + logo (pichli baar ka yaad), jab tak data aaye */
export function Splash({ slug }: { slug: string }) {
  const c = cachedInfo(slug)
  const color = c?.branding.brand_color || '#2563eb'
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4" style={{ background: c ? color : '#ffffff' }}>
      {c ? (
        <>
          {c.branding.logo_url ? (
            <img
              src={c.branding.logo_url}
              alt=""
              className="od-splash-logo h-16 max-w-[60vw] rounded-2xl bg-white/95 object-contain p-2.5 shadow-lg"
            />
          ) : (
            <div
              className="od-splash-logo flex size-20 items-center justify-center rounded-3xl bg-white/95 text-2xl font-bold shadow-lg"
              style={{ color }}
            >
              {c.name
                .split(/\s+/)
                .filter((w) => !/^(pty|ltd)$/i.test(w))
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase()}
            </div>
          )}
          <div className="od-splash-logo text-base font-semibold text-white/95">{c.name}</div>
        </>
      ) : null}
      <div
        className={cn(
          'mt-6 size-6 animate-spin rounded-full border-2 border-t-transparent',
          c ? 'border-white/80' : 'border-slate-300',
        )}
      />
    </div>
  )
}

// ---------------- header ----------------
export function useGoBack() {
  const navigate = useNavigate()
  const { slug } = usePortal()
  const location = useLocation()
  const screen = screenFor(slug, location.pathname)
  return () => {
    haptic(8)
    if (canGoBack()) navigate(-1)
    else navigate(screen.back || `/portal/${slug}`, { replace: true })
  }
}

export function MobileHeader() {
  const { slug, info, loggedIn, cartCount } = usePortal()
  const location = useLocation()
  const screen = screenFor(slug, location.pathname)
  const goBack = useGoBack()
  const style = info!.branding.header_style
  const ghost = style === 'light' ? 'text-foreground' : 'text-inherit'
  return (
    <header className={cn('pt-safe sticky top-0 z-30 border-b md:hidden', headerClasses(style))}>
      <div className="flex h-14 items-center gap-1 px-2">
        {screen.back ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className={cn('flex size-10 items-center justify-center rounded-full active:bg-black/10', ghost)}
          >
            <ChevronLeft className="size-6" />
          </button>
        ) : (
          <span className="w-2" />
        )}
        <div className="min-w-0 flex-1">
          {screen.tab === 'home' ? (
            <Brand compact onColour={style !== 'light'} />
          ) : (
            <h1 className="truncate text-[17px] font-semibold leading-tight">{screen.title}</h1>
          )}
        </div>
        {screen.cart && (
          <Link
            to={`/portal/${slug}/cart`}
            aria-label="Cart"
            className={cn('relative flex size-10 items-center justify-center rounded-full active:bg-black/10', ghost)}
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground ring-2 ring-white">
                {cartCount}
              </span>
            )}
          </Link>
        )}
        {loggedIn && (screen.tabs || screen.cart) && <NotificationBell className={cn('size-10 rounded-full', ghost)} />}
      </div>
      {screen.search && <MobileSearch onColour={style !== 'light'} />}
      {screen.chips && <CategoryBar mobile />}
    </header>
  )
}

function MobileSearch({ onColour }: { onColour: boolean }) {
  const { slug } = usePortal()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  useEffect(() => setQ(params.get('q') || ''), [params])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    ;(document.activeElement as HTMLElement | null)?.blur() // keyboard band
    navigate(`/portal/${slug}/shop${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }
  return (
    <form onSubmit={submit} className="relative px-3 pb-2.5" role="search">
      <Search className="pointer-events-none absolute left-6 top-2.5 size-4 text-muted-foreground" />
      <input
        type="search"
        enterKeyHint="search"
        aria-label="Search products (mobile)"
        className={cn(
          'h-10 w-full rounded-xl border-0 pl-9 pr-3 text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-ring',
          onColour ? 'bg-white shadow-sm' : 'bg-muted/80',
        )}
        placeholder="Search products"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </form>
  )
}

// ---------------- bottom tabs ----------------
const TABS: { key: TabKey; label: string; icon: typeof Home; path: string }[] = [
  { key: 'home', label: 'Home', icon: Home, path: '' },
  { key: 'shop', label: 'Shop', icon: LayoutGrid, path: '/shop' },
  { key: 'cart', label: 'Cart', icon: ShoppingBag, path: '/cart' },
  { key: 'orders', label: 'Orders', icon: ClipboardList, path: '/orders' },
  { key: 'account', label: 'Account', icon: User, path: '/account' },
]

export function BottomTabs() {
  const { slug, cartCount, loggedIn } = usePortal()
  const location = useLocation()
  const navigate = useNavigate()
  const screen = screenFor(slug, location.pathname)
  if (!screen.tabs) return null
  const base = `/portal/${slug}`
  return (
    <nav
      aria-label="App navigation"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-md md:hidden"
    >
      <div className="grid h-[58px] grid-cols-5">
        {TABS.map((t) => {
          const active = screen.tab === t.key
          const to =
            t.key === 'orders' && !loggedIn ? `${base}/login?next=${encodeURIComponent(`${base}/orders`)}` : `${base}${t.path}`
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                haptic(6)
                if (active)
                  window.scrollTo({ top: 0, behavior: 'smooth' }) // same tab dobara = upar
                else navigate(to, { replace: !!screen.tab }) // tab se tab = history mein dher nahi
              }}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-90',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'relative flex h-7 w-12 items-center justify-center rounded-full transition',
                  active && 'bg-primary/12',
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.9} />
                {t.key === 'cart' && cartCount > 0 && (
                  <span className="absolute -top-1 right-1 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-primary-foreground ring-2 ring-card">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <span className={cn('text-[10.5px] leading-none', active ? 'font-semibold' : 'font-medium')}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** Neeche chipka action (product: Add · cart: Checkout · checkout: Place order). Desktop pe kuch nahi. */
export function MobileActionBar({ children }: { children: ReactNode }) {
  const { slug } = usePortal()
  const location = useLocation()
  const mobile = useIsMobile()
  if (!mobile) return null
  const tabs = screenFor(slug, location.pathname).tabs
  return (
    <>
      <div className="h-20 md:hidden" aria-hidden />
      {createPortal(
        <div
          className={cn(
            'fixed inset-x-0 z-40 border-t bg-card/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md',
            tabs ? 'bottom-[calc(58px+env(safe-area-inset-bottom))]' : 'pb-safe bottom-0',
          )}
        >
          <div className={cn(!tabs && 'pb-1')}>{children}</div>
        </div>,
        document.body,
      )}
    </>
  )
}

// ---------------- screen transition ----------------
export function Screen({ children }: { children: ReactNode }) {
  const { slug } = usePortal()
  const location = useLocation()
  const navType = useNavigationType()
  const prev = useRef<string | null>(null)
  const dir = useMemo(() => {
    const before = prev.current
    prev.current = location.pathname
    if (!before || before === location.pathname) return 'none'
    if (navType === 'POP') return 'back'
    return screenFor(slug, before).tab && screenFor(slug, location.pathname).tab ? 'tab' : 'push'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])
  // Naya screen upar se shuru (phone pe) - back pe browser apni jagah rakhe
  useLayoutEffect(() => {
    if (navType !== 'POP' && isMobileNow()) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname, navType])
  return (
    <div key={location.pathname} className="od-screen" data-dir={dir}>
      {children}
    </div>
  )
}

// ---------------- gestures ----------------
const PULL_TRIGGER = 70

/** Upar se neeche kheencho = refresh (sirf phone, page sabse upar ho tab) */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const { slug } = usePortal()
  const qc = useQueryClient()
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const pullRef = useRef(0)

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const t = e.target as HTMLElement
      if (
        !isMobileNow() ||
        busy ||
        window.scrollY > 0 ||
        t.closest('[role="dialog"],[data-od-dialog],[data-radix-popper-content-wrapper]')
      )
        return
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onMove = (e: TouchEvent) => {
      if (!start.current) return
      const dy = e.touches[0].clientY - start.current.y
      const dx = Math.abs(e.touches[0].clientX - start.current.x)
      if (dy <= 0 || dx > dy || window.scrollY > 0) {
        if (pullRef.current) setPull((pullRef.current = 0))
        return
      }
      pullRef.current = Math.min(dy * 0.5, 110) // resistance - asli app jaisa
      setPull(pullRef.current)
    }
    const onEnd = async () => {
      if (!start.current) return
      start.current = null
      const p = pullRef.current
      pullRef.current = 0
      if (p < PULL_TRIGGER) return setPull(0)
      haptic(12)
      setBusy(true)
      setPull(52)
      try {
        await qc.refetchQueries({ queryKey: ['portal', slug], type: 'active' })
      } finally {
        setBusy(false)
        setPull(0)
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [busy, qc, slug])

  return (
    <>
      <div
        className="flex items-end justify-center overflow-hidden md:hidden"
        style={{ height: pull, transition: start.current ? 'none' : 'height 0.25s ease' }}
        aria-hidden={!busy}
      >
        {pull > 0 && (
          <span className="mb-2 flex size-9 items-center justify-center rounded-full border bg-card shadow-md">
            <RefreshCw
              className={cn('size-4 text-primary', busy && 'animate-spin')}
              style={busy ? undefined : { transform: `rotate(${pull * 3.2}deg)`, opacity: Math.min(pull / PULL_TRIGGER, 1) }}
            />
          </span>
        )}
      </div>
      {children}
    </>
  )
}

/** Installed app (iPhone mein browser ka back gesture nahi hota): left edge se right swipe = back */
export function SwipeBack() {
  const { slug } = usePortal()
  const location = useLocation()
  const goBack = useGoBack()
  const [dx, setDx] = useState(0)
  const enabled = !!screenFor(slug, location.pathname).back
  const goRef = useRef(goBack)
  goRef.current = goBack

  useEffect(() => {
    if (!enabled || !isStandalone()) return
    let start: { x: number; y: number } | null = null
    let cur = 0
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t.clientX > 24 || !isMobileNow() || (e.target as HTMLElement).closest('[data-od-dialog]')) return
      start = { x: t.clientX, y: t.clientY }
    }
    const onMove = (e: TouchEvent) => {
      if (!start) return
      const t = e.touches[0]
      if (Math.abs(t.clientY - start.y) > 60) {
        start = null
        setDx((cur = 0))
        return
      }
      cur = Math.max(0, t.clientX - start.x)
      setDx(cur)
    }
    const onEnd = () => {
      if (start && cur > 90) goRef.current()
      start = null
      setDx((cur = 0))
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [enabled])

  if (!dx) return null
  const p = Math.min(dx / 90, 1)
  return (
    <div
      className="pointer-events-none fixed left-0 top-1/2 z-50 flex -translate-y-1/2 items-center justify-center rounded-r-full bg-primary text-primary-foreground shadow-lg"
      style={{ width: 18 + p * 26, height: 44, opacity: 0.35 + p * 0.65 }}
    >
      <ChevronLeft className="size-5" />
    </div>
  )
}

/** Bottom sheet ko neeche kheencho = band (Escape bhejte hain - Radix khud band karta hai) */
export function SheetSwipe() {
  useEffect(() => {
    let el: HTMLElement | null = null
    let startY = 0
    let dy = 0
    const onStart = (e: TouchEvent) => {
      if (!isMobileNow()) return
      const sheet = (e.target as HTMLElement).closest<HTMLElement>('[data-od-dialog]')
      if (!sheet || sheet.scrollTop > 0 || (e.target as HTMLElement).closest('input,textarea,select,[role="combobox"]')) return
      el = sheet
      startY = e.touches[0].clientY
      dy = 0
    }
    const onMove = (e: TouchEvent) => {
      if (!el) return
      dy = e.touches[0].clientY - startY
      if (dy < 0 || el.scrollTop > 0) {
        dy = 0
        el.style.transform = ''
        return
      }
      el.classList.add('od-dragging')
      el.style.transform = `translateY(${dy}px)`
    }
    const onEnd = () => {
      if (!el) return
      const sheet = el
      el = null
      sheet.classList.remove('od-dragging')
      if (dy > 110) {
        haptic(8)
        sheet.style.transform = 'translateY(100%)'
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      } else sheet.style.transform = ''
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [])
  return null
}

// ---------------- offline ----------------
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <div
      role="status"
      className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg md:bottom-4"
    >
      <WifiOff className="size-3.5" /> You're offline - check your connection. Your cart is saved.
    </div>
  )
}
