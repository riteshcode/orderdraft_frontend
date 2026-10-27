import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BellRing, ChevronLeft, ClipboardList, RotateCcw } from 'lucide-react'
import type { Paged, PortalNotice, PortalOrder, PortalProfile } from '@/lib/types'
import { cn, formatDate, formatDateTime, formatMoney } from '@/lib/utils'
import { portalAuth, portalRequest } from '@/lib/portalApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { usePortal } from './context'
import { PortalShell } from './PortalLayout'
import { InstallCard, NoticeRow } from './PortalApp'
import { currentSubscription, isIOS, pushSupported, subscribePush } from './pwa'

/** My orders, order detail ("Order again"), profile & address, password badalna */
const PAYMENT: Record<string, string> = { cod: 'Cash on delivery', account: 'On account' }

function StatusPill({ o }: { o: PortalOrder }) {
  const tone =
    o.status === 'rejected'
      ? 'bg-red-50 text-red-700'
      : o.status === 'needs_review'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-green-50 text-green-700'
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tone)}>{o.status_label}</span>
}

export function PortalOrdersPage() {
  const { slug, get } = usePortal()
  const [page, setPage] = useState(1)
  const orders = useQuery({
    queryKey: ['portal', slug, 'orders', page],
    queryFn: () => get<Paged<PortalOrder>>(`/orders?page=${page}`),
  })
  if (orders.isLoading) return <Spinner />
  if (orders.isError) return <Alert tone="error">{(orders.error as Error).message}</Alert>
  const d = orders.data!
  return (
    <div className="space-y-3">
      <h1 className="hidden text-xl font-semibold md:block">My orders</h1>
      {!d.items.length ? (
        <div className="space-y-3 py-8 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto size-8" />
          <p>No orders yet.</p>
          <Button asChild>
            <Link to={`/portal/${slug}/shop`}>Start shopping</Link>
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {d.items.map((o) => (
              <Link key={o.id} to={`/portal/${slug}/orders/${o.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    Order #{o.id} {o.po_number && <span className="text-muted-foreground">· {o.po_number}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(o.created_at)} · {o.line_count} item{o.line_count === 1 ? '' : 's'}
                    {o.delivery_date && ` · deliver ${formatDate(o.delivery_date)}`}
                  </div>
                </div>
                <StatusPill o={o} />
                <div className="w-20 text-right text-sm font-medium tabular-nums">
                  {o.total != null ? formatMoney(o.total) : ''}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
      {d.total > d.page_size && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Newer
          </Button>
          <Button variant="outline" size="sm" disabled={page * d.page_size >= d.total} onClick={() => setPage(page + 1)}>
            Older
          </Button>
        </div>
      )}
    </div>
  )
}

export function PortalOrderDetail() {
  const { id } = useParams()
  const { slug, get, add } = usePortal()
  const navigate = useNavigate()
  const o = useQuery({ queryKey: ['portal', slug, 'orders', 'detail', id], queryFn: () => get<PortalOrder>(`/orders/${id}`) })
  if (o.isLoading) return <Spinner />
  if (o.isError || !o.data) return <Alert tone="error">{(o.error as Error)?.message || 'Not found'}</Alert>
  const x = o.data
  const reorder = () => {
    const lines = (x.lines || []).filter((l) => l.product_id)
    lines.forEach((l) => add(l.product_id!, l.quantity))
    toast.success(`${lines.length} item${lines.length === 1 ? '' : 's'} added to your cart`)
    navigate(`/portal/${slug}/cart`)
  }
  return (
    <div className="space-y-4">
      <Link
        to={`/portal/${slug}/orders`}
        className="hidden items-center text-xs text-muted-foreground hover:text-foreground md:inline-flex"
      >
        <ChevronLeft className="size-3.5" /> My orders
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Order #{x.id}</h1>
        <StatusPill o={x} />
        <Button variant="outline" size="sm" className="ml-auto" onClick={reorder}>
          <RotateCcw /> Order again
        </Button>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">Placed</div>
          {formatDateTime(x.created_at)}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Delivery</div>
          {x.delivery_date ? formatDate(x.delivery_date) : 'Usual delivery'}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Your PO</div>
          {x.po_number || '-'}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Payment</div>
          {x.payment_method ? PAYMENT[x.payment_method] || x.payment_method : x.source === 'portal' ? '-' : 'As usual'}
        </div>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {(x.lines || []).map((l, i) => (
            <div key={i} className="flex items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                {l.product_id ? (
                  <Link to={`/portal/${slug}/p/${l.product_id}`} className="font-medium hover:text-primary">
                    {l.name}
                  </Link>
                ) : (
                  <span className="font-medium">{l.name}</span>
                )}
                {l.unit_price != null && <div className="text-xs text-muted-foreground">{formatMoney(l.unit_price)} each</div>}
              </div>
              <div className="tabular-nums">
                {l.quantity} {l.unit || ''}
              </div>
              <div className="w-20 text-right tabular-nums">{l.line_total != null ? formatMoney(l.line_total) : ''}</div>
            </div>
          ))}
          {x.total != null && (
            <div className="flex justify-between p-3 font-semibold">
              <span>Total (ex GST)</span>
              <span className="tabular-nums">{formatMoney(x.total)}</span>
            </div>
          )}
        </CardContent>
      </Card>
      {x.notes && <p className="text-sm text-muted-foreground">Notes: {x.notes}</p>}
    </div>
  )
}

export function PortalProfilePage() {
  const { slug, get, put } = usePortal()
  const qc = useQueryClient()
  const profile = useQuery({ queryKey: ['portal', slug, 'profile'], queryFn: () => get<PortalProfile>('/profile') })
  const [f, setF] = useState<Record<string, string>>({})
  useEffect(() => {
    if (profile.data) {
      const p = profile.data
      setF({
        name: p.name || '',
        phone: p.phone || '',
        delivery_line1: p.delivery_line1 || '',
        delivery_line2: p.delivery_line2 || '',
        delivery_city: p.delivery_city || '',
        delivery_region: p.delivery_region || '',
        delivery_postcode: p.delivery_postcode || '',
        delivery_instructions: p.delivery_instructions || '',
      })
    }
  }, [profile.data])
  const save = useMutation({
    mutationFn: () => put<PortalProfile>('/profile', f),
    onSuccess: (p) => {
      qc.setQueryData(['portal', slug, 'profile'], p)
      qc.invalidateQueries({ queryKey: ['portal', slug, 'me'] })
      toast.success('Saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const [pw, setPw] = useState({ current: '', next: '' })
  const changePw = useMutation({
    mutationFn: () =>
      portalRequest(slug, 'POST', '/portal/change-password', { current_password: pw.current, new_password: pw.next }),
    onSuccess: () => {
      setPw({ current: '', next: '' })
      toast.success('Password changed')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  if (profile.isLoading) return <Spinner />
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Profile & delivery address</CardTitle>
          <p className="text-sm text-muted-foreground">
            {profile.data?.email} · {profile.data?.customer}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name">
            <Input value={f.name || ''} onChange={set('name')} />
          </Field>
          <Field label="Phone">
            <Input value={f.phone || ''} onChange={set('phone')} />
          </Field>
          <Field label="Street address" className="sm:col-span-2">
            <Input value={f.delivery_line1 || ''} onChange={set('delivery_line1')} />
          </Field>
          <Field label="Address line 2" className="sm:col-span-2">
            <Input value={f.delivery_line2 || ''} onChange={set('delivery_line2')} />
          </Field>
          <Field label="Suburb / city">
            <Input value={f.delivery_city || ''} onChange={set('delivery_city')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State">
              <Input value={f.delivery_region || ''} onChange={set('delivery_region')} />
            </Field>
            <Field label="Postcode">
              <Input value={f.delivery_postcode || ''} onChange={set('delivery_postcode')} />
            </Field>
          </div>
          <Field label="Delivery instructions" className="sm:col-span-2" hint="e.g. Leave at the back door before 6am">
            <Textarea rows={2} value={f.delivery_instructions || ''} onChange={set('delivery_instructions')} />
          </Field>
          <Button className="w-fit" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} Save
          </Button>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Current password">
            <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Field>
          <Field label="New password" hint="At least 8 characters">
            <Input
              type="password"
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </Field>
          <Button
            variant="outline"
            disabled={changePw.isPending || !pw.current || pw.next.length < 8}
            onClick={() => changePw.mutate()}
          >
            Change password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/** Temp password se aaye ho -> pehle apna password (shop ke frame ke bahar) */
export function PortalChangePassword() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (next.length < 8) return setError('Use at least 8 characters')
    setBusy(true)
    setError('')
    try {
      await portalRequest(slug, 'POST', '/portal/change-password', { current_password: current, new_password: next })
      await qc.invalidateQueries({ queryKey: ['portal', slug] })
      navigate(`/portal/${slug}`, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <PortalShell
      slug={slug}
      title="Choose your own password"
      subtitle="Please replace the temporary password from your welcome email."
    >
      <form className="space-y-3" onSubmit={submit}>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Temporary password">
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 8 characters">
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Button className="w-full" disabled={busy}>
          {busy && <Spinner />} Save password
        </Button>
      </form>
    </PortalShell>
  )
}

/** Notifications: admin ke messages + is phone / computer pe push on/off */
export function PortalNotificationsPage() {
  const { slug, info, get, post } = usePortal()
  const qc = useQueryClient()
  const data = useQuery({
    queryKey: ['portal', slug, 'notifications'],
    queryFn: () => get<{ items: PortalNotice[]; unread: number }>('/notifications'),
  })
  useEffect(() => {
    if (data.data?.unread)
      post('/notifications/read', {}).then(() => qc.invalidateQueries({ queryKey: ['portal', slug, 'notifications'] }))
  }, [data.data?.unread, post, qc, slug])

  const [pushOn, setPushOn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    currentSubscription().then((s) => setPushOn(!!s))
  }, [])
  const canPush = !!info?.push_public_key && pushSupported()
  async function toggle() {
    setBusy(true)
    try {
      if (pushOn) {
        const sub = await currentSubscription()
        if (sub) {
          await post('/push/unsubscribe', { endpoint: sub.endpoint })
          await sub.unsubscribe()
        }
        setPushOn(false)
        toast.success('Notifications turned off on this device')
      } else {
        const json = await subscribePush(info!.push_public_key!)
        await post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
        setPushOn(true)
        toast.success("You'll get notifications on this device")
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="hidden text-xl font-semibold md:block">Notifications</h1>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <BellRing className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Notifications on this device</div>
            <div className="text-xs text-muted-foreground">
              {!info?.push_public_key
                ? 'Not available yet.'
                : !pushSupported()
                  ? isIOS()
                    ? 'On iPhone: first add this site to your Home Screen (Share → Add to Home Screen), then open it from there.'
                    : "This browser doesn't support notifications."
                  : 'Specials, delivery changes and messages from us - even when the app is closed.'}
            </div>
          </div>
          {canPush && pushOn !== null && (
            <Button variant={pushOn ? 'outline' : 'default'} size="sm" disabled={busy} onClick={toggle}>
              {busy && <Spinner />} {pushOn ? 'Turn off' : 'Turn on'}
            </Button>
          )}
        </CardContent>
      </Card>
      <InstallCard />
      <Card>
        <CardContent className="p-1">
          {data.isLoading ? (
            <Spinner />
          ) : !data.data?.items.length ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            data.data.items.map((n) => <NoticeRow key={n.id} n={n} />)
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Staff "Login as": /portal/:slug/impersonate#token=... -> token rakho, home pe jao */
export function PortalImpersonate() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    history.replaceState(null, '', window.location.pathname) // URL se token hatao
    if (token) portalAuth.setToken(slug, token)
    qc.invalidateQueries({ queryKey: ['portal', slug] }).then(() => navigate(`/portal/${slug}`, { replace: true }))
  }, [slug, navigate, qc])
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  )
}
