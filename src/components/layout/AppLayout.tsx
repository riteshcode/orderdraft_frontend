import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Activity,
  ArrowLeftRight,
  Building2,
  ClipboardList,
  Truck,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Gauge,
  Inbox,
  LayoutDashboard,
  Boxes,
  BarChart3,
  FolderTree,
  Megaphone,
  BookOpen,
  History,
  Search,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  RefreshCw,
  Send,
  Settings,
  Shield,
  ShoppingCart,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { api, auth } from '@/lib/api'
import type { OrderStats } from '@/lib/types'
import { isProvider, PROVIDERS } from '@/lib/providers'
import { cn, timeAgo } from '@/lib/utils'
import { useMe } from '@/hooks/useMe'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { StaffBell } from '@/components/layout/StaffBell'
import { AppAnnouncements } from '@/components/layout/Announcements'
import { HelpButton } from '@/components/help/HelpDrawer'
import { Button } from '@/components/ui/button'
import { Progress, Spinner } from '@/components/ui/misc'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NavItem = { to: string; label: string; icon: typeof Inbox; badge?: number; end?: boolean; adminOnly?: boolean }

function NavSection({ title, items, onNavigate }: { title?: string; items: NavItem[]; onNavigate: () => void }) {
  return (
    <div className="space-y-0.5">
      {title && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors',
              isActive ? 'bg-white/10 font-medium text-white' : 'text-sidebar-foreground hover:bg-white/5 hover:text-white',
            )
          }
        >
          <item.icon className="size-4" />
          <span className="flex-1">{item.label}</span>
          {!!item.badge && (
            <span className="rounded-full bg-amber-500 px-1.5 py-px text-[11px] font-semibold text-white">{item.badge}</span>
          )}
        </NavLink>
      ))}
    </div>
  )
}

/** Header: connected accounting software (Xero / QuickBooks / MYOB) se products & customers sync */
function AccountingSyncButton() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const acc = me?.accounting
  const label = isProvider(acc?.provider) ? PROVIDERS[acc.provider].short : 'accounting'
  const sync = useMutation({
    mutationFn: () => api.post('/integrations/sync'),
    onSuccess: () => {
      toast.success(`${label} sync started - products, customers & suppliers will update shortly`)
      setTimeout(() => qc.invalidateQueries(), 4000)
    },
    onError: (e: Error) => toast.error(e.message),
  })
  if (!acc?.connected || me?.role === 'reviewer') return null
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => sync.mutate()}
      disabled={sync.isPending}
      title={`Last sync: ${timeAgo(acc.last_sync_at)}`}
    >
      {sync.isPending ? <Spinner className="size-3.5" /> : <RefreshCw />}
      <span className="hidden sm:inline">Sync {label}</span>
      <span className="hidden text-xs text-muted-foreground lg:inline">· {timeAgo(acc.last_sync_at)}</span>
    </Button>
  )
}

function UsageMeter() {
  const { data: me } = useMe()
  if (!me?.usage.orders_limit) return null
  const { orders_used, orders_limit, percent } = me.usage
  return (
    <Link to="/settings/billing" className="hidden w-40 space-y-1 md:block" title="Orders this billing period">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Orders</span>
        <span>
          {orders_used} / {orders_limit}
        </span>
      </div>
      <Progress value={percent} tone={percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'default'} className="h-1.5" />
    </Link>
  )
}

