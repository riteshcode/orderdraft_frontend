import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Popover from '@radix-ui/react-popover'
import {
  Bell,
  ClipboardList,
  CalendarClock,
  Download,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Search,
  Shield,
  ShoppingBag,
  Store,
  User,
} from 'lucide-react'
import { portalAuth } from '@/lib/portalApi'
import type { PortalCategory, PortalNotice } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/misc'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PortalProvider, usePortal } from './context'
import { applyHead, registerPortalSW, useInstall } from './pwa'
import { headerClasses, loadFont, themeStyle, useRootTheme } from './theme'
import {
  BottomTabs,
  MobileHeader,
  OfflineBanner,
  PullToRefresh,
  Screen,
  SheetSwipe,
  Splash,
  SwipeBack,
  useAppChrome,
} from './PortalMobile'

/**
 * Customer portal ka frame: (staff "viewing as" patti) + announcement patti + header + category bar + page + footer.
 * Look admin ki settings se (brand colour, font, corners, header style, logo).
 * Guards: portal band -> message;  private + login nahi -> login;  temp password -> pehle naya password.
 */
export default function PortalApp() {
  const { slug = '' } = useParams()
  return (
    <PortalProvider slug={slug}>
      <PortalFrame />
    </PortalProvider>
  )
}

function PortalFrame() {
  const { slug, info, infoLoading, infoError, me, meLoading, loggedIn } = usePortal()
  const location = useLocation()
  useRootTheme(info?.branding)
  useAppChrome(slug, info)

  // App (PWA) setup: manifest, icon, theme colour, service worker, font
  useEffect(() => {
    if (!info) return
    applyHead(info, slug)
    loadFont(info.branding.font)
    registerPortalSW()
  }, [info, slug])

  if (infoLoading || meLoading) return <Splash slug={slug} />
  if (infoError || !info)
    return <Closed title="Portal not found" text="This ordering portal doesn't exist. Please check the link." />
  if (!info.enabled)
    return (
      <Closed
        title={info.name}
        logo={info.branding.logo_url}
        text={`Online ordering isn't open yet. Please contact us to order${info.phone ? ` on ${info.phone}` : ''}${info.email ? ` or ${info.email}` : ''}.`}
      />
    )
  if (me?.must_change_password) return <Navigate to={`/portal/${slug}/change-password`} replace />
  if (info.access === 'private' && !loggedIn)
    return <Navigate to={`/portal/${slug}/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />

  const b = info.branding
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background" style={themeStyle(b)}>
      {me?.impersonated_by && (
        <div className="flex items-center justify-center gap-3 bg-amber-400 px-4 py-1.5 text-sm font-medium text-amber-950">
          <Shield className="size-4" /> Viewing as {me.name} ({me.customer.name}) - staff: {me.impersonated_by}
          <button className="cursor-pointer underline" onClick={() => portalAuth.logout(slug)}>
            Exit
          </button>
        </div>
      )}
      {b.announcement && (
        <div className="hidden bg-primary px-4 py-1.5 text-center text-xs font-medium tracking-wide text-primary-foreground md:block">
          {b.announcement}
        </div>
      )}
      <Header />
      <CategoryBar />
      {/* Phone: app bar + neeche tabs (desktop pe dono chhupe) */}
      <MobileHeader />
      {b.announcement && (
        <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground md:hidden">
          {b.announcement}
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-3 md:py-6">
        <PullToRefresh>
          <Suspense
            fallback={
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            }
          >
            <Screen>
              <Outlet />
            </Screen>
          </Suspense>
        </PullToRefresh>
      </main>
      <Footer />
      <BottomTabs />
      <OfflineBanner />
      <SwipeBack />
      <SheetSwipe />
    </div>
  )
}

function Closed({ title, text, logo }: { title: string; text: string; logo?: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="max-w-md space-y-3 text-center">
        {logo ? (
          <img src={logo} alt="" className="mx-auto h-12 object-contain" />
        ) : (
          <Store className="mx-auto size-8 text-muted-foreground" />
        )}
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

export function Brand({ compact = false, onColour = false }: { compact?: boolean; onColour?: boolean }) {
  const { slug, info } = usePortal()
  const b = info!.branding
  return (
    <Link to={`/portal/${slug}`} className="flex min-w-0 shrink-0 items-center gap-2.5">
      {b.logo_url ? (
        <img
          src={b.logo_url}
          alt={info!.name}
          className={cn(
            'w-auto object-contain',
            compact ? 'h-8' : 'h-9 max-w-40',
            // Rangeen header pe logo safed pill mein - koi bhi logo saaf dikhe
            (onColour || (!compact && b.header_style !== 'light')) && 'rounded-lg bg-white/95 px-1.5 py-1',
          )}
        />
      ) : (
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
            onColour ? 'bg-white text-primary' : 'bg-primary text-primary-foreground',
          )}
        >
          {info!.name
            .split(/\s+/)
            .filter((w) => !/^(pty|ltd)$/i.test(w))
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase()}
        </span>
      )}
      {!b.logo_url && (
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold leading-tight">{info!.name}</span>
          {b.tagline && !compact && <span className="hidden truncate text-xs opacity-70 sm:block">{b.tagline}</span>}
        </span>
      )}
    </Link>
  )
}

function Header() {
  const { slug, info, me, loggedIn, cartCount, logout } = usePortal()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const base = `/portal/${slug}`
  const style = info!.branding.header_style
  const search = (e: FormEvent) => {
    e.preventDefault()
    navigate(`${base}/shop?q=${encodeURIComponent(q.trim())}`)
  }
  const ghost = style === 'light' ? '' : 'text-inherit hover:bg-white/15 hover:text-inherit'
  return (
    <header className={cn('sticky top-0 z-30 hidden border-b shadow-[0_1px_0_rgba(0,0,0,0.02)] md:block', headerClasses(style))}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Brand />
        <form onSubmit={search} className="relative mx-auto hidden w-full max-w-md md:block">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            aria-label="Search products"
            className="h-10 w-full rounded-full border bg-card pl-9 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:ring-2 focus:ring-ring"
            placeholder="Search products"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <div className="ml-auto flex items-center gap-0.5 md:ml-0">
          {loggedIn && <NotificationBell className={ghost} />}
          <Button variant="ghost" size="sm" asChild className={ghost}>
            <Link to={`${base}/cart`} aria-label="Cart" className="relative">
              <ShoppingBag />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-semibold leading-5 text-primary-foreground ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
          {loggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Account" className={ghost}>
                  <User /> <span className="hidden max-w-32 truncate sm:inline">{me?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="font-medium text-foreground">{me?.name}</div>
                  <div>{me?.customer.name}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`${base}/orders`}>
                    <ClipboardList /> My orders
                  </Link>
                </DropdownMenuItem>
                {info?.allow_standing && (
                  <DropdownMenuItem asChild>
                    <Link to={`${base}/standing`}>
                      <CalendarClock /> Standing orders
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to={`${base}/notifications`}>
                    <Bell /> Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`${base}/profile`}>
                    <User /> Profile & address
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild className={style === 'brand' ? 'bg-white text-slate-900 hover:bg-white/90' : ''}>
              <Link to={`${base}/login`}>
                <LogIn /> Log in
              </Link>
            </Button>
          )}
        </div>
      </div>
      <form onSubmit={search} className="relative px-4 pb-3 md:hidden">
        <Search className="absolute left-7 top-2.5 size-4 text-muted-foreground" />
        <input
          aria-label="Search products (mobile)"
          className="h-10 w-full rounded-full border bg-card pl-9 pr-4 text-sm text-foreground outline-none"
          placeholder="Search products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
    </header>
  )
}

/** Bell: admin ke messages. Kholte hi "read" */
export function NotificationBell({ className }: { className?: string }) {
  const { slug, get, post } = usePortal()
  const qc = useQueryClient()
  const data = useQuery({
    queryKey: ['portal', slug, 'notifications'],
    queryFn: () => get<{ items: PortalNotice[]; unread: number }>('/notifications'),
    refetchInterval: 120_000,
  })
  const read = useMutation({
    mutationFn: () => post('/notifications/read', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', slug, 'notifications'] }),
  })
  const unread = data.data?.unread || 0
  return (
    <Popover.Root onOpenChange={(o) => o && unread && read.mutate()}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Notifications${unread ? ` (${unread} new)` : ''}`}
          className={cn('relative', className)}
        >
          <Bell />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-card p-1 text-foreground shadow-xl"
        >
          <div className="px-3 py-2 text-sm font-semibold">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {(data.data?.items || []).slice(0, 6).map((n) => (
              <NoticeRow key={n.id} n={n} />
            ))}
            {!data.data?.items.length && <p className="px-3 py-4 text-sm text-muted-foreground">No messages yet.</p>}
          </div>
          <Link
            to={`/portal/${slug}/notifications`}
            className="block border-t px-3 py-2 text-center text-sm font-medium text-primary hover:underline"
          >
            See all & notification settings
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function NoticeRow({ n }: { n: PortalNotice }) {
  const inner = (
    <div className="flex gap-2.5 rounded-lg px-3 py-2 hover:bg-muted/60">
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read === false ? 'bg-primary' : 'bg-transparent')} />
      <div className="min-w-0">
        <div className="text-sm font-medium">{n.title}</div>
        {n.body && <div className="whitespace-pre-line text-xs text-muted-foreground">{n.body}</div>}
        <div className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</div>
      </div>
    </div>
  )
  if (!n.link_url) return inner
  return /^https?:/.test(n.link_url) ? (
    <a href={n.link_url} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    <Link to={n.link_url}>{inner}</Link>
  )
}

