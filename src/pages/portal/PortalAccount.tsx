import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Download,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react'
import type { PortalNotice } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { usePortal } from './context'
import { haptic } from './native'
import { useInstall } from './pwa'

/**
 * Account tab (phone app jaisa settings list): profile, orders, standing orders, notifications,
 * app install, contact, log out. Desktop pe bhi khulta hai (/portal/<slug>/account).
 */
export default function PortalAccount() {
  const { slug, info, me, loggedIn, logout, get } = usePortal()
  const confirm = useConfirm()
  const app = useInstall()
  const [iosHelp, setIosHelp] = useState(false)
  const base = `/portal/${slug}`
  const notices = useQuery({
    queryKey: ['portal', slug, 'notifications'],
    queryFn: () => get<{ items: PortalNotice[]; unread: number }>('/notifications'),
    enabled: loggedIn,
  })
  const initials = (me?.name || me?.customer.name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {loggedIn && me ? (
        <div className="flex items-center gap-3.5 rounded-2xl border bg-card p-4 shadow-sm">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{me.name}</div>
            <div className="truncate text-sm text-muted-foreground">{me.customer.name}</div>
            <div className="truncate text-xs text-muted-foreground">{me.email}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border bg-card p-5 text-center shadow-sm">
          <UserRound className="mx-auto size-10 text-muted-foreground" />
          <div>
            <div className="font-semibold">Welcome to {info?.name}</div>
            <div className="text-sm text-muted-foreground">Log in to see your prices, place orders and track them.</div>
          </div>
          <Button asChild className="w-full">
            <Link to={`${base}/login?next=${encodeURIComponent(`${base}/account`)}`}>
              <LogIn /> Log in
            </Link>
          </Button>
        </div>
      )}

      {loggedIn && (
        <Group title="Ordering">
          <Row icon={ClipboardList} label="My orders" to={`${base}/orders`} />
          {info?.allow_standing && (
            <Row icon={CalendarClock} label="Standing orders" hint="Your regular weekly orders" to={`${base}/standing`} />
          )}
          <Row
            icon={Bell}
            label="Notifications"
            to={`${base}/notifications`}
            badge={notices.data?.unread ? String(notices.data.unread) : undefined}
          />
        </Group>
      )}

      {loggedIn && (
        <Group title="Account">
          <Row icon={UserRound} label="Profile, address & password" to={`${base}/profile`} />
        </Group>
      )}

      {!app.installed && (app.canInstall || app.ios) && (
        <Group title="App">
          <Row
            icon={Download}
            label={`Install the ${info?.name} app`}
            hint={iosHelp ? 'Tap Share in Safari, then "Add to Home Screen"' : 'Order faster from your home screen'}
            onClick={async () => {
              if (app.canInstall) await app.install()
              else setIosHelp(true)
            }}
          />
        </Group>
      )}

      {(info?.phone || info?.email || info?.address) && (
        <Group title={`Contact ${info?.name}`}>
          {info?.phone && <Row icon={Phone} label={info.phone} hint="Call us" href={`tel:${info.phone.replace(/\s/g, '')}`} />}
          {info?.email && <Row icon={Mail} label={info.email} hint="Email us" href={`mailto:${info.email}`} />}
          {info?.address && <Row icon={MapPin} label={info.address} multiline />}
        </Group>
      )}

      {loggedIn && (
        <Group>
          <Row
            icon={LogOut}
            label="Log out"
            danger
            onClick={async () => {
              if (
                await confirm({ title: 'Log out?', description: 'Your cart stays saved on this device.', confirmText: 'Log out' })
              )
                logout()
            }}
          />
        </Group>
      )}

      <div className="space-y-1 px-2 pb-2 text-center text-xs text-muted-foreground">
        {info?.branding.footer_text && <p className="whitespace-pre-line">{info.branding.footer_text}</p>}
        <p>Prices {info?.prices_include_gst ? 'include' : 'exclude'} GST.</p>
      </div>
    </div>
  )
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      {title && <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>}
      <div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">{children}</div>
    </section>
  )
}

function Row({
  icon: Icon,
  label,
  hint,
  to,
  href,
  onClick,
  badge,
  danger,
  multiline,
}: {
  icon: typeof Bell
  label: string
  hint?: string
  to?: string
  href?: string
  onClick?: () => void
  badge?: string
  danger?: boolean
  multiline?: boolean
}) {
  const inner = (
    <>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl',
          danger ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            'block text-[15px] font-medium',
            multiline ? 'whitespace-pre-line' : 'truncate',
            danger && 'text-red-600',
          )}
        >
          {label}
        </span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      {badge && (
        <span className="min-w-5 rounded-full bg-red-500 px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
          {badge}
        </span>
      )}
      {(to || onClick) && !danger && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-3.5 py-3 transition-colors active:bg-muted'
  if (to)
    return (
      <Link to={to} className={cls} onClick={() => haptic(6)}>
        {inner}
      </Link>
    )
  if (href)
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    )
  if (onClick)
    return (
      <button type="button" className={cn(cls, 'cursor-pointer')} onClick={onClick}>
        {inner}
      </button>
    )
  return <div className={cls}>{inner}</div>
}
