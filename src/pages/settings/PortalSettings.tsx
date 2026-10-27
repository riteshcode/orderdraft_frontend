import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Palette,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { cn, formatDate } from '@/lib/utils'
import { BrandingCard, LoginsCard, NotifyCard } from './PortalSettingsExtra'
import { api } from '@/lib/api'
import type { Paged, PortalBannerAdmin, PortalSettings as Settings, Product } from '@/lib/types'
import { usePermission } from '@/hooks/useMe'
import { categoryOptions, useCategories } from '@/hooks/useCategories'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { SearchSelect, productOption } from '@/components/ui/search-select'
import { Switch } from '@/components/ui/switch'

/**
 * Settings -> Customer portal: portal ki saari settings ek jagah + home page banners.
 * Customers ko login: Customer page -> Portal access.
 */
type Form = {
  enabled: boolean
  access: 'private' | 'public'
  show_prices_public: boolean
  allow_cod: boolean
  allow_account: boolean
  hide_out_of_stock: boolean
  min_order: string
  notify_email: string
  welcome_title: string
  welcome_text: string
  checkout_note: string
  delivery_days: number[]
  cutoff_time: string
  lead_days: string
  closed_dates: string[]
  allow_standing: boolean
}

const SECTIONS = [
  { key: 'setup', label: 'Setup', icon: Settings2 },
  { key: 'look', label: 'Look & feel', icon: Palette },
  { key: 'logins', label: 'Customer logins', icon: Users },
  { key: 'notify', label: 'Notify customers', icon: Bell },
  { key: 'banners', label: 'Banners', icon: ImageIcon },
] as const

function toForm(s: Settings): Form {
  return {
    enabled: s.enabled,
    access: s.access,
    show_prices_public: s.show_prices_public,
    allow_cod: s.allow_cod,
    allow_account: s.allow_account,
    hide_out_of_stock: s.hide_out_of_stock,
    min_order: s.min_order != null ? String(s.min_order) : '',
    notify_email: s.notify_email || '',
    welcome_title: s.welcome_title || '',
    welcome_text: s.welcome_text || '',
    checkout_note: s.checkout_note || '',
    delivery_days: s.delivery_days || [],
    cutoff_time: s.cutoff_time || '',
    lead_days: String(s.lead_days ?? 1),
    closed_dates: s.closed_dates || [],
    allow_standing: s.allow_standing ?? true,
  }
}

