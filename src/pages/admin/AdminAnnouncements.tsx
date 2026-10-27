import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Megaphone, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Announcement, AnnouncementLevel, Role } from '@/lib/types'
import { cn, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingRows } from '@/components/common/states'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { LEVEL_STYLE, NoticeBanner } from '@/components/layout/Announcements'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

/**
 * Super admin -> Notifications: sab clients (ya chune hue / plan / role) ko notice.
 * Banner = upar patti, Popup = beech mein dialog (zaroori). Login page pe bhi dikha sakte ho.
 */
type Targets = {
  tenants: { id: number; name: string; slug: string; plan_id: number | null }[]
  plans: { id: number; name: string }[]
}

type Form = {
  title: string
  body: string
  level: AnnouncementLevel
  display: 'banner' | 'popup'
  audience: 'all' | 'tenants' | 'plans'
  tenant_ids: number[]
  plan_ids: number[]
  roles: Role[]
  show_in_app: boolean
  show_on_login: boolean
  dismissible: boolean
  link_url: string
  link_text: string
  starts_at: string
  ends_at: string
  is_active: boolean
}

const EMPTY: Form = {
  title: '',
  body: '',
  level: 'info',
  display: 'banner',
  audience: 'all',
  tenant_ids: [],
  plan_ids: [],
  roles: [],
  show_in_app: true,
  show_on_login: false,
  dismissible: true,
  link_url: '',
  link_text: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
}

// Server UTC rakhta hai; input local time dikhata hai
const toLocalInput = (v?: string | null) => {
  if (!v) return ''
  const d = new Date(v.endsWith('Z') ? v : v + 'Z')
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}
const toUtc = (v: string) => (v ? new Date(v).toISOString().slice(0, 19) : null)

function status(a: Announcement) {
  const now = Date.now()
  const t = (v?: string | null) => (v ? new Date(v.endsWith('Z') ? v : v + 'Z').getTime() : null)
  if (!a.is_active) return <Badge variant="secondary">Off</Badge>
  if (t(a.starts_at) && t(a.starts_at)! > now) return <Badge variant="info">Scheduled</Badge>
  if (t(a.ends_at) && t(a.ends_at)! <= now) return <Badge variant="secondary">Ended</Badge>
  return <Badge variant="success">Live</Badge>
}

