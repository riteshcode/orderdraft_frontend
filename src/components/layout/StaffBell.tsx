import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, BellOff, BellRing, CalendarClock, ShoppingCart } from 'lucide-react'
import { api } from '@/lib/api'
import type { StaffNotifications } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/**
 * Staff bell (top bar): naya online order, standing order bana, naya email order ...
 * Har 30 sec check. "Desktop notifications" on karo to browser band hone par bhi pop-up (staff-sw.js).
 */
const SW_SCOPE = '/__staff/'

function keyToBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function staffRegistration() {
  return (
    (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ||
    (await navigator.serviceWorker.register('/staff-sw.js', { scope: SW_SCOPE }))
  )
}

const ICONS: Record<string, typeof Bell> = { standing_order: CalendarClock, standing_skipped: CalendarClock }

export function StaffBell() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const data = useQuery({
    queryKey: ['staff-notifications'],
    queryFn: () => api.get<StaffNotifications>('/staff-notifications'),
    refetchInterval: 30_000,
  })
  const n = data.data
  const unread = n?.unread || 0

  // Naya order aaya (aur tab khula hai) -> chhota toast
  const lastTop = useRef<number | null>(null)
  useEffect(() => {
    const top = n?.items[0]
    if (!top) return
    if (lastTop.current !== null && top.id > lastTop.current && !top.read) {
      toast(top.title, {
        description: top.body || undefined,
        action: top.link_url ? { label: 'Open', onClick: () => navigate(top.link_url!) } : undefined,
      })
    }
    lastTop.current = top.id
  }, [n, navigate])

  const markRead = useMutation({
    mutationFn: (ids?: number[]) => api.post('/staff-notifications/read', ids ? { ids } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-notifications'] }),
  })

  const push = useMutation({
    mutationFn: async (on: boolean) => {
      if (!pushSupported()) throw new Error("This browser doesn't support desktop notifications")
      const reg = await staffRegistration()
      if (!on) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await api.post('/staff-push/unsubscribe', { endpoint: sub.endpoint })
          await sub.unsubscribe()
        }
        return false
      }
      if (!n?.push_public_key) throw new Error('Desktop notifications are not set up on this server yet (VAPID keys)')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Notifications are blocked - allow them in your browser settings')
      await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(n.push_public_key) }))
      await api.post('/staff-push/subscribe', sub.toJSON())
      return true
    },
    onSuccess: (on) => {
      toast.success(on ? 'Desktop notifications are on for this browser' : 'Desktop notifications turned off')
      qc.invalidateQueries({ queryKey: ['staff-notifications'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={unread ? `Notifications (${unread} new)` : 'Notifications'}
        >
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <button
              type="button"
              className="cursor-pointer text-xs text-primary hover:underline"
              onClick={() => markRead.mutate(undefined)}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!n?.items.length ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet. New online and standing orders show up here.
            </div>
          ) : (
            n.items.map((item) => {
              const Icon = ICONS[item.kind] || ShoppingCart
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer gap-2.5 border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted/60',
                    !item.read && 'bg-primary/5',
                  )}
                  onClick={() => {
                    if (!item.read) markRead.mutate([item.id])
                    setOpen(false)
                    if (item.link_url) navigate(item.link_url)
                  }}
                >
                  <Icon
                    className={cn('mt-0.5 size-4 shrink-0', item.kind === 'standing_skipped' ? 'text-amber-600' : 'text-primary')}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-sm', !item.read && 'font-semibold')}>{item.title}</div>
                    {item.body && <div className="line-clamp-2 text-xs text-muted-foreground">{item.body}</div>}
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(item.created_at)}</div>
                  </div>
                  {!item.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="unread" />}
                </button>
              )
            })
          )}
        </div>
        <div className="border-t px-3 py-2">
          {n?.push_subscribed ? (
            <Button variant="ghost" size="sm" className="w-full" disabled={push.isPending} onClick={() => push.mutate(false)}>
              <BellOff /> Turn off desktop notifications
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full" disabled={push.isPending} onClick={() => push.mutate(true)}>
              <BellRing /> Turn on desktop notifications
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
