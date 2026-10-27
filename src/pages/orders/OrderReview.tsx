import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Ban, Check, ExternalLink, FileText, Mail, Paperclip, Plus, RefreshCw, Send, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Customer, Destination, OrderDetail, OrderLine, Paged, PantryItem, Product } from '@/lib/types'
import { cn, formatDateTime, formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import {
  ChannelBadge,
  ConfidenceBadge,
  ExportStatusBadge,
  InvoiceStatusBadge,
  OrderStatusBadge,
} from '@/components/common/badges'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { customerOption, productOption, SearchSelect } from '@/components/ui/search-select'
import { sourceLabel } from '@/lib/providers'

// Form state - backend ke OrderUpdate jaisa
type FormLine = OrderLine & { key: string }
type FormState = {
  customer_id: number | null
  po_number: string
  delivery_date: string
  notes: string
  lines: FormLine[]
}

let newLineCounter = 0

function toForm(o: OrderDetail): FormState {
  return {
    customer_id: o.customer_id,
    po_number: o.po_number || '',
    delivery_date: o.delivery_date || '',
    notes: o.notes || '',
    lines: o.lines.map((l) => ({ ...l, key: `l${l.id}` })),
  }
}

/** Product dropdown: upar AI suggestions, neeche poora catalog */
function ProductPicker({
  line,
  products,
  disabled,
  onChange,
}: {
  line: FormLine
  products: Product[]
  disabled: boolean
  onChange: (productId: number | null) => void
}) {
  const options = useMemo(() => {
    const suggestedIds = new Set(line.candidates.map((c) => c.product_id))
    return [
      ...line.candidates.map((c) =>
        productOption(
          { id: c.product_id, name: c.name, sku: c.sku },
          { hint: `${c.sku} · ${Math.round(c.score)}%${c.usual ? ' · usual' : ''}`, group: 'Suggestions' },
        ),
      ),
      ...products.filter((p) => !suggestedIds.has(p.id)).map((p) => productOption(p, { group: 'All products' })),
    ]
  }, [line.candidates, products])
  return (
    <SearchSelect
      aria-label="Product"
      value={line.product_id ? String(line.product_id) : ''}
      disabled={disabled}
      onChange={(v) => onChange(v ? Number(v) : null)}
      options={options}
      invalid={!line.product_id}
      className="min-w-56"
      placeholder="Search product, SKU or barcode"
    />
  )
}

/** Approve ke baad confirmation background mein jaata hai - thodi der poll karo */
function confirmationPending(o?: OrderDetail) {
  if (!o || o.confirmation_sent_at || !o.customer_email || !o.approved_at) return false
  return Date.now() - new Date(o.approved_at + (o.approved_at.endsWith('Z') ? '' : 'Z')).getTime() < 60_000
}

function ConfirmationEmail({ order, onSent }: { order: OrderDetail; onSent: (o: OrderDetail) => void }) {
  const [editing, setEditing] = useState(false)
  const [to, setTo] = useState(order.customer_email || '')
  const resend = useMutation({
    mutationFn: () => api.post<OrderDetail>(`/orders/${order.id}/send-confirmation`, { to: to.trim() || null }),
    onSuccess: (o) => {
      toast.success(`Confirmation emailed to ${o.confirmation_to}`)
      setEditing(false)
      onSent(o)
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Customer confirmation</p>
      <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <Mail className="size-4 text-muted-foreground" />
        <span className="flex-1">
          {order.confirmation_sent_at ? (
            <>
              Emailed to <b>{order.confirmation_to}</b> · {formatDateTime(order.confirmation_sent_at)}
            </>
          ) : confirmationPending(order) ? (
            <span className="text-muted-foreground">Sending to {order.customer_email}…</span>
          ) : order.customer_email ? (
            <span className="text-muted-foreground">Not sent (turned off in Settings → Email, or failed)</span>
          ) : (
            <span className="text-muted-foreground">Not sent - this customer has no email address</span>
          )}
        </span>
        <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
          <Send /> {order.confirmation_sent_at ? 'Resend' : 'Send'}
        </Button>
      </div>
      {editing && (
        <div className="flex flex-wrap gap-2">
          <Input
            className="flex-1"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="customer@example.com"
          />
          <Button size="sm" disabled={resend.isPending || !to.trim()} onClick={() => resend.mutate()}>
            {resend.isPending && <Spinner />} Send confirmation
          </Button>
        </div>
      )}
    </div>
  )
}

export default function OrderReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const confirm = useConfirm()

  const [form, setForm] = useState<FormState | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [selectedDest, setSelectedDest] = useState<number[]>([])

  const order = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<OrderDetail>(`/orders/${id}`),
    // Export chal raha ho to har 4 second refresh
    refetchInterval: (query) =>
      query.state.data?.exports.some((e) => e.status === 'pending' || e.status === 'running') ||
      confirmationPending(query.state.data)
        ? 4000
        : false,
  })
  const products = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api.get<Paged<Product>>('/products?page_size=5000'),
    staleTime: 60_000,
  })
  const customers = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get<Paged<Customer>>('/customers?page_size=5000'),
    staleTime: 60_000,
  })
  const destinations = useQuery({
    queryKey: ['destinations'],
    queryFn: () => api.get<Destination[]>('/destinations'),
  })

  // Server se naya data aaye aur user ne kuch edit nahi kiya to form reset karo
  useEffect(() => {
    if (order.data && !dirty) setForm(toForm(order.data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.data])

  const customerOptions = useMemo(() => (customers.data?.items || []).map((c) => customerOption(c)), [customers.data])

  const productById = useMemo(() => {
    const map = new Map<number, Product>()
    products.data?.items.forEach((p) => map.set(p.id, p))
    return map
  }, [products.data])

  // Customer ki pantry special prices (product badalne par wahi price lagega)
  const customerId = form?.customer_id
  const pantry = useQuery({
    queryKey: ['customers', 'pantry', customerId],
    queryFn: () => api.get<PantryItem[]>(`/customers/${customerId}/pantry`),
    enabled: !!customerId,
  })
  const special = useMemo(
    () => new Map((pantry.data || []).filter((i) => i.status === 'active').map((i) => [i.product_id, i.effective_price])),
    [pantry.data],
  )

  function afterChange(updated: OrderDetail) {
    qc.setQueryData(['order', id], updated)
    setForm(toForm(updated))
    setDirty(false)
    qc.invalidateQueries({ queryKey: ['orders'] })
    qc.invalidateQueries({ queryKey: ['order-stats'] })
  }

  function payload(f: FormState) {
    return {
      customer_id: f.customer_id,
      po_number: f.po_number || null,
      delivery_date: f.delivery_date || null,
      notes: f.notes || null,
      lines: f.lines.map((l) => ({
        id: l.id,
        raw_text: l.raw_text || null,
        quantity: Number(l.quantity) || 0,
        unit: l.unit || null,
        product_id: l.product_id,
        // Review screen pe dikha price hi final (user ne badla ho to override)
        unit_price: l.unit_price == null || (l.unit_price as unknown) === '' ? null : Number(l.unit_price),
      })),
    }
  }

  const save = useMutation({
    mutationFn: () => api.put<OrderDetail>(`/orders/${id}`, payload(form!)),
    onSuccess: (o) => {
      afterChange(o)
      toast.success('Changes saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const approve = useMutation({
    mutationFn: async () => {
      // Pehle unsaved changes save karo
      if (dirty) await api.put<OrderDetail>(`/orders/${id}`, payload(form!))
      return api.post<OrderDetail>(`/orders/${id}/approve`)
    },
    onSuccess: (o) => {
      afterChange(o)
      toast.success('Order approved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reject = useMutation({
    mutationFn: (reason?: string) => api.post<OrderDetail>(`/orders/${id}/reject`, { reason: reason || null }),
    onSuccess: (o) => {
      setRejectOpen(false)
      afterChange(o)
      toast.success(o.source === 'portal' ? 'Order rejected - the customer has been notified' : 'Order rejected')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reprocess = useMutation({
    mutationFn: () => api.post(`/orders/${id}/reprocess`),
    onSuccess: () => {
      toast.success('Re-running AI - new draft will appear shortly')
      qc.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const send = useMutation({
    mutationFn: () => api.post<OrderDetail>(`/orders/${id}/send`, { destination_ids: selectedDest }),
    onSuccess: (o) => {
      afterChange(o)
      setSelectedDest([])
      toast.success('Sending...')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const retry = useMutation({
    mutationFn: (jobId: number) => api.post(`/exports/${jobId}/retry`),
    onSuccess: () => {
      toast.success('Retry started')
      qc.invalidateQueries({ queryKey: ['order', id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (order.isLoading || !form) {
    return order.isError ? <ErrorState error={order.error} /> : <LoadingRows rows={8} />
  }
  const o = order.data!
  const msg = o.message
  const editable = o.status === 'needs_review'
  const busy = save.isPending || approve.isPending || reject.isPending || reprocess.isPending

  // ---- Form helpers ----
  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f!, ...patch }))
    setDirty(true)
  }

  function updateLine(key: string, patch: Partial<FormLine>) {
    setForm((f) => ({
      ...f!,
      lines: f!.lines.map((l) => {
        if (l.key !== key) return l
        const next = { ...l, ...patch }
        if ('unit_price' in patch) next.price_source = 'override'
        if ('product_id' in patch) {
          // User ne khud product choose kiya = manual
          const p = patch.product_id ? productById.get(patch.product_id) : undefined
          next.match_method = 'manual'
          next.match_confidence = patch.product_id ? 100 : 0
          next.product_sku = p?.sku || null
          next.product_name = p?.name || null
          next.unit_price = (p && special.has(p.id) ? special.get(p.id) : p?.price) ?? null
          next.price_source = p && special.has(p.id) ? 'customer' : 'product'
          if (p && !l.unit) next.unit = p.unit
        }
        return next
      }),
    }))
    setDirty(true)
  }

  function addLine() {
    newLineCounter += 1
    update({
      lines: [
        ...form!.lines,
        {
          key: `new${newLineCounter}`,
          id: null,
          raw_text: '',
          product_hint: null,
          quantity: 1,
          unit: '',
          product_id: null,
          product_sku: null,
          product_name: null,
          unit_price: null,
          match_confidence: 0,
          match_method: 'manual',
          candidates: [],
        },
      ],
    })
  }

  function removeLine(key: string) {
    update({ lines: form!.lines.filter((l) => l.key !== key) })
  }

  async function onReject() {
    // Portal order: customer ko notification jaata hai - reason pucho (optional)
    if (o.source === 'portal') return setRejectOpen(true)
    if (
      await confirm({
        title: 'Reject this order?',
        description: 'It will not be exported anywhere.',
        confirmText: 'Reject',
        destructive: true,
      })
    )
      reject.mutate(undefined)
  }

  async function onReprocess() {
    if (
      await confirm({
        title: 'Re-run AI on this message?',
        description: 'This draft will be deleted and a fresh one created.',
        confirmText: 'Re-run',
      })
    )
      reprocess.mutate()
  }

  // ---- Totals / approve checks ----
  const lineTotal = (l: FormLine) =>
    l.unit_price != null && (l.unit_price as unknown) !== '' ? Number(l.unit_price) * (Number(l.quantity) || 0) : null
  const subtotal = form.lines.reduce((sum, l) => sum + (lineTotal(l) || 0), 0)
  const unmatched = form.lines.filter((l) => !l.product_id).length
  const blockReason = !form.customer_id
    ? 'Select a customer to approve'
    : !form.lines.length
      ? 'Add at least one line'
      : unmatched
        ? `${unmatched} line${unmatched > 1 ? 's' : ''} need a product`
        : ''

  const activeDestinations = (destinations.data || []).filter((d) => d.is_active)
  const allProducts = products.data?.items || []

  return (
    <div>
      {cancelOpen && (
        <CancelDialog
          orderId={o.id}
          customerTold={o.source === 'portal' || o.source === 'standing'}
          onClose={() => setCancelOpen(false)}
          onDone={(r) => {
            setCancelOpen(false)
            afterChange(r)
            toast.success(
              r.source === 'portal' || r.source === 'standing'
                ? 'Order cancelled - the customer has been notified'
                : 'Order cancelled',
            )
            r.warnings.forEach((w) => toast.warning(w, { duration: 15000 }))
          }}
        />
      )}
      {rejectOpen && (
        <RejectDialog busy={reject.isPending} onClose={() => setRejectOpen(false)} onReject={(r) => reject.mutate(r)} />
      )}
      <PageHeader
        back={{ to: '/orders', label: 'Orders' }}
        title={
          <>
            Order #{o.id} <OrderStatusBadge status={o.status} />
          </>
        }
        description={`${o.source === 'manual' ? 'Entered manually' : o.source === 'portal' ? 'Ordered on your customer portal' : o.source === 'standing' ? 'Created from a standing order' : 'Received'} ${formatDateTime(o.created_at)}${o.payment_method ? ` · ${o.payment_method === 'cod' ? 'Cash on delivery' : 'On account'}` : ''}`}
        actions={
          o.status === 'approved' || o.status === 'exported' ? (
            <Button variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}>
              <Ban /> Cancel order
            </Button>
          ) : (
            editable && (
              <>
                {o.message && (
                  <Button variant="outline" onClick={onReprocess} disabled={busy}>
                    <RefreshCw /> Re-run AI
                  </Button>
                )}
                <Button variant="outline" onClick={onReject} disabled={busy} className="text-destructive">
                  <X /> Reject
                </Button>
                <Button variant="outline" onClick={() => save.mutate()} disabled={busy || !dirty}>
                  {save.isPending && <Spinner />} Save
                </Button>
                <Button onClick={() => approve.mutate()} disabled={busy || !!blockReason} title={blockReason}>
                  {approve.isPending ? <Spinner /> : <Check />} Approve
                </Button>
              </>
            )
          )
        }
      />
      {editable && blockReason && <p className="-mt-4 mb-4 text-right text-xs text-muted-foreground">{blockReason}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-5 2xl:grid-cols-3">
        {/* ---------- LEFT: original message ---------- */}
        <Card className="lg:sticky lg:top-20 lg:col-span-2 2xl:col-span-1 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Original message{' '}
              {msg ? (
                <ChannelBadge channel={msg.channel} />
              ) : o.source === 'portal' ? (
                <Badge variant="info">Portal</Badge>
              ) : (
                o.source === 'manual' && <Badge variant="secondary">Manual</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {msg ? (
              <>
                <div className="space-y-1">
                  <div>
                    <span className="text-muted-foreground">From: </span>
                    {msg.sender_name}{' '}
                    {msg.sender_email && <span className="text-muted-foreground">&lt;{msg.sender_email}&gt;</span>}
                  </div>
                  {msg.subject && (
                    <div>
                      <span className="text-muted-foreground">Subject: </span>
                      {msg.subject}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Received: </span>
                    {formatDateTime(msg.created_at)}
                  </div>
                </div>
                {msg.attachments.length > 0 && (
                  <div className="space-y-2">
                    {msg.attachments.map((a, i) => (
                      <div key={i} className="rounded-md border bg-muted/40 p-2.5">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Paperclip className="size-3.5" />
                          <span className="uppercase text-muted-foreground">{a.kind}</span> {a.name}
                        </div>
                        {a.transcript && <p className="mt-1.5 italic text-muted-foreground">“{a.transcript}”</p>}
                      </div>
                    ))}
                  </div>
                )}
                <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 font-sans text-[13px]">
                  {msg.body_text || msg.combined_text || '(no text)'}
                </pre>
              </>
            ) : (
              <p className="text-muted-foreground">
                {o.source === 'manual'
                  ? 'This order was entered manually - there is no source message.'
                  : o.source === 'portal'
                    ? `The customer placed this order on your ordering portal.`
                    : 'No source message.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ---------- RIGHT: draft order ---------- */}
        <div className="space-y-4 lg:col-span-3 2xl:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Draft order</CardTitle>
              <ConfidenceBadge value={o.overall_confidence} />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Customer"
                  hint={o.customer_raw && o.source === 'ai' ? `Message said: “${o.customer_raw}”` : undefined}
                >
                  <SearchSelect
                    aria-label="Customer"
                    value={form.customer_id ? String(form.customer_id) : ''}
                    disabled={!editable}
                    onChange={(v) => update({ customer_id: v ? Number(v) : null })}
                    options={customerOptions}
                    invalid={!form.customer_id}
                    placeholder="Search customer by name, code or email"
                  />
                </Field>
                <Field label="Delivery date">
                  <Input
                    type="date"
                    value={form.delivery_date}
                    disabled={!editable}
                    onChange={(e) => update({ delivery_date: e.target.value })}
                  />
                </Field>
                <Field label="PO number">
                  <Input value={form.po_number} disabled={!editable} onChange={(e) => update({ po_number: e.target.value })} />
                </Field>
                <Field label="Notes">
                  <Input value={form.notes} disabled={!editable} onChange={(e) => update({ notes: e.target.value })} />
                </Field>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <THead>
                    <TR>
                      <TH>Customer wrote → Product</TH>
                      <TH>Qty</TH>
                      <TH>Unit</TH>
                      <TH className="text-right">Amount</TH>
                      <TH>Match</TH>
                      <TH />
                    </TR>
                  </THead>
                  <TBody>
                    {form.lines.map((l) => (
                      <TR key={l.key}>
                        <TD className="space-y-1">
                          {/* Customer ne kya likha tha - product chunne mein madad */}
                          {l.id ? (
                            <p className="text-[13px] text-muted-foreground">“{l.raw_text}”</p>
                          ) : (
                            <Input
                              value={l.raw_text}
                              placeholder="Note (optional)"
                              disabled={!editable}
                              onChange={(e) => updateLine(l.key, { raw_text: e.target.value })}
                            />
                          )}
                          <ProductPicker
                            line={l}
                            products={allProducts}
                            disabled={!editable}
                            onChange={(pid) => updateLine(l.key, { product_id: pid })}
                          />
                        </TD>
                        <TD>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={l.quantity}
                            className="w-16 min-w-16 px-2"
                            disabled={!editable}
                            onChange={(e) => updateLine(l.key, { quantity: e.target.value as unknown as number })}
                          />
                        </TD>
                        <TD>
                          <Input
                            value={l.unit || ''}
                            className="w-16 min-w-16 px-2"
                            disabled={!editable}
                            onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                          />
                        </TD>
                        <TD className="whitespace-nowrap text-right">
                          {lineTotal(l) != null ? formatMoney(lineTotal(l)) : '-'}
                          {l.price_source === 'portal' && (
                            <div
                              className="text-[11px] font-medium text-blue-700"
                              title="The price the customer saw when ordering on the portal"
                            >
                              Portal price
                            </div>
                          )}
                          {l.price_source === 'customer' && (
                            <div
                              className="text-[11px] font-medium text-green-700"
                              title="Special price from this customer's pantry"
                            >
                              Customer price
                            </div>
                          )}
                          {editable && l.product_id ? (
                            <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                              @
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                aria-label="Unit price"
                                title="Unit price (override)"
                                value={l.unit_price ?? ''}
                                className="h-7 w-20 min-w-20 px-1.5 text-right text-xs"
                                onChange={(e) => updateLine(l.key, { unit_price: e.target.value as unknown as number })}
                              />
                            </div>
                          ) : (
                            l.unit_price != null && (
                              <div className="text-[11px] text-muted-foreground">@ {formatMoney(l.unit_price)}</div>
                            )
                          )}
                        </TD>
                        <TD>
                          <ConfidenceBadge value={l.match_confidence} empty={!l.product_id} />
                          {l.match_method && <div className="mt-0.5 text-[11px] text-muted-foreground">{l.match_method}</div>}
                        </TD>
                        <TD>
                          {editable && (
                            <Button variant="ghost" size="icon" onClick={() => removeLine(l.key)} title="Remove line">
                              <Trash2 className="text-destructive" />
                            </Button>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                {editable ? (
                  <Button variant="outline" size="sm" onClick={addLine}>
                    <Plus /> Add line
                  </Button>
                ) : (
                  <span />
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Subtotal (ex GST): </span>
                  <span className="font-semibold">{formatMoney(o.total_amount ?? subtotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---------- Delivery (approve ke baad) ---------- */}
          {(o.status === 'approved' || o.status === 'exported') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="size-4" /> Delivery
                </CardTitle>
                <CardDescription>Where this order has been sent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {o.exports.length === 0 ? (
                  <Alert tone="info">
                    Not sent anywhere yet.{' '}
                    {activeDestinations.length === 0 && (
                      <Link to="/destinations" className="font-medium underline">
                        Set up a destination
                      </Link>
                    )}
                  </Alert>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {o.exports.map((job) => (
                      <div key={job.id} className="flex flex-wrap items-start gap-3 p-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 font-medium">
                            {job.destination_name || `Destination #${job.destination_id}`}
                            <ExportStatusBadge status={job.status} />
                            {job.external_url && (
                              <a href={job.external_url} target="_blank" rel="noreferrer" className="text-primary" title="Open">
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>
                          <p
                            className={cn(
                              'mt-0.5 text-xs',
                              job.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
                            )}
                          >
                            {job.status === 'failed' ? job.last_error : job.response_summary}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Attempt {job.attempts}/{job.max_attempts}
                            {job.next_retry_at && ` · auto retry ${formatDateTime(job.next_retry_at)}`}
                          </p>
                        </div>
                        {job.status === 'failed' && (
                          <Button variant="outline" size="sm" onClick={() => retry.mutate(job.id)} disabled={retry.isPending}>
                            <RefreshCw /> Retry
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeDestinations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Send to...</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {activeDestinations.map((d) => (
                        <label
                          key={d.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDest.includes(d.id)}
                            onChange={(e) =>
                              setSelectedDest((s) => (e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id)))
                            }
                          />
                          {d.name} <span className="text-xs text-muted-foreground">({d.type_label})</span>
                        </label>
                      ))}
                      <Button size="sm" onClick={() => send.mutate()} disabled={!selectedDest.length || send.isPending}>
                        {send.isPending ? <Spinner /> : <Send />} Send
                      </Button>
                    </div>
                  </div>
                )}

                <ConfirmationEmail key={o.confirmation_sent_at || 'none'} order={o} onSent={afterChange} />

                {o.invoices.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Invoices</p>
                    {o.invoices.map((inv) => (
                      <Link
                        key={inv.id}
                        to={`/invoices/${inv.id}`}
                        className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                      >
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="flex-1 font-medium">{inv.number || `Invoice #${inv.id}`}</span>
                        <span className="text-xs text-muted-foreground">{sourceLabel(inv.source)}</span>
                        <InvoiceStatusBadge status={inv.status} />
                        <span>{formatMoney(inv.total)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/** Portal order reject - reason customer ko notification / email mein dikhta hai */
function RejectDialog({ busy, onClose, onReject }: { busy: boolean; onClose: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject this order?</DialogTitle>
          <DialogDescription>
            It will not be exported anywhere. The customer gets a notification (and an email) that the order was not accepted.
          </DialogDescription>
        </DialogHeader>
        <Field label="Reason for the customer" hint="Optional - e.g. Out of stock this week, please call us">
          <Textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => onReject(reason.trim())}>
            {busy && <Spinner />} Reject order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Approved / exported order cancel - stock wapas, OrderDraft invoice void, customer ko message */
function CancelDialog({
  orderId,
  customerTold,
  onClose,
  onDone,
}: {
  orderId: number
  customerTold: boolean
  onClose: () => void
  onDone: (o: OrderDetail & { warnings: string[] }) => void
}) {
  const [reason, setReason] = useState('')
  const cancel = useMutation({
    mutationFn: () =>
      api.post<OrderDetail & { warnings: string[] }>(`/orders/${orderId}/cancel`, { reason: reason.trim() || null }),
    onSuccess: onDone,
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel order #{orderId}?</DialogTitle>
          <DialogDescription>
            Stock taken off by this order is put back, unsent exports are stopped and an OrderDraft invoice is voided (if it has
            no payment). Invoices in Xero / QuickBooks / MYOB must be voided there.
            {customerTold && ' The customer gets a notification and an email.'}
          </DialogDescription>
        </DialogHeader>
        <Field label="Reason" hint={customerTold ? 'Optional - shown to the customer' : 'Optional - saved in the order history'}>
          <Textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep order
          </Button>
          <Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {cancel.isPending && <Spinner />} Cancel order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
