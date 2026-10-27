import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertTriangle, CheckCircle2, Info, Megaphone, OctagonAlert, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Announcement, AnnouncementLevel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Super admin ke notices (Admin -> Notifications).
 *   <AppAnnouncements />    app ke andar: banner (upar patti) + popup (zaroori - beech mein dialog)
 *   <LoginAnnouncements />  login / register page pe (bina login, "show on login page" wale)
 * Band (X) kiya to server yaad rakhta hai (app) / browser yaad rakhta hai (login page).
 */
export const LEVEL_STYLE: Record<AnnouncementLevel, { box: string; icon: typeof Info; label: string }> = {
  info: { box: 'bg-blue-50 text-blue-900 border-blue-200', icon: Info, label: 'Info' },
  success: { box: 'bg-green-50 text-green-900 border-green-200', icon: CheckCircle2, label: 'Good news' },
  warning: { box: 'bg-amber-50 text-amber-900 border-amber-300', icon: AlertTriangle, label: 'Heads up' },
  critical: { box: 'bg-red-600 text-white border-red-700', icon: OctagonAlert, label: 'Important' },
}

function NoticeLink({ a, className }: { a: Announcement; className?: string }) {
  if (!a.link_url) return null
  const external = /^https?:/.test(a.link_url)
  return (
    <a
      href={a.link_url}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cn('font-semibold underline underline-offset-2', className)}
    >
      {a.link_text || 'Learn more'}
    </a>
  )
}

export function NoticeBanner({ a, onDismiss }: { a: Announcement; onDismiss?: () => void }) {
  const st = LEVEL_STYLE[a.level]
  return (
    <div role="status" className={cn('flex items-start gap-2.5 border-b px-4 py-2 text-sm', st.box)}>
      <st.icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold">{a.title}</span>
        {a.body && <span className="whitespace-pre-line"> - {a.body}</span>} <NoticeLink a={a} />
      </div>
      {a.dismissible && onDismiss && (
        <button
          type="button"
          aria-label="Close notice"
          className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          onClick={onDismiss}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

/** onClose: dismissible = server pe band; warna is session mein banner ban jaata hai (notice dikhta rahe) */
function NoticePopup({ a, onClose }: { a: Announcement; onClose: () => void }) {
  const st = LEVEL_STYLE[a.level]
  const close = onClose
  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-slate-900/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-card shadow-2xl"
        >
          <div className={cn('flex items-center gap-2 px-5 py-3 text-sm font-semibold', st.box)}>
            <st.icon className="size-4" /> {st.label}
          </div>
          <div className="space-y-3 px-5 py-4">
            <DialogPrimitive.Title className="text-lg font-semibold">{a.title}</DialogPrimitive.Title>
            {a.body && <p className="whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {a.link_url && (
                <Button variant="outline" asChild>
                  <a href={a.link_url} target={/^https?:/.test(a.link_url) ? '_blank' : undefined} rel="noreferrer">
                    {a.link_text || 'Learn more'}
                  </a>
                </Button>
              )}
              <Button onClick={close}>{a.dismissible ? 'Got it' : 'OK'}</Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function AppAnnouncements() {
  const qc = useQueryClient()
  const [seenPopups, setSeenPopups] = useState<Set<number>>(new Set())
  const list = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get<Announcement[]>('/announcements'),
    refetchInterval: 5 * 60_000, // naya notice 5 min mein dikh jaaye, refresh ke bina
    staleTime: 60_000,
  })
  const dismiss = useMutation({
    mutationFn: (id: number) => api.post(`/announcements/${id}/dismiss`),
    onMutate: (id) => qc.setQueryData<Announcement[]>(['announcements'], (old) => (old || []).filter((x) => x.id !== id)),
  })
  const items = list.data || []
  const popup = items.find((a) => a.display === 'popup' && !seenPopups.has(a.id))
  // Popup band ho gaya (non-dismissible) to banner ki tarah upar rehta hai
  const banners = items.filter((a) => a.display === 'banner' || seenPopups.has(a.id))
  return (
    <>
      {banners.map((a) => (
        <NoticeBanner key={a.id} a={a} onDismiss={() => dismiss.mutate(a.id)} />
      ))}
      {popup && (
        <NoticePopup
          key={popup.id}
          a={popup}
          onClose={() => {
            if (popup.dismissible) dismiss.mutate(popup.id)
            else setSeenPopups((s) => new Set(s).add(popup.id))
          }}
        />
      )}
    </>
  )
}

const LOGIN_KEY = 'od_closed_notices'
function closedLogin(): number[] {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_KEY) || '[]')
  } catch {
    return []
  }
}

export function LoginAnnouncements() {
  const [closed, setClosed] = useState<number[]>(closedLogin)
  const list = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => api.get<Announcement[]>('/public/announcements'),
    retry: false,
  })
  const items = (list.data || []).filter((a) => !(a.dismissible && closed.includes(a.id)))
  if (!items.length) return null
  const close = (id: number) => {
    const next = [...closed, id]
    setClosed(next)
    try {
      localStorage.setItem(LOGIN_KEY, JSON.stringify(next.slice(-50)))
    } catch {
      /* private mode */
    }
  }
  return (
    <div className="mb-4 space-y-2">
      {items.map((a) => {
        const st = LEVEL_STYLE[a.level]
        return (
          <div key={a.id} role="status" className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm', st.box)}>
            <Megaphone className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{a.title}</div>
              {a.body && <div className="whitespace-pre-line opacity-90">{a.body}</div>}
              <NoticeLink a={a} />
            </div>
            {a.dismissible && (
              <button
                type="button"
                aria-label="Close notice"
                className="shrink-0 opacity-70 hover:opacity-100"
                onClick={() => close(a.id)}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
