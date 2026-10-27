import { useMemo, useState } from 'react'
import { CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { StandingOrder } from '@/lib/types'
import { cn, formatMoney } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { SearchSelect, type SearchOption } from '@/components/ui/search-select'
import { Switch } from '@/components/ui/switch'

/**
 * Standing orders (recurring) - staff (Customer page) aur customer portal dono yahi use karte hain.
 *   StandingOrderDialog   naya / edit: delivery day, order day + time, har kitne hafte, products
 *   StandingOrderCard     schedule + items + agli deliveries (Skip / Undo skip)
 */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export type PickProduct = { id: number; name: string; sku: string; unit: string | null; price?: number | null }

export type StandingBody = {
  name: string
  is_active: boolean
  delivery_weekday: number
  generate_weekday: number
  generate_time: string
  every_weeks: number
  start_date: string | null
  end_date: string | null
  po_number: string | null
  notes: string | null
  lines: { product_id: number; quantity: number }[]
}

function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return hhmm
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

export function dayLabel(iso: string, long = false) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-AU', {
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function StandingOrderDialog({
  initial,
  products,
  showPrices,
  onSave,
  onClose,
}: {
  initial: StandingOrder | null
  products: PickProduct[]
  showPrices?: boolean
  onSave: (body: StandingBody) => Promise<unknown>
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [delivery, setDelivery] = useState(initial?.delivery_weekday ?? 0)
  const [generate, setGenerate] = useState(initial?.generate_weekday ?? 5)
  const [time, setTime] = useState(initial?.generate_time || '06:00')
  const [every, setEvery] = useState(initial?.every_weeks ?? 1)
  const [start, setStart] = useState(initial?.start_date || '')
  const [end, setEnd] = useState(initial?.end_date || '')
  const [po, setPo] = useState(initial?.po_number || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [active, setActive] = useState(initial?.is_active ?? true)
  const [lines, setLines] = useState<{ product_id: number; quantity: string }[]>(
    initial?.lines.map((l) => ({ product_id: l.product_id, quantity: String(l.quantity) })) || [],
  )
  const [pick, setPick] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  // Edit: product ab list mein nahi (inactive) - naam initial se
  const names = useMemo(() => new Map(initial?.lines.map((l) => [l.product_id, l]) || []), [initial])
  const options: SearchOption[] = products
    .filter((p) => !lines.some((l) => l.product_id === p.id))
    .map((p) => ({
      value: String(p.id),
      label: p.name,
      hint: [p.sku, p.unit, showPrices && p.price != null ? formatMoney(p.price) : ''].filter(Boolean).join(' · '),
    }))
  const lead = (delivery - generate + 7) % 7
  const estimate = showPrices
    ? lines.reduce((sum, l) => sum + (byId.get(l.product_id)?.price || 0) * (Number(l.quantity) || 0), 0)
    : null

  async function save() {
    setError('')
    if (!lines.length) return setError('Add at least one product')
    if (lines.some((l) => !(Number(l.quantity) > 0))) return setError('Every product needs a quantity more than 0')
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        is_active: active,
        delivery_weekday: delivery,
        generate_weekday: generate,
        generate_time: time || '06:00',
        every_weeks: every,
        start_date: start || null,
        end_date: end || null,
        po_number: po.trim() || null,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit standing order' : 'New standing order'}</DialogTitle>
          <DialogDescription>
            The same items, ordered automatically on a schedule. Each order arrives as "Needs review" before it's confirmed.
          </DialogDescription>
        </DialogHeader>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" hint="Optional - e.g. Monday usual">
            <Input
              value={name}
              maxLength={150}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${WEEKDAYS[delivery]} order`}
            />
          </Field>
          <Field label="Repeat">
            <Select aria-label="Repeat" value={every} onChange={(e) => setEvery(Number(e.target.value))}>
              <option value={1}>Every week</option>
              <option value={2}>Every 2 weeks</option>
              <option value={3}>Every 3 weeks</option>
              <option value={4}>Every 4 weeks</option>
            </Select>
          </Field>
          <Field label="Delivery day">
            <Select aria-label="Delivery day" value={delivery} onChange={(e) => setDelivery(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <Field label="Create the order on">
              <Select aria-label="Create the order on" value={generate} onChange={(e) => setGenerate(Number(e.target.value))}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                    {i === delivery ? ' (same day)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="At">
              <Input type="time" aria-label="Order time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Alert tone="info" className="sm:col-span-2">
            {every === 1 ? 'Every' : `Every ${every} weeks on`} {WEEKDAYS[generate]} at {timeLabel(time || '06:00')} an order is
            created for delivery on{' '}
            {lead === 0 ? 'the same day' : `${WEEKDAYS[delivery]} (${lead} day${lead === 1 ? '' : 's'} later)`}.
          </Alert>
          <Field label="Start from" hint="Empty = today">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End on" hint="Optional - empty = keeps going">
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Products</div>
          {lines.length > 0 && (
            <div className="divide-y rounded-md border">
              {lines.map((l, i) => {
                const p = byId.get(l.product_id)
                const label = p?.name || names.get(l.product_id)?.name || `#${l.product_id}`
                return (
                  <div key={l.product_id} className="flex items-center gap-2 px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <div className={cn('truncate text-sm', !p && 'text-muted-foreground line-through')}>{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {!p
                          ? 'No longer available - remove it'
                          : [p.unit, showPrices && p.price != null ? formatMoney(p.price) : ''].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <Input
                      aria-label={`${label} quantity`}
                      type="number"
                      min={0}
                      step="any"
                      className="w-24"
                      value={l.quantity}
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${label}`}
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                    >
                      <X />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
          <SearchSelect
            aria-label="Add a product"
            value={pick}
            options={options}
            placeholder="+ Add a product"
            onChange={(v) => {
              if (v) setLines([...lines, { product_id: Number(v), quantity: '1' }])
              setPick('')
            }}
          />
          {estimate != null && lines.length > 0 && (
            <div className="text-right text-sm text-muted-foreground">
              About <span className="font-medium text-foreground">{formatMoney(estimate)}</span> per order (ex GST, today's
              prices)
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="PO / reference" hint="Optional - added to every order">
            <Input value={po} maxLength={100} onChange={(e) => setPo(e.target.value)} />
          </Field>
          <Field label="Notes" hint="Optional - delivery instructions">
            <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={active} onCheckedChange={setActive} aria-label="Active" /> Active (off = paused, no orders are created)
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving && <Spinner />} Save standing order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function StandingOrderCard({
  so,
  showPrices,
  canEdit = true,
  showCreator = true,
  orderLink,
  onEdit,
  onDelete,
  onSkip,
  extra,
}: {
  so: StandingOrder
  showPrices?: boolean
  canEdit?: boolean
  showCreator?: boolean
  orderLink: (orderId: number) => string
  onEdit: () => void
  onDelete: () => void
  onSkip: (date: string, skip: boolean) => void
  extra?: React.ReactNode
}) {
  return (
    <Card className={so.is_active ? '' : 'opacity-70'}>
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2 font-semibold">
              {so.name}
              {so.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Paused</Badge>}
              {showCreator && so.created_by === 'customer' && <Badge variant="info">Set up by customer</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">{so.schedule}</div>
          </div>
          {canEdit && (
            <div className="flex gap-1">
              {extra}
              <Button variant="ghost" size="icon" title="Edit" aria-label={`Edit ${so.name}`} onClick={onEdit}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" title="Delete" aria-label={`Delete ${so.name}`} onClick={onDelete}>
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {so.lines.map((l) => (
            <Badge
              key={l.product_id}
              variant={l.available ? 'outline' : 'secondary'}
              className={l.available ? '' : 'line-through'}
            >
              {l.quantity} {l.unit || '×'} {l.name}
            </Badge>
          ))}
          {showPrices && so.estimate != null && (
            <span className="ml-auto text-sm text-muted-foreground">≈ {formatMoney(so.estimate)} / order</span>
          )}
        </div>
        {so.is_active && so.upcoming.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Next deliveries</div>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {so.upcoming.map((u) => (
                <div
                  key={u.delivery_date}
                  className={cn('rounded-md border px-2.5 py-1.5 text-sm', u.skipped && 'bg-muted/60 text-muted-foreground')}
                >
                  <div className={cn('font-medium', u.skipped && 'line-through')}>{dayLabel(u.delivery_date)}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.generated ? (
                      u.order_id ? (
                        <a href={orderLink(u.order_id)} className="text-primary hover:underline">
                          Order #{u.order_id} created
                        </a>
                      ) : (
                        'Order created'
                      )
                    ) : u.skipped ? (
                      'Skipped'
                    ) : (
                      `Ordered ${dayLabel(u.generate_at)} ${timeLabel(u.generate_at.slice(11, 16))}`
                    )}
                  </div>
                  {canEdit && !u.generated && (
                    <button
                      type="button"
                      className="mt-0.5 cursor-pointer text-xs text-primary hover:underline"
                      onClick={() => onSkip(u.delivery_date, !u.skipped)}
                    >
                      {u.skipped ? 'Undo skip' : 'Skip this week'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StandingEmpty({ onAdd, text }: { onAdd?: () => void; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <CalendarClock className="size-8 text-muted-foreground" />
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {onAdd && (
        <Button onClick={onAdd}>
          <Plus /> New standing order
        </Button>
      )}
    </div>
  )
}