export function PortalSettings() {
  const qc = useQueryClient()
  const { isAdmin } = usePermission()
  const [params, setParams] = useSearchParams()
  const section = SECTIONS.some((x) => x.key === params.get('s')) ? params.get('s')! : 'setup'
  const settings = useQuery({ queryKey: ['portal-settings'], queryFn: () => api.get<Settings>('/settings/portal') })
  const [f, setF] = useState<Form | null>(null)
  useEffect(() => {
    if (settings.data) setF(toForm(settings.data))
  }, [settings.data])

  const save = useMutation({
    mutationFn: () =>
      api.put<Settings>('/settings/portal', {
        ...f,
        min_order: f!.min_order === '' ? null : Number(f!.min_order),
        notify_email: f!.notify_email.trim() || null,
        lead_days: Number(f!.lead_days) || 0,
      }),
    onSuccess: (s) => {
      qc.setQueryData(['portal-settings'], s)
      toast.success(s.enabled ? 'Saved - your portal is live' : 'Saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (settings.isLoading || !f) return <LoadingRows rows={6} />
  if (settings.isError) return <ErrorState error={settings.error} />
  const s = settings.data!
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v })

  const nav = (
    <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
      {SECTIONS.map((x) => (
        <button
          key={x.key}
          type="button"
          onClick={() => setParams({ s: x.key }, { replace: true })}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-muted-foreground',
            section === x.key && 'bg-card text-foreground shadow-sm',
          )}
        >
          <x.icon className="size-4" /> {x.label}
        </button>
      ))}
    </div>
  )
  if (section !== 'setup')
    return (
      <div>
        {nav}
        {section === 'look' && <BrandingCard settings={s} />}
        {section === 'logins' && <LoginsCard />}
        {section === 'notify' && <NotifyCard settings={s} />}
        {section === 'banners' && <BannersCard />}
      </div>
    )

  return (
    <div className="space-y-4">
      {nav}
      <Card>
        <CardHeader>
          <CardTitle>Customer ordering portal</CardTitle>
          <CardDescription>
            Your own online shop - and phone app - where customers see their prices and place orders. Orders arrive in Orders as
            "Needs review" with the source <b>Portal</b>. Give customers a login under <b>Customer logins</b> (or on their
            customer page → Portal access).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">Portal address:</span>
            <span className="font-mono">{s.portal_url}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(s.portal_url)
                toast.success('Copied')
              }}
            >
              <Copy /> Copy
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={s.portal_url.replace(/^https?:\/\/[^/]+/, '')} target="_blank" rel="noreferrer">
                <ExternalLink /> Open
              </a>
            </Button>
          </div>

          <label className="flex items-center gap-3">
            <Switch checked={f.enabled} disabled={!isAdmin} onCheckedChange={(v) => set('enabled', v)} aria-label="Portal on" />
            <span>
              <span className="block text-sm font-medium">Portal is {f.enabled ? 'on' : 'off'}</span>
              <span className="block text-xs text-muted-foreground">Off = customers see "Online ordering isn't open yet"</span>
            </span>
          </label>

          <div className="space-y-2">
            <Label>Who can see it</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['private', 'Private', 'Customers must log in to see products and prices'],
                  ['public', 'Public', 'Anyone with the link can browse; log in to order'],
                ] as const
              ).map(([v, label, hint]) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="access"
                    className="mt-1 accent-primary"
                    disabled={!isAdmin}
                    checked={f.access === v}
                    onChange={() => set('access', v)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {f.access === 'public' && (
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={f.show_prices_public}
                  disabled={!isAdmin}
                  onCheckedChange={(v) => set('show_prices_public', v)}
                />
                Show prices to visitors who aren't logged in (logged-in customers always see their own prices)
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment options at checkout</Label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.allow_cod} disabled={!isAdmin} onCheckedChange={(v) => set('allow_cod', v)} /> Cash on delivery
              (COD)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.allow_account} disabled={!isAdmin} onCheckedChange={(v) => set('allow_account', v)} /> On account
              (invoice, {s.payment_terms_days} day terms - change in Settings → Invoices)
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum order value" hint="Empty = no minimum. Checked against the cart subtotal.">
              <Input
                type="number"
                min={0}
                step="0.01"
                disabled={!isAdmin}
                value={f.min_order}
                onChange={(e) => set('min_order', e.target.value)}
                placeholder="e.g. 50"
              />
            </Field>
            <Field label="Email new orders to" hint="Empty = your business email (Settings → General)">
              <Input
                type="email"
                disabled={!isAdmin}
                value={f.notify_email}
                onChange={(e) => set('notify_email', e.target.value)}
                placeholder="orders@yourbusiness.com.au"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Switch checked={f.hide_out_of_stock} disabled={!isAdmin} onCheckedChange={(v) => set('hide_out_of_stock', v)} />
              Hide tracked products that are out of stock (otherwise they show "Out of stock" but can still be ordered)
            </label>
            <Field label="Welcome title" hint="Big heading on the portal home page">
              <Input
                disabled={!isAdmin}
                value={f.welcome_title}
                maxLength={200}
                onChange={(e) => set('welcome_title', e.target.value)}
                placeholder="Fresh produce, delivered daily"
              />
            </Field>
            <Field label="Checkout note" hint="Shown on the checkout page">
              <Input
                disabled={!isAdmin}
                value={f.checkout_note}
                onChange={(e) => set('checkout_note', e.target.value)}
                placeholder="Order by 4pm for next-day delivery"
              />
            </Field>
            <Field label="Welcome text" className="sm:col-span-2">
              <Textarea
                rows={2}
                disabled={!isAdmin}
                value={f.welcome_text}
                onChange={(e) => set('welcome_text', e.target.value)}
              />
            </Field>
          </div>
          <DeliveryFields f={f} set={set} disabled={!isAdmin} />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={f.allow_standing} disabled={!isAdmin} onCheckedChange={(v) => set('allow_standing', v)} />
            Customers can set up standing orders (the same items on a schedule, e.g. every Monday). Staff can always add them on
            the customer page.
          </label>
          {f.enabled && !f.allow_cod && !f.allow_account && <Alert tone="warning">Turn on at least one payment option.</Alert>}
          {isAdmin && (
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending && <Spinner />} Save portal settings
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------------- Delivery days / cut-off ---------------- */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function DeliveryFields({
  f,
  set,
  disabled,
}: {
  f: Form
  set: <K extends keyof Form>(k: K, v: Form[K]) => void
  disabled: boolean
}) {
  const [newDate, setNewDate] = useState('')
  const toggleDay = (d: number) =>
    set('delivery_days', f.delivery_days.includes(d) ? f.delivery_days.filter((x) => x !== d) : [...f.delivery_days, d].sort())
  const active = f.delivery_days.length > 0 || !!f.cutoff_time
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <div className="text-sm font-medium">Delivery days &amp; cut-off</div>
        <p className="text-xs text-muted-foreground">
          Customers can only pick a delivery date that you deliver on. Leave the days empty and the cut-off blank to let customers
          pick any date (or none).
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Delivery days">
        {WEEKDAYS.map((label, d) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={f.delivery_days.includes(d) ? 'default' : 'outline'}
            disabled={disabled}
            aria-pressed={f.delivery_days.includes(d)}
            onClick={() => toggleDay(d)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order cut-off time" hint="Orders after this time count as the next day. Empty = no cut-off.">
          <Input type="time" disabled={disabled} value={f.cutoff_time} onChange={(e) => set('cutoff_time', e.target.value)} />
        </Field>
        <Field label="Days before delivery" hint="1 = next day, 0 = same day">
          <Input
            type="number"
            min={0}
            max={30}
            disabled={disabled}
            value={f.lead_days}
            onChange={(e) => set('lead_days', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Closed dates" hint="Public holidays or days you don't deliver">
        <div className="flex gap-2">
          <Input
            type="date"
            aria-label="Closed date to add"
            disabled={disabled}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="max-w-48"
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !newDate || f.closed_dates.includes(newDate)}
            onClick={() => {
              set('closed_dates', [...f.closed_dates, newDate].sort())
              setNewDate('')
            }}
          >
            Add
          </Button>
        </div>
      </Field>
      {f.closed_dates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {f.closed_dates.map((d) => (
            <Badge key={d} variant="secondary" className="gap-1">
              {formatDate(d)}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${d}`}
                  className="hover:text-destructive"
                  onClick={() =>
                    set(
                      'closed_dates',
                      f.closed_dates.filter((x) => x !== d),
                    )
                  }
                >
                  ×
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {active && (
        <p className="text-xs text-muted-foreground">
          A delivery date is now required at checkout. The earliest date is picked automatically.
        </p>
      )}
    </div>
  )
}

/* ---------------- Banners ---------------- */

function BannersCard() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { isAdmin } = usePermission()
  const banners = useQuery({ queryKey: ['portal-banners'], queryFn: () => api.get<PortalBannerAdmin[]>('/portal-banners') })
  const [editing, setEditing] = useState<PortalBannerAdmin | 'new' | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['portal-banners'] })
  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.put<PortalBannerAdmin[]>('/portal-banners/order', { ids }),
    onSuccess: (d) => qc.setQueryData(['portal-banners'], d),
  })
  const remove = useMutation({ mutationFn: (id: number) => api.del(`/portal-banners/${id}`), onSuccess: refresh })
  const list = banners.data || []
  const move = (i: number, dir: -1 | 1) => {
    const ids = list.map((b) => b.id)
    ;[ids[i], ids[i + dir]] = [ids[i + dir], ids[i]]
    reorder.mutate(ids)
  }
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Home page banners</CardTitle>
          <CardDescription>
            Slides at the top of your portal. Link one to a product or category to promote it. Best image size: 1600 × 500 px.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> Add banner
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {banners.isLoading ? (
          <LoadingRows rows={2} />
        ) : !list.length ? (
          <p className="text-sm text-muted-foreground">No banners yet.</p>
        ) : (
          <div className="space-y-2">
            {list.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border p-2">
                {b.image_url ? (
                  <img src={b.image_url} alt="" className="h-14 w-40 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex h-14 w-40 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                    <ImageIcon className="mr-1 size-4" /> No image
                  </div>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate font-medium">{b.title || '(no title)'}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {b.link_type === 'none' ? 'No link' : `Opens ${b.link_type}: ${b.link_label || '-'}`}
                    {(b.starts_on || b.ends_on) && ` · ${b.starts_on || '…'} → ${b.ends_on || '…'}`}
                  </div>
                </div>
                {!b.is_active && <Badge variant="secondary">Hidden</Badge>}
                {isAdmin && (
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Move down"
                      disabled={i === list.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(b)}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={async () => {
                        if (await confirm({ title: 'Delete this banner?', destructive: true, confirmText: 'Delete' }))
                          remove.mutate(b.id)
                      }}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {editing && (
        <BannerDialog
          key={editing === 'new' ? 'new' : editing.id}
          banner={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </Card>
  )
}

function BannerDialog({
  banner,
  onClose,
  onSaved,
}: {
  banner: PortalBannerAdmin | null
  onClose: () => void
  onSaved: () => void
}) {
  const categories = useCategories()
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(banner?.image_url || '')
  const [f, setF] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    button_text: banner?.button_text || '',
    link_type: banner?.link_type || 'none',
    link_product_id: banner?.link_product_id ? String(banner.link_product_id) : '',
    link_category_id: banner?.link_category_id ? String(banner.link_category_id) : '',
    link_url: banner?.link_url || '',
    is_active: banner?.is_active ?? true,
    starts_on: banner?.starts_on || '',
    ends_on: banner?.ends_on || '',
  })
  const [error, setError] = useState('')
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v })

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...f,
        link_product_id: f.link_product_id ? Number(f.link_product_id) : null,
        link_category_id: f.link_category_id ? Number(f.link_category_id) : null,
        starts_on: f.starts_on || null,
        ends_on: f.ends_on || null,
      }
      const saved = banner
        ? await api.put<PortalBannerAdmin>(`/portal-banners/${banner.id}`, body)
        : await api.post<PortalBannerAdmin>('/portal-banners', body)
      if (file) {
        const form = new FormData()
        form.append('file', file)
        await api.upload(`/portal-banners/${saved.id}/image`, form)
      }
      return saved
    },
    onSuccess: () => {
      toast.success('Banner saved')
      onSaved()
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{banner ? 'Edit banner' : 'Add banner'}</DialogTitle>
        </DialogHeader>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="space-y-2">
          <Label>Image</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[16/5] w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/40 text-sm text-muted-foreground hover:border-primary"
          >
            {preview ? (
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="size-4" /> Choose image (JPG, PNG or WEBP, up to 5 MB)
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Banner image"
            onChange={(e) => {
              const fl = e.target.files?.[0]
              if (fl) {
                setFile(fl)
                setPreview(URL.createObjectURL(fl))
              }
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" hint="Shown on the image">
            <Input
              value={f.title}
              maxLength={150}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Citrus season is here"
            />
          </Field>
          <Field label="Button text" hint="Empty = Shop now">
            <Input value={f.button_text} maxLength={50} onChange={(e) => set('button_text', e.target.value)} />
          </Field>
          <Field label="Subtitle" className="sm:col-span-2">
            <Input value={f.subtitle} maxLength={300} onChange={(e) => set('subtitle', e.target.value)} />
          </Field>
          <Field label="When clicked, open">
            <Select value={f.link_type} onChange={(e) => set('link_type', e.target.value)}>
              <option value="none">Nothing</option>
              <option value="product">A product</option>
              <option value="category">A category</option>
              <option value="url">A web link</option>
            </Select>
          </Field>
          {f.link_type === 'product' && (
            <Field label="Product">
              <SearchSelect
                aria-label="Banner product"
                value={f.link_product_id}
                onChange={(v) => set('link_product_id', v)}
                options={(products.data?.items || []).filter((p) => p.is_active).map((p) => productOption(p))}
                placeholder="Search product"
              />
            </Field>
          )}
          {f.link_type === 'category' && (
            <Field label="Category">
              <SearchSelect
                aria-label="Banner category"
                value={f.link_category_id}
                onChange={(v) => set('link_category_id', v)}
                options={categoryOptions(categories.data)}
                placeholder="Search category"
              />
            </Field>
          )}
          {f.link_type === 'url' && (
            <Field label="Web link">
              <Input value={f.link_url} onChange={(e) => set('link_url', e.target.value)} placeholder="https://..." />
            </Field>
          )}
          <Field label="Show from" hint="Empty = now">
            <Input type="date" value={f.starts_on} onChange={(e) => set('starts_on', e.target.value)} />
          </Field>
          <Field label="Show until" hint="Empty = always">
            <Input type="date" value={f.ends_on} onChange={(e) => set('ends_on', e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={f.is_active} onCheckedChange={(v) => set('is_active', v)} /> Show this banner
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
