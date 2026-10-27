import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Image as ImageIcon, ShoppingCart, Trash2 } from 'lucide-react'
import type { PortalDelivery, PortalProfile, PortalQuote } from '@/lib/types'
import { cn, formatMoney, todayISO } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { AllowedDatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { usePortal } from './context'
import { QtyStepper } from './PortalShop'
import { MobileActionBar } from './PortalMobile'
import { haptic } from './native'

/**
 * Cart: browser ka cart server se price karwao (customer price, GST, min order).
 * Checkout: delivery date, PO, notes, payment (COD / On account) -> order "Needs review" mein staff ke paas.
 */
function useQuote() {
  const { slug, me, cart, post, setQty } = usePortal()
  const q = useQuery({
    queryKey: ['portal', slug, 'quote', me?.id, cart],
    queryFn: () => post<PortalQuote>('/cart/quote', { items: cart }),
    enabled: cart.length > 0,
    placeholderData: (prev) => prev,
  })
  // Jo product ab available nahi, cart se hata do
  useEffect(() => {
    q.data?.removed.forEach((id) => setQty(id, 0))
  }, [q.data, setQty])
  return q
}

function Totals({ q }: { q: PortalQuote }) {
  if (q.total == null) return null
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal{q.prices_include_gst ? '' : ' (ex GST)'}</span>
        <span className="tabular-nums">{formatMoney(q.subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">GST{q.prices_include_gst ? ' (included)' : ''}</span>
        <span className="tabular-nums">{formatMoney(q.gst)}</span>
      </div>
      <div className="flex justify-between border-t pt-1 text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney(q.total)}</span>
      </div>
    </div>
  )
}

export function PortalCartPage() {
  const { slug, cart, setQty } = usePortal()
  const q = useQuote()
  const base = `/portal/${slug}`
  if (!cart.length)
    return (
      <div className="space-y-3 py-10 text-center">
        <ShoppingCart className="mx-auto size-8 text-muted-foreground" />
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild>
          <Link to={`${base}/shop`}>Browse products</Link>
        </Button>
      </div>
    )
  if (q.isLoading || !q.data) return <Spinner />
  const d = q.data
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        <h1 className="hidden text-xl font-semibold md:block">Your cart</h1>
        <Card>
          <CardContent className="divide-y p-0">
            {d.lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3 max-md:items-start">
                {l.image_url ? (
                  <img src={l.image_url} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <ImageIcon className="size-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link to={`${base}/p/${l.id}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
                    {l.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {l.price != null ? `${formatMoney(l.price)}${l.unit ? ` / ${l.unit}` : ''}` : ''}
                    {l.special && <span className="ml-1 text-green-700">your price</span>}
                    {l.in_stock === false && <span className="ml-1 text-amber-700">out of stock</span>}
                  </div>
                  {/* Phone: qty naam ke neeche (jagah kam hai) */}
                  <div className="mt-2 flex items-center justify-between gap-2 md:hidden">
                    <div className="w-32">
                      <QtyStepper productId={l.id} compact />
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {l.line_total != null ? formatMoney(l.line_total) : ''}
                    </span>
                  </div>
                </div>
                <div className="hidden w-32 shrink-0 md:block">
                  <QtyStepper productId={l.id} compact />
                </div>
                <div className="hidden w-20 text-right text-sm font-medium tabular-nums md:block">
                  {l.line_total != null ? formatMoney(l.line_total) : ''}
                </div>
                <Button variant="ghost" size="icon" aria-label={`Remove ${l.name}`} onClick={() => setQty(l.id, 0)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Link to={`${base}/shop`} className="hidden text-sm text-primary hover:underline md:inline">
          ← Keep shopping
        </Link>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Totals q={d} />
          {d.below_min && d.min_order != null && (
            <Alert tone="warning">
              Minimum order is {formatMoney(d.min_order)} - add {formatMoney(d.min_order - (d.subtotal || 0))} more.
            </Alert>
          )}
          <div className="hidden md:block">
            <CheckoutButton d={d} />
          </div>
        </CardContent>
      </Card>
      <MobileActionBar>
        <CheckoutButton d={d} big />
      </MobileActionBar>
    </div>
  )
}

function CheckoutButton({ d, big = false }: { d: PortalQuote; big?: boolean }) {
  const { slug, loggedIn } = usePortal()
  const base = `/portal/${slug}`
  const label = big && d.total != null ? `Checkout · ${formatMoney(d.total)}` : 'Checkout'
  if (!loggedIn)
    return (
      <Button className={cn('w-full', big && 'h-11 text-base')} asChild>
        <Link to={`${base}/login?next=${encodeURIComponent(`${base}/checkout`)}`}>Log in to order</Link>
      </Button>
    )
  return (
    <Button className={cn('w-full', big && 'h-11 text-base')} disabled={d.below_min} asChild={!d.below_min}>
      {d.below_min ? <span>{label}</span> : <Link to={`${base}/checkout`}>{label}</Link>}
    </Button>
  )
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** "16:00" -> "4:00 pm" */
function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

function deliveryHint(r: PortalDelivery) {
  const parts = []
  if (r.days.length) parts.push(`We deliver ${r.days.map((d) => WEEKDAYS[d]).join(', ')}`)
  if (r.cutoff_time) parts.push(`order before ${timeLabel(r.cutoff_time)} for the earliest date`)
  const text = parts.join(' - ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function PortalCheckout() {
  const { slug, info, cart, post, get, clearCart, loggedIn } = usePortal()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const q = useQuote()
  const profile = useQuery({
    queryKey: ['portal', slug, 'profile'],
    queryFn: () => get<PortalProfile>('/profile'),
    enabled: loggedIn,
  })
  // Delivery days / cut-off (Settings -> Customer portal -> Setup -> Delivery) - har baar fresh (cut-off time se badalta hai)
  const deliveryInfo = useQuery({
    queryKey: ['portal', slug, 'delivery-dates'],
    queryFn: () => get<PortalDelivery>('/delivery-dates'),
    enabled: loggedIn,
    staleTime: 0,
  })
  const options = info?.payment_options || []
  const [payment, setPayment] = useState('')
  const [delivery, setDelivery] = useState('')
  const rules = deliveryInfo.data
  useEffect(() => {
    // pehli available date apne aap chuni ho (customer badal sakta hai)
    if (rules?.required && rules.earliest && (!delivery || !rules.dates.includes(delivery))) setDelivery(rules.earliest)
  }, [rules, delivery])
  const [po, setPo] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!payment && options.length) setPayment(options[0].key)
  }, [options, payment])

  const place = useMutation({
    mutationFn: () =>
      post<{ id: number }>('/orders', {
        items: cart,
        payment_method: payment,
        delivery_date: delivery || null,
        po_number: po || null,
        notes: notes || null,
      }),
    onSuccess: (r) => {
      haptic(20)
      clearCart()
      qc.invalidateQueries({ queryKey: ['portal', slug, 'orders'] })
      navigate(`/portal/${slug}/order-placed/${r.id}`, { replace: true })
    },
    onError: (e: Error) => {
      setError(e.message)
      deliveryInfo.refetch() // cut-off beech mein nikal gaya ho to nayi dates
    },
  })

  if (!loggedIn) return <Alert tone="info">Please log in to place your order.</Alert>
  if (!cart.length) return <Alert tone="info">Your cart is empty.</Alert>
  if (q.isLoading || !q.data) return <Spinner />
  const p = profile.data
  const address = p
    ? [p.delivery_line1, p.delivery_line2, p.delivery_city, p.delivery_region, p.delivery_postcode].filter(Boolean).join(', ')
    : ''

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <h1 className="hidden text-xl font-semibold md:block">Checkout</h1>
        {error && <Alert tone="error">{error}</Alert>}
        {info?.checkout_note && <Alert tone="info">{info.checkout_note}</Alert>}
        <Card>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
            {rules?.required ? (
              <Field label="Delivery date *" hint={deliveryHint(rules)}>
                <AllowedDatePicker aria-label="Delivery date" value={delivery} dates={rules.dates} onChange={setDelivery} />
              </Field>
            ) : (
              <Field label="Delivery date" hint="Optional - leave empty for your usual delivery">
                <Input type="date" min={todayISO()} value={delivery} onChange={(e) => setDelivery(e.target.value)} />
              </Field>
            )}
            <Field label="Your PO / reference" hint="Optional">
              <Input value={po} maxLength={100} onChange={(e) => setPo(e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2" hint="Delivery instructions, substitutions...">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="text-sm sm:col-span-2">
              <div className="font-medium">Deliver to</div>
              <div className="text-muted-foreground">
                {p?.customer}
                {address ? ` · ${address}` : ' · (no address saved)'}{' '}
                <Link to={`/portal/${slug}/profile`} className="text-primary hover:underline">
                  Change
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {options.map((o) => (
              <label
                key={o.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary"
              >
                <input
                  type="radio"
                  name="payment"
                  className="mt-1 accent-primary"
                  checked={payment === o.key}
                  onChange={() => setPayment(o.key)}
                />
                <span>
                  <span className="block text-sm font-medium">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Your order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-1 text-sm">
            {q.data.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {l.quantity} × {l.name}
                </span>
                <span className="shrink-0 tabular-nums">{l.line_total != null ? formatMoney(l.line_total) : ''}</span>
              </li>
            ))}
          </ul>
          <Totals q={q.data} />
          <Button
            className="hidden w-full md:flex"
            disabled={place.isPending || !payment || q.data.below_min || (rules?.required && !delivery)}
            onClick={() => place.mutate()}
          >
            {place.isPending && <Spinner />} Place order
          </Button>
          <MobileActionBar>
            <Button
              className="h-11 w-full text-base"
              disabled={place.isPending || !payment || q.data.below_min || (rules?.required && !delivery)}
              onClick={() => place.mutate()}
            >
              {place.isPending && <Spinner />} Place order{q.data.total != null ? ` · ${formatMoney(q.data.total)}` : ''}
            </Button>
          </MobileActionBar>
          <p className="text-xs text-muted-foreground">We'll email you when we receive it, and again when it's confirmed.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function PortalOrderPlaced() {
  const { slug } = usePortal()
  const { id } = useParams()
  return (
    <div className="mx-auto max-w-md space-y-3 py-10 text-center">
      <CheckCircle2 className="mx-auto size-10 text-green-600" />
      <h1 className="text-xl font-semibold">Thanks - order #{id} placed</h1>
      <p className="text-sm text-muted-foreground">We've emailed you a copy and will confirm it shortly.</p>
      <div className="flex justify-center gap-2">
        <Button asChild variant="outline">
          <Link to={`/portal/${slug}/orders/${id}`}>View order</Link>
        </Button>
        <Button asChild>
          <Link to={`/portal/${slug}/shop`}>Keep shopping</Link>
        </Button>
      </div>
    </div>
  )
}