function Banners() {
  const { data: me } = useMe()
  if (!me) return null
  const u = me.usage
  const daysLeft = u.trial_ends_at ? Math.ceil((new Date(u.trial_ends_at + 'Z').getTime() - Date.now()) / 86_400_000) : null

  return (
    <>
      {me.impersonating && (
        <div className="flex items-center justify-center gap-3 bg-amber-400 px-4 py-1.5 text-sm font-medium text-amber-950">
          <Shield className="size-4" /> Viewing as {me.name} ({me.tenant.name})
          <button className="cursor-pointer underline" onClick={auth.stopImpersonation}>
            Exit
          </button>
        </div>
      )}
      {!u.can_process ? (
        <div className="flex items-center justify-center gap-3 bg-red-600 px-4 py-1.5 text-sm text-white">
          {u.blocked_reason || 'Order processing is paused.'} New orders are saved but not processed.
          {me.role === 'owner' && (
            <Link to="/settings/billing" className="font-semibold underline">
              Choose a plan
            </Link>
          )}
        </div>
      ) : u.subscription_status === 'trialing' && daysLeft !== null && daysLeft <= 7 ? (
        <div className="flex items-center justify-center gap-3 bg-primary px-4 py-1.5 text-sm text-white">
          Your free trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}.
          {me.role === 'owner' && (
            <Link to="/settings/billing" className="font-semibold underline">
              Upgrade now
            </Link>
          )}
        </div>
      ) : u.subscription_status === 'past_due' ? (
        <div className="bg-amber-500 px-4 py-1.5 text-center text-sm text-white">
          Payment failed - please update your card in Billing to avoid interruption.
        </div>
      ) : null}
    </>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: me } = useMe()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isAdminArea = location.pathname.startsWith('/admin')
  const isManager = me?.role === 'owner' || me?.role === 'admin'

  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => api.get<OrderStats>('/orders/stats'),
    refetchInterval: 15_000,
    enabled: !!me && !isAdminArea,
  })

  const close = () => setMobileOpen(false)

  // Ctrl+K / Cmd+K = search everything
  const [paletteOpen, setPaletteOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

  const sidebar = isAdminArea ? (
    <>
      <NavSection
        title="Platform"
        onNavigate={close}
        items={[
          { to: '/admin', label: 'Overview', icon: Gauge, end: true },
          { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
          { to: '/admin/plans', label: 'Plans', icon: CreditCard },
          { to: '/admin/announcements', label: 'Notifications', icon: Megaphone },
        ]}
      />
      <NavSection title="" onNavigate={close} items={[{ to: '/', label: 'Back to app', icon: ArrowLeftRight, end: true }]} />
    </>
  ) : (
    <>
      <NavSection
        onNavigate={close}
        items={[
          { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/orders', label: 'Orders', icon: ShoppingCart, badge: stats?.by_status.needs_review, end: true },
          { to: '/orders/new', label: 'New order', icon: PlusCircle },
          {
            to: '/inbox',
            label: 'Inbox log',
            icon: Inbox,
            badge: (stats?.failed_messages || 0) + (stats?.blocked_messages || 0),
          },
          { to: '/invoices', label: 'Invoices', icon: FileText },
          { to: '/reports', label: 'Reports', icon: BarChart3 },
        ]}
      />
      <NavSection
        title="Catalog"
        onNavigate={close}
        items={[
          { to: '/products', label: 'Products', icon: Package },
          { to: '/categories', label: 'Categories', icon: FolderTree },
          { to: '/stock', label: 'Stock', icon: Boxes },
          { to: '/customers', label: 'Customers', icon: Users },
          ...(isManager ? [{ to: '/imports', label: 'Import data', icon: Upload }] : []),
        ]}
      />
      <NavSection
        title="Purchasing"
        onNavigate={close}
        items={[
          { to: '/purchase-orders', label: 'Purchase orders', icon: ClipboardList },
          { to: '/suppliers', label: 'Suppliers', icon: Truck },
        ]}
      />
      {isManager && (
        <NavSection
          title="Delivery"
          onNavigate={close}
          items={[
            { to: '/destinations', label: 'Destinations', icon: Send },
            { to: '/exports', label: 'Export log', icon: Activity, badge: stats?.failed_exports },
            { to: '/integrations', label: 'Integrations', icon: FileSpreadsheet },
          ]}
        />
      )}
      <NavSection
        title="Account"
        onNavigate={close}
        items={[
          { to: '/settings', label: 'Settings', icon: Settings },
          ...(isManager ? [{ to: '/activity', label: 'Activity log', icon: History }] : []),
          { to: '/help', label: 'Help Center', icon: BookOpen },
        ]}
      />
      {me?.is_superadmin && !me.impersonating && (
        <NavSection title="" onNavigate={close} items={[{ to: '/admin', label: 'Super admin', icon: Shield }]} />
      )}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      {!isAdminArea && <AppAnnouncements />}
      <Banners />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar px-3 py-4 transition-transform lg:static lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="mb-4 flex items-center justify-between px-2">
            <Link to="/" className="flex items-center gap-2 text-white" onClick={close}>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold">OD</div>
              <span className="text-[15px] font-semibold">OrderDraft</span>
            </Link>
            <button className="text-slate-400 lg:hidden" onClick={close}>
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto">{sidebar}</nav>
          <div className="mt-4 truncate border-t border-white/10 px-2 pt-3 text-xs text-slate-400">{me?.tenant.name}</div>
        </aside>
        {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={close} />}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:px-6">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
            </button>
            <div className="hidden truncate text-sm font-medium text-muted-foreground xl:block">
              {isAdminArea ? 'Super admin' : me?.tenant.name}
            </div>
            <div className="flex flex-1 justify-center">
              {!isAdminArea && (
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="flex h-8 w-full max-w-sm cursor-pointer items-center gap-2 rounded-md border bg-muted/50 px-2.5 text-sm text-muted-foreground hover:bg-muted"
                  aria-label="Search everything"
                >
                  <Search className="size-4" />
                  <span className="flex-1 truncate text-left">Search or jump to...</span>
                  <kbd className="hidden rounded border bg-card px-1.5 text-[10px] sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
                </button>
              )}
            </div>
            {!isAdminArea && (
              <>
                <HelpButton />
                <StaffBell />
                <UsageMeter />
                <AccountingSyncButton />
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {me?.name?.[0]?.toUpperCase() || '?'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="font-medium text-foreground">{me?.name}</div>
                  <div>{me?.email}</div>
                  <div className="capitalize">{me?.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings/general">
                    <Settings /> Settings
                  </Link>
                </DropdownMenuItem>
                {me?.role === 'owner' && (
                  <DropdownMenuItem asChild>
                    <Link to="/settings/billing">
                      <CreditCard /> Billing
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={auth.logout}>
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 lg:px-6">{children}</main>
          {!isAdminArea && <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />}
        </div>
      </div>
    </div>
  )
}
