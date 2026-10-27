import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, ImagePlus, Search, Send, ShoppingBag, Smartphone, Trash2, UserPlus, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Customer, Paged, PortalLogin, PortalNoticeAdmin, PortalSettings as Settings } from '@/lib/types'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'
import { usePermission } from '@/hooks/useMe'
import { useDebounce } from '@/hooks/useDebounce'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { LoadingRows } from '@/components/common/states'
import { PortalLoginActions } from '@/components/common/PortalLoginActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { SearchSelect, customerOption } from '@/components/ui/search-select'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { COLOR_PRESETS, CORNERS, FONTS, headerClasses, loadFont, themeStyle } from '@/pages/portal/theme'

/* ======================= Look & feel ======================= */

type Look = Pick<Settings, 'brand_color' | 'header_style' | 'font' | 'corners' | 'tagline' | 'announcement' | 'footer_text'>

export function BrandingCard({ settings }: { settings: Settings }) {
  const qc = useQueryClient()
  const { isAdmin } = usePermission()
  const [f, setF] = useState<Look>(() => pickLook(settings))
  useEffect(() => setF(pickLook(settings)), [settings])
  useEffect(() => loadFont(f.font), [f.font])
  const set = <K extends keyof Look>(k: K, v: Look[K]) => setF({ ...f, [k]: v })

  const save = useMutation({
    mutationFn: () => api.put<Settings>('/settings/portal', { ...f, brand_color: f.brand_color || null }),
    onSuccess: (s) => {
      qc.setQueryData(['portal-settings'], s)
      toast.success('Look & feel saved - refresh the portal to see it')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: 'logo' | 'icon'; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api.upload<Settings>(`/settings/portal/${kind}`, form)
    },
    onSuccess: (s) => qc.setQueryData(['portal-settings'], s),
    onError: (e: Error) => toast.error(e.message),
  })
  const removeImage = useMutation({
    mutationFn: (kind: 'logo' | 'icon') => api.del<Settings>(`/settings/portal/${kind}`),
    onSuccess: (s) => qc.setQueryData(['portal-settings'], s),
  })

  const preview = { ...settings, ...f }
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader>
          <CardTitle>Look & feel</CardTitle>
          <CardDescription>
            Make the portal and app look like your business. Changes show for customers straight away.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <ImagePicker
              label="Logo"
              hint="Shown in the header. PNG with a transparent background looks best."
              url={settings.logo_url}
              disabled={!isAdmin}
              busy={upload.isPending}
              onPick={(file) => upload.mutate({ kind: 'logo', file })}
              onRemove={() => removeImage.mutate('logo')}
            />
            <ImagePicker
              label="App icon"
              hint="Square, 512 × 512 px. Used on phone home screens. Empty = your logo or initials."
              url={settings.icon_url}
              square
              disabled={!isAdmin}
              busy={upload.isPending}
              onPick={(file) => upload.mutate({ kind: 'icon', file })}
              onRemove={() => removeImage.mutate('icon')}
            />
          </div>

          <div className="space-y-2">
            <Label>Brand colour</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  disabled={!isAdmin}
                  onClick={() => set('brand_color', c)}
                  className={cn(
                    'size-8 rounded-full ring-offset-2 transition',
                    (f.brand_color || '#2563eb') === c && 'ring-2 ring-foreground',
                  )}
                  style={{ background: c }}
                />
              ))}
              <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                <input
                  type="color"
                  aria-label="Custom colour"
                  disabled={!isAdmin}
                  value={f.brand_color || '#2563eb'}
                  onChange={(e) => set('brand_color', e.target.value)}
                  className="size-6 cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono text-xs">{f.brand_color || '#2563eb'}</span>
              </label>
            </div>
          </div>

          <Choice
            label="Header"
            value={f.header_style}
            disabled={!isAdmin}
            onChange={(v) => set('header_style', v as Look['header_style'])}
            options={[
              ['light', 'White'],
              ['brand', 'Brand colour'],
              ['dark', 'Dark'],
            ]}
          />
          <Choice
            label="Font"
            value={f.font}
            disabled={!isAdmin}
            onChange={(v) => set('font', v as Look['font'])}
            options={Object.entries(FONTS).map(([k, v]) => [k, v.label])}
            styleFor={(k) => ({ fontFamily: FONTS[k as Look['font']].family })}
          />
          <Choice
            label="Corners"
            value={f.corners}
            disabled={!isAdmin}
            onChange={(v) => set('corners', v as Look['corners'])}
            options={Object.entries(CORNERS).map(([k, v]) => [k, v.label])}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tagline" hint="Under your name, on the login page and in the app description">
              <Input
                disabled={!isAdmin}
                maxLength={200}
                value={f.tagline || ''}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="Fresh produce, delivered daily since 1998"
              />
            </Field>
            <Field label="Top bar message" hint="Thin strip above the header. Empty = hidden.">
              <Input
                disabled={!isAdmin}
                maxLength={200}
                value={f.announcement || ''}
                onChange={(e) => set('announcement', e.target.value)}
                placeholder="Free delivery on orders over $200"
              />
            </Field>
            <Field label="Footer text" className="sm:col-span-2" hint="e.g. trading hours, delivery areas, ABN">
              <Textarea
                disabled={!isAdmin}
                rows={2}
                value={f.footer_text || ''}
                onChange={(e) => set('footer_text', e.target.value)}
              />
            </Field>
          </div>
          {isAdmin && (
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending && <Spinner />} Save look & feel
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Live preview */}
      <div className="space-y-2 xl:sticky xl:top-20 xl:self-start">
        <Label>Preview</Label>
        <div className="overflow-hidden rounded-xl border bg-background shadow-sm" style={themeStyle(preview)}>
          {preview.announcement && (
            <div className="bg-primary px-3 py-1 text-center text-[11px] font-medium text-primary-foreground">
              {preview.announcement}
            </div>
          )}
          <div className={cn('flex items-center gap-2 border-b px-3 py-2.5', headerClasses(preview.header_style))}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="" className="h-7 object-contain" />
            ) : (
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                FF
              </span>
            )}
            <span className="text-sm font-semibold">Your business</span>
            <ShoppingBag className="ml-auto size-4" />
          </div>
          <div className="space-y-3 p-3">
            <div className="rounded-xl bg-primary p-4 text-primary-foreground">
              <div className="text-base font-bold">Welcome back, Joe</div>
              <div className="text-xs opacity-85">{preview.tagline || 'Your tagline here'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['Roma tomatoes', 'Hass avocados'].map((n, i) => (
                <div key={n} className="overflow-hidden rounded-xl border bg-card">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="space-y-1.5 p-2">
                    <div className="text-xs font-semibold">{n}</div>
                    <div className={cn('text-xs font-semibold', i === 0 && 'text-green-700')}>${i ? '29.00' : '24.50'}</div>
                    <div className="rounded-md bg-primary py-1 text-center text-[11px] font-medium text-primary-foreground">
                      Add
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function pickLook(s: Settings): Look {
  return {
    brand_color: s.brand_color,
    header_style: s.header_style,
    font: s.font,
    corners: s.corners,
    tagline: s.tagline,
    announcement: s.announcement,
    footer_text: s.footer_text,
  }
}

function Choice({
  label,
  value,
  options,
  onChange,
  disabled,
  styleFor,
}: {
  label: string
  value: string
  options: string[][]
  onChange: (v: string) => void
  disabled?: boolean
  styleFor?: (k: string) => React.CSSProperties
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map(([k, text]) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onChange(k)}
            style={styleFor?.(k)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm transition',
              value === k ? 'border-primary bg-accent font-medium text-accent-foreground ring-1 ring-primary' : 'hover:bg-muted',
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function ImagePicker({
  label,
  hint,
  url,
  square,
  disabled,
  busy,
  onPick,
  onRemove,
}: {
  label: string
  hint: string
  url: string | null
  square?: boolean
  disabled?: boolean
  busy?: boolean
  onPick: (f: File) => void
  onRemove: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => ref.current?.click()}
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/40 text-muted-foreground hover:border-primary',
            square ? 'size-16' : 'h-16 w-36',
          )}
        >
          {url ? <img src={url} alt="" className="size-full object-contain p-1" /> : <ImagePlus className="size-5" />}
        </button>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{hint}</p>
          {url && !disabled && (
            <button type="button" className="text-xs text-destructive hover:underline" onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label={`${label} file`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/* ======================= Customer logins (sab ek jagah) ======================= */

export function LoginsCard() {
  const qc = useQueryClient()
  const { isAdmin } = usePermission()
  const [search, setSearch] = useState('')
  const q = useDebounce(search, 300)
  const [adding, setAdding] = useState(false)
  const logins = useQuery({
    queryKey: ['portal-logins', q],
    queryFn: () => api.get<PortalLogin[]>('/portal-logins' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['portal-logins'] })
  const list = logins.data || []
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Customer logins</CardTitle>
          <CardDescription>
            Everyone who can log in to your portal. Use <b>Login as</b> to see exactly what a customer sees (no password needed),
            or
            <b> Set password</b> to give them one over the phone.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus /> Give a customer access
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Search logins"
            className="pl-8"
            placeholder="Search customer, name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {logins.isLoading ? (
          <LoadingRows rows={3} />
        ) : !list.length ? (
          <p className="text-sm text-muted-foreground">
            {q ? 'No logins found.' : 'No customer logins yet - click "Give a customer access".'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH>Customer</TH>
                  <TH>Login</TH>
                  <TH>Status</TH>
                  <TH>Last login</TH>
                  <TH>App</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {list.map((l) => (
                  <TR key={l.id} className={l.is_active ? '' : 'opacity-60'}>
                    <TD>
                      <Link to={`/customers/${l.customer_id}?tab=portal`} className="font-medium hover:underline">
                        {l.customer_name}
                      </Link>
                    </TD>
                    <TD>
                      <div>{l.email}</div>
                      {l.name && <div className="text-xs text-muted-foreground">{l.name}</div>}
                    </TD>
                    <TD>
                      {!l.is_active ? (
                        <Badge variant="secondary">Disabled</Badge>
                      ) : l.must_change_password ? (
                        <Badge variant="warning">Invited</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TD>
                    <TD className="text-xs">{l.last_login_at ? timeAgo(l.last_login_at) : 'Never'}</TD>
                    <TD className="text-xs">
                      {l.push_devices ? (
                        <span className="inline-flex items-center gap-1 text-green-700" title="Notifications turned on">
                          <Smartphone className="size-3.5" /> {l.push_devices}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-right">
                      <PortalLoginActions login={l} onChanged={refresh} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
      {adding && <AddLoginDialog onClose={() => setAdding(false)} onSaved={refresh} />}
    </Card>
  )
}

function AddLoginDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const customers = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get<Paged<Customer>>('/customers?page_size=5000'),
  })
  const [customerId, setCustomerId] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sendWelcome, setSendWelcome] = useState(true)
  const [error, setError] = useState('')
  const [shown, setShown] = useState<string | null>(null)
  const list = (customers.data?.items || []).filter((c) => c.is_active)
  useEffect(() => {
    const c = list.find((x) => String(x.id) === customerId)
    if (c?.email && !email) setEmail(c.email)
  }, [customerId]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () =>
      api.post<PortalLogin>(`/customers/${customerId}/portal-logins`, {
        email: email.trim(),
        name: name.trim() || null,
        send_welcome: sendWelcome,
      }),
    onSuccess: (r) => {
      onSaved()
      if (r.temp_password) setShown(r.temp_password)
      else {
        toast.success(`Welcome email sent to ${r.email}`)
        onClose()
      }
    },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give a customer portal access</DialogTitle>
        </DialogHeader>
        {shown ? (
          <>
            <Alert tone="warning">
              Give these details to the customer - the password is shown only once:
              <div className="mt-1 font-mono">
                {email} · <b>{shown}</b>
              </div>
            </Alert>
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="Customer *">
              <SearchSelect
                aria-label="Customer for login"
                value={customerId}
                onChange={setCustomerId}
                options={list.map((c) => customerOption(c))}
                placeholder="Search customer"
              />
            </Field>
            <Field label="Email *">
              <Input aria-label="New login email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Person's name" hint="Optional - used in the email greeting">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={sendWelcome} onCheckedChange={setSendWelcome} aria-label="Send welcome email now" /> Send the
              welcome email now (off = you get the temporary password to give them)
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!customerId || !email.trim() || save.isPending} onClick={() => save.mutate()}>
                {save.isPending && <Spinner />} Give access
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ======================= Notify customers ======================= */

export function NotifyCard({ settings }: { settings: Settings }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { isAdmin } = usePermission()
  const history = useQuery({
    queryKey: ['portal-notifications'],
    queryFn: () => api.get<PortalNoticeAdmin[]>('/portal-notifications'),
  })
  const [open, setOpen] = useState(false)
  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/portal-notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-notifications'] }),
  })
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Notify customers</CardTitle>
          <CardDescription>
            Send a message to all customers or chosen ones - specials, holiday hours, delivery changes. It appears under the bell
            in their portal, as a phone notification if they turned notifications on, and by email if you choose.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Send /> New message
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!settings.push_configured && (
          <Alert tone="info">
            Phone notifications aren't switched on for this server yet (your developer adds VAPID keys - see README). Messages
            still show in the portal and can be emailed.
          </Alert>
        )}
        {history.isLoading ? (
          <LoadingRows rows={2} />
        ) : !history.data?.length ? (
          <p className="text-sm text-muted-foreground">No messages sent yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {history.data.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="whitespace-pre-line text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.created_at)} · {n.audience === 'all' ? 'All customers' : n.customers.join(', ')} ·{' '}
                    {n.recipients} logins · read by {n.read_by}
                    {n.send_push && ` · ${n.push_sent} phone${n.push_sent === 1 ? '' : 's'}`}
                    {n.send_email && ` · ${n.email_sent} emails`}
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete (removes it from customers' bell)"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Delete this message?',
                          description: "It disappears from customers' notifications.",
                          destructive: true,
                          confirmText: 'Delete',
                        })
                      )
                        remove.mutate(n.id)
                    }}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {open && <NotifyDialog onClose={() => setOpen(false)} />}
    </Card>
  )
}

function NotifyDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const customers = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get<Paged<Customer>>('/customers?page_size=5000'),
  })
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [audience, setAudience] = useState<'all' | 'customers'>('all')
  const [chosen, setChosen] = useState<number[]>([])
  const [pick, setPick] = useState('')
  const [push, setPush] = useState(true)
  const [email, setEmail] = useState(false)
  const [error, setError] = useState('')
  const byId = new Map((customers.data?.items || []).map((c) => [c.id, c]))
  const send = useMutation({
    mutationFn: () =>
      api.post<{ recipients: number; push_sent: number; email_sent: number }>('/portal-notifications', {
        title,
        body: body || null,
        link_url: link || null,
        audience,
        customer_ids: chosen,
        send_push: push,
        send_email: email,
      }),
    onSuccess: (r) => {
      toast.success(
        `Sent to ${r.recipients} login${r.recipients === 1 ? '' : 's'}${push ? ` · ${r.push_sent} phone notifications` : ''}${email ? ` · ${r.email_sent} emails` : ''}`,
      )
      qc.invalidateQueries({ queryKey: ['portal-notifications'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Message your customers</DialogTitle>
        </DialogHeader>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Title *" hint="Shows as the notification heading - keep it short">
          <Input
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mangoes are back - order now!"
          />
        </Field>
        <Field label="Message">
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label="Open when tapped" hint="Optional - a portal page like /portal/yourname/shop, or a web link">
          <Input value={link} onChange={(e) => setLink(e.target.value)} />
        </Field>
        <div className="space-y-2">
          <Label>Send to</Label>
          <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
            {(['all', 'customers'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAudience(v)}
                className={cn(
                  'rounded-md px-3 py-1 font-medium text-muted-foreground',
                  audience === v && 'bg-card text-foreground shadow-sm',
                )}
              >
                {v === 'all' ? 'All customers' : 'Chosen customers'}
              </button>
            ))}
          </div>
          {audience === 'customers' && (
            <>
              <SearchSelect
                aria-label="Add customer"
                value={pick}
                onChange={(v) => {
                  if (v && !chosen.includes(Number(v))) setChosen([...chosen, Number(v)])
                  setPick('')
                }}
                options={(customers.data?.items || [])
                  .filter((c) => c.is_active && !chosen.includes(c.id))
                  .map((c) => customerOption(c))}
                placeholder="Search and add customers"
              />
              <div className="flex flex-wrap gap-1.5">
                {chosen.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {byId.get(id)?.name || `#${id}`}
                    <button type="button" aria-label="Remove" onClick={() => setChosen(chosen.filter((x) => x !== id))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={push} onCheckedChange={setPush} aria-label="Phone notification" /> Phone / app notification (for
          customers who turned it on)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={email} onCheckedChange={setEmail} aria-label="Also email" /> Also send by email
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || (audience === 'customers' && !chosen.length) || send.isPending}
            onClick={() => send.mutate()}
          >
            {send.isPending ? <Spinner /> : <Send />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