export function CategoryBar({ mobile = false }: { mobile?: boolean }) {
  const { slug, get, info } = usePortal()
  const onColour = mobile && info?.branding.header_style !== 'light' // rangeen header pe active chip safed
  const cats = useQuery({ queryKey: ['portal', slug, 'categories'], queryFn: () => get<PortalCategory[]>('/catalog/categories') })
  const location = useLocation()
  const current = new URLSearchParams(location.search).get('category')
  if (!cats.data?.length) return null
  const base = `/portal/${slug}`
  const chip = (active: boolean) =>
    cn(
      'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition',
      active
        ? onColour
          ? 'bg-white text-slate-900 shadow-sm'
          : 'bg-primary text-primary-foreground shadow-sm'
        : mobile
          ? 'border bg-card text-muted-foreground active:scale-95'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    )
  return (
    <nav className={mobile ? 'text-foreground' : 'hidden border-b bg-card md:block'}>
      <div
        className={cn(
          'mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]',
          mobile && 'gap-1.5 px-3 pb-2.5 pt-0',
        )}
      >
        <NavLink to={`${base}/shop`} className={() => chip(location.pathname.endsWith('/shop') && !current)}>
          All products
        </NavLink>
        {cats.data.map((c) => (
          <Link
            key={c.id}
            to={`${base}/shop?category=${c.id}`}
            className={chip(current === String(c.id) || c.children.some((s) => String(s.id) === current))}
          >
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}

/** "Install app" - Android/desktop button, iPhone pe Share -> Add to Home Screen */
export function InstallCard({ className }: { className?: string }) {
  const { info } = usePortal()
  const app = useInstall()
  const [iosHelp, setIosHelp] = useState(false)
  if (app.installed || (!app.canInstall && !app.ios)) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-2xl border bg-accent p-4', className)}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Download className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Get the {info?.name} app</div>
        <div className="text-xs text-muted-foreground">
          {iosHelp
            ? 'Tap the Share button in Safari, then "Add to Home Screen".'
            : 'Order in two taps and get notified about specials.'}
        </div>
      </div>
      {app.canInstall ? (
        <Button size="sm" onClick={() => app.install()}>
          Install
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setIosHelp(true)}>
          How?
        </Button>
      )}
    </div>
  )
}

function Footer() {
  const { info } = usePortal()
  const b = info!.branding
  return (
    <footer className="mt-8 hidden border-t bg-card md:block">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div className="space-y-2">
          <Brand compact />
          {b.tagline && <p className="text-muted-foreground">{b.tagline}</p>}
        </div>
        <div className="space-y-1.5 text-muted-foreground">
          <div className="font-medium text-foreground">Contact</div>
          {info!.phone && (
            <a href={`tel:${info!.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-foreground">
              <Phone className="size-3.5" /> {info!.phone}
            </a>
          )}
          {info!.email && (
            <a href={`mailto:${info!.email}`} className="flex items-center gap-2 hover:text-foreground">
              <Mail className="size-3.5" /> {info!.email}
            </a>
          )}
          {info!.address && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0" /> <span className="whitespace-pre-line">{info!.address}</span>
            </div>
          )}
        </div>
        <div className="space-y-1.5 text-muted-foreground">
          {b.footer_text && <p className="whitespace-pre-line">{b.footer_text}</p>}
          <p className="text-xs">Prices {info!.prices_include_gst ? 'include' : 'exclude'} GST.</p>
        </div>
      </div>
    </footer>
  )
}