export default function AdminAnnouncements() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const list = useQuery({ queryKey: ['admin-announcements'], queryFn: () => api.get<Announcement[]>('/admin/announcements') })
  const targets = useQuery({
    queryKey: ['admin-announcement-targets'],
    queryFn: () => api.get<Targets>('/admin/announcements/targets'),
  })
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null)

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-announcements'] })
    qc.invalidateQueries({ queryKey: ['announcements'] })
    qc.invalidateQueries({ queryKey: ['public-announcements'] })
  }
  const remove = useMutation({
    mutationFn: (a: Announcement) => api.del(`/admin/announcements/${a.id}`),
    onSuccess: () => {
      toast.success('Deleted')
      refresh()
    },
  })
  const reset = useMutation({
    mutationFn: (a: Announcement) => api.post<{ reset: number }>(`/admin/announcements/${a.id}/reset-dismissals`),
    onSuccess: (r) => {
      toast.success(`Shown again to ${r.reset} user${r.reset === 1 ? '' : 's'} who had closed it`)
      refresh()
    },
  })

  const audienceText = (a: Announcement) => {
    const roles = a.roles?.length ? ` · ${a.roles.join(', ')}` : ''
    if (a.audience === 'tenants') {
      const names = (targets.data?.tenants || []).filter((t) => a.tenant_ids?.includes(t.id)).map((t) => t.name)
      return `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}${roles}`
    }
    if (a.audience === 'plans') {
      const names = (targets.data?.plans || []).filter((p) => a.plan_ids?.includes(p.id)).map((p) => p.name)
      return `Plan: ${names.join(', ')}${roles}`
    }
    return `All clients${roles}`
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Tell your clients about maintenance, new features or problems. Shows as a banner or popup in their app - and on the login page if you want."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus /> New notification
          </Button>
        }
      />
      <Card>
        {list.isLoading ? (
          <LoadingRows />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorState error={list.error} />
          </div>
        ) : !list.data?.length ? (
          <EmptyState icon={Megaphone} title="No notifications yet" description="Create one to show a message to your clients." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Notification</TH>
                <TH>Who sees it</TH>
                <TH>Where</TH>
                <TH>Status</TH>
                <TH className="text-right">Closed by</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {list.data.map((a) => {
                const st = LEVEL_STYLE[a.level]
                return (
                  <TR key={a.id}>
                    <TD className="max-w-sm">
                      <div className="flex items-center gap-1.5 font-medium">
                        <st.icon className={cn('size-4', a.level === 'critical' ? 'text-red-600' : '')} />
                        {a.title}
                      </div>
                      {a.body && <div className="truncate text-xs text-muted-foreground">{a.body}</div>}
                      <div className="text-[11px] text-muted-foreground">
                        {a.starts_at ? `From ${formatDateTime(a.starts_at)}` : `Created ${formatDateTime(a.created_at)}`}
                        {a.ends_at && ` · until ${formatDateTime(a.ends_at)}`}
                      </div>
                    </TD>
                    <TD className="text-xs">{audienceText(a)}</TD>
                    <TD className="text-xs">
                      {[a.show_in_app && (a.display === 'popup' ? 'App popup' : 'App banner'), a.show_on_login && 'Login page']
                        .filter(Boolean)
                        .join(' + ')}
                      {!a.dismissible && <div className="text-amber-700">Can't be closed</div>}
                    </TD>
                    <TD>{status(a)}</TD>
                    <TD className="text-right tabular-nums">{a.dismissed_count ?? 0}</TD>
                    <TD className="whitespace-nowrap text-right">
                      {!!a.dismissed_count && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Show again to people who closed it"
                          onClick={() => reset.mutate(a)}
                        >
                          <RotateCcw />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(a)}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={async () => {
                          if (await confirm({ title: `Delete "${a.title}"?`, destructive: true, confirmText: 'Delete' }))
                            remove.mutate(a)
                        }}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>
      {editing && (
        <AnnouncementDialog
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? null : editing}
          targets={targets.data}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

function AnnouncementDialog({
  item,
  targets,
  onClose,
  onSaved,
}: {
  item: Announcement | null
  targets?: Targets
  onClose: () => void
  onSaved: () => void
}) {
  const [f, setF] = useState<Form>(() =>
    item
      ? {
          title: item.title,
          body: item.body || '',
          level: item.level,
          display: item.display,
          audience: item.audience || 'all',
          tenant_ids: item.tenant_ids || [],
          plan_ids: item.plan_ids || [],
          roles: item.roles || [],
          show_in_app: item.show_in_app ?? true,
          show_on_login: item.show_on_login ?? false,
          dismissible: item.dismissible,
          link_url: item.link_url || '',
          link_text: item.link_text || '',
          starts_at: toLocalInput(item.starts_at),
          ends_at: toLocalInput(item.ends_at),
          is_active: item.is_active ?? true,
        }
      : EMPTY,
  )
  const [error, setError] = useState('')
  const [tenantSearch, setTenantSearch] = useState('')
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const tenants = useMemo(
    () =>
      (targets?.tenants || []).filter(
        (t) => !tenantSearch || `${t.name} ${t.slug}`.toLowerCase().includes(tenantSearch.toLowerCase()),
      ),
    [targets, tenantSearch],
  )

  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, starts_at: toUtc(f.starts_at), ends_at: toUtc(f.ends_at), body: f.body || null }
      return item ? api.put(`/admin/announcements/${item.id}`, body) : api.post('/admin/announcements', body)
    },
    onSuccess: () => {
      toast.success(item ? 'Notification saved' : 'Notification created')
      onSaved()
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const preview: Announcement = {
    id: 0,
    title: f.title || 'Your title',
    body: f.body || null,
    level: f.level,
    display: f.display,
    dismissible: f.dismissible,
    link_url: f.link_url || null,
    link_text: f.link_text || null,
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit notification' : 'New notification'}</DialogTitle>
        </DialogHeader>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *" className="sm:col-span-2">
            <Input
              value={f.title}
              maxLength={200}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Scheduled maintenance Sunday 10pm AEST"
            />
          </Field>
          <Field label="Message" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={f.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="What's happening and what they should do"
            />
          </Field>
          <Field label="Type">
            <Select value={f.level} onChange={(e) => set('level', e.target.value as AnnouncementLevel)}>
              <option value="info">Info (blue)</option>
              <option value="success">Good news (green)</option>
              <option value="warning">Warning (amber)</option>
              <option value="critical">Critical (red)</option>
            </Select>
          </Field>
          <Field label="Show as" hint="Popup = shown in the middle of the screen until they click OK">
            <Select value={f.display} onChange={(e) => set('display', e.target.value as Form['display'])}>
              <option value="banner">Banner at the top</option>
              <option value="popup">Popup (important)</option>
            </Select>
          </Field>

          <Field label="Who sees it" className="sm:col-span-2">
            <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
              {(['all', 'tenants', 'plans'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set('audience', v)}
                  className={cn(
                    'rounded-md px-3 py-1 font-medium text-muted-foreground',
                    f.audience === v && 'bg-card text-foreground shadow-sm',
                  )}
                >
                  {v === 'all' ? 'All clients' : v === 'tenants' ? 'Chosen clients' : 'By plan'}
                </button>
              ))}
            </div>
          </Field>
          {f.audience === 'tenants' && (
            <div className="space-y-2 sm:col-span-2">
              <Input placeholder="Search clients" value={tenantSearch} onChange={(e) => setTenantSearch(e.target.value)} />
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
                {tenants.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={f.tenant_ids.includes(t.id)}
                      onChange={() => set('tenant_ids', toggleIn(f.tenant_ids, t.id))}
                    />
                    {t.name} <span className="text-xs text-muted-foreground">{t.slug}</span>
                  </label>
                ))}
                {!tenants.length && <p className="text-xs text-muted-foreground">No clients found</p>}
              </div>
              <p className="text-xs text-muted-foreground">{f.tenant_ids.length} selected</p>
            </div>
          )}
          {f.audience === 'plans' && (
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              {(targets?.plans || []).map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={f.plan_ids.includes(p.id)}
                    onChange={() => set('plan_ids', toggleIn(f.plan_ids, p.id))}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Roles (none ticked = everyone)</Label>
            <div className="flex flex-wrap gap-4">
              {(['owner', 'admin', 'reviewer'] as Role[]).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm capitalize">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={f.roles.includes(r)}
                    onChange={() => set('roles', toggleIn(f.roles, r))}
                  />
                  {r}s
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.show_in_app} onCheckedChange={(v) => set('show_in_app', v)} /> Show inside the app
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.show_on_login} onCheckedChange={(v) => set('show_on_login', v)} /> Also show on the login page
              (everyone sees it there, before logging in)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.dismissible} onCheckedChange={(v) => set('dismissible', v)} /> Users can close it (X)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.is_active} onCheckedChange={(v) => set('is_active', v)} /> On
            </label>
          </div>
          <Field label="Start showing" hint="Empty = now (your local time)">
            <Input type="datetime-local" value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
          </Field>
          <Field label="Stop showing" hint="Empty = until you turn it off">
            <Input type="datetime-local" value={f.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
          </Field>
          <Field label="Link (optional)" hint="https://status... or /settings/billing">
            <Input value={f.link_url} onChange={(e) => set('link_url', e.target.value)} />
          </Field>
          <Field label="Link text">
            <Input
              value={f.link_text}
              maxLength={100}
              onChange={(e) => set('link_text', e.target.value)}
              placeholder="Learn more"
            />
          </Field>
        </div>
        <div className="space-y-1">
          <Label>Preview</Label>
          <div className="overflow-hidden rounded-lg border">
            <NoticeBanner a={preview} onDismiss={() => {}} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || !f.title.trim()} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} {item ? 'Save' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
