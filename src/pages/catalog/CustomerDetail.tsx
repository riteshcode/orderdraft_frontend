import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, ArchiveRestore, DollarSign, History, Pencil, Plus, Receipt, ShoppingCart, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Customer, CustomerFinance, Paged, PantryItem, PantryPriceStatus, Product } from '@/lib/types'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingRows, StatCard } from '@/components/common/states'
import { InvoiceStatusBadge, OrderStatusBadge } from '@/components/common/badges'
import { useLifecycle } from '@/components/common/CatalogLifecycle'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { productOption, SearchSelect } from '@/components/ui/search-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HistoryPanel } from '@/components/common/ActivityList'
import { PortalAccess } from '@/components/common/PortalAccess'
import { CustomerStandingOrders } from '@/components/common/CustomerStandingOrders'
import { sourceLabel } from '@/lib/providers'
import { CustomerDialog, InsightsPanel } from './Customers'

// ---------------- Finance ----------------
const AGING: { key: keyof CustomerFinance['invoices']['aging']; label: string; color: string }[] = [
  { key: 'current', label: 'Not due', color: 'bg-green-500' },
  { key: '1_30', label: '1-30 days', color: 'bg-amber-400' },
  { key: '31_60', label: '31-60', color: 'bg-orange-500' },
  { key: '61_90', label: '61-90', color: 'bg-red-500' },
  { key: '90_plus', label: '90+', color: 'bg-red-700' },
]

function monthLabel(m: string) {
  const [y, mm] = m.split('-').map(Number)
  return new Date(y, mm - 1, 1).toLocaleDateString('en-AU', { month: 'short' })
}

function FinanceTab({ f }: { f: CustomerFinance }) {
  const inv = f.invoices
  const maxMonth = Math.max(1, ...f.monthly_sales.map((m) => m.value))
  const agingTotal = AGING.reduce((s, a) => s + inv.aging[a.key], 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total sales"
          value={formatMoney(f.orders.sales_total)}
          hint={`${f.orders.approved} approved orders · ex GST`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Orders"
          value={f.orders.count}
          hint={
            f.orders.needs_review ? `${f.orders.needs_review} waiting for review` : `Avg ${formatMoney(f.orders.average_order)}`
          }
          icon={ShoppingCart}
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(inv.outstanding)}
          hint={`Invoiced ${formatMoney(inv.invoiced_total)} · paid ${formatMoney(inv.paid_total)}`}
          icon={Receipt}
          tone={inv.outstanding > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Overdue"
          value={formatMoney(inv.overdue)}
          hint={
            inv.overdue_count ? `${inv.overdue_count} invoice${inv.overdue_count > 1 ? 's' : ''} past due` : 'Nothing overdue'
          }
          icon={AlertTriangle}
          tone={inv.overdue > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales - last 6 months</CardTitle>
            <CardDescription>Approved order value, ex GST</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-3">
              {f.monthly_sales.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{m.value ? formatMoney(m.value) : ''}</span>
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${Math.max(2, (m.value / maxMonth) * 110)}px` }}
                    title={formatMoney(m.value)}
                  />
                  <span className="text-xs text-muted-foreground">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance by age</CardTitle>
            <CardDescription>Unpaid invoices, by days past the due date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agingTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No unpaid invoices.</p>
            ) : (
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {AGING.map((a) =>
                  inv.aging[a.key] ? (
                    <div key={a.key} className={a.color} style={{ width: `${(inv.aging[a.key] / agingTotal) * 100}%` }} />
                  ) : null,
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              {AGING.map((a) => (
                <div key={a.key}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn('size-2 rounded-full', a.color)} /> {a.label}
                  </div>
                  <div className="font-medium tabular-nums">{formatMoney(inv.aging[a.key])}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unpaid invoices</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {!inv.open.length ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">All paid up.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Invoice</TH>
                  <TH>Issued</TH>
                  <TH>Due</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Balance</TH>
                </TR>
              </THead>
              <TBody>
                {inv.open.map((i) => (
                  <TR key={i.id}>
                    <TD>
                      <Link to={`/invoices/${i.id}`} className="font-medium text-primary hover:underline">
                        {i.number || `#${i.id}`}
                      </Link>
                      {i.source !== 'internal' && (
                        <span className="ml-1 text-xs text-muted-foreground">{sourceLabel(i.source)}</span>
                      )}
                    </TD>
                    <TD>{formatDate(i.issue_date)}</TD>
                    <TD>
                      {formatDate(i.due_date)}
                      {i.days_overdue > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {i.days_overdue}d overdue
                        </Badge>
                      )}
                    </TD>
                    <TD>
                      <InvoiceStatusBadge status={i.status} />
                    </TD>
                    <TD className="text-right tabular-nums">{formatMoney(i.total)}</TD>
                    <TD className="text-right font-medium tabular-nums">{formatMoney(i.balance)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>
              {f.orders.first_order_at ? `Customer since ${formatDate(f.orders.first_order_at)}` : 'No orders yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {f.orders.recent.length > 0 && (
              <Table>
                <TBody>
                  {f.orders.recent.map((o) => (
                    <TR key={o.id}>
                      <TD>
                        <Link to={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                          #{o.id}
                        </Link>
                        {o.po_number && <span className="ml-1 text-xs text-muted-foreground">PO {o.po_number}</span>}
                      </TD>
                      <TD>{formatDate(o.created_at)}</TD>
                      <TD>
                        <OrderStatusBadge status={o.status} />
                      </TD>
                      <TD className="text-right tabular-nums">{formatMoney(o.total_amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>By value, approved orders</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {!f.top_products.length ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No approved orders yet.</p>
            ) : (
              <Table>
                <TBody>
                  {f.top_products.map((t) => (
                    <TR key={t.product_id}>
                      <TD>
                        <div className="font-medium">{t.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{t.sku}</div>
                      </TD>
                      <TD className="text-right text-xs text-muted-foreground">
                        {t.quantity} qty · {t.orders} orders
                      </TD>
                      <TD className="text-right tabular-nums">{formatMoney(t.value)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------- Pantry ----------------
const PRICE_BADGE: Record<PantryPriceStatus, { label: string; variant: BadgeVariant }> = {
  none: { label: 'Normal price', variant: 'secondary' },
  active: { label: 'Special price', variant: 'success' },
  scheduled: { label: 'Starts later', variant: 'info' },
  expired: { label: 'Expired', variant: 'warning' },
}

type Draft = { price: string; starts_on: string; expires_on: string; note: string; always: boolean }
const toDraft = (i: PantryItem): Draft => ({
  price: i.price != null ? String(i.price) : '',
  starts_on: i.starts_on || '',
  expires_on: i.expires_on || '',
  note: i.note || '',
  always: !i.expires_on,
})

function PantryRow({ item, customerId, canEdit }: { item: PantryItem; customerId: number; canEdit: boolean }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [d, setD] = useState<Draft>(() => toDraft(item))
  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(item))
  const key = ['customers', 'pantry', customerId]
  const diff = d.price !== '' && item.base_price != null ? Number(d.price) - item.base_price : null

  const save = useMutation({
    mutationFn: () =>
      api.put<PantryItem>(`/customers/${customerId}/pantry/${item.id}`, {
        price: d.price === '' ? null : Number(d.price),
        starts_on: d.starts_on || null,
        expires_on: d.always ? null : d.expires_on || null,
        note: d.note || null,
      }),
    onSuccess: () => {
      toast.success(`${item.name} saved`)
      qc.invalidateQueries({ queryKey: key })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: () => api.del(`/customers/${customerId}/pantry/${item.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  })
  const badge = PRICE_BADGE[item.status]

  return (
    <TR className={item.product_active ? '' : 'opacity-60'}>
      <TD>
        <div className="flex items-center gap-2">
          {item.image_url ? (
            <img src={item.image_url} alt="" className="size-8 rounded border object-cover" />
          ) : (
            <div className="size-8 rounded border bg-muted" />
          )}
          <div className="min-w-0">
            <div className="font-medium">{item.name}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {item.sku}
              {!item.product_active && ' · inactive'}
            </div>
            {canEdit ? (
              <Input
                aria-label={`${item.name} note`}
                className="mt-1 h-7 w-44 text-xs"
                placeholder="Note (staff only)"
                maxLength={255}
                value={d.note}
                onChange={(e) => setD({ ...d, note: e.target.value })}
              />
            ) : (
              d.note && <div className="mt-0.5 text-xs text-muted-foreground">{d.note}</div>
            )}
          </div>
        </div>
      </TD>
      <TD className="text-right tabular-nums text-muted-foreground">{formatMoney(item.base_price)}</TD>
      <TD>
        <Input
          aria-label={`${item.name} special price`}
          type="number"
          min={0}
          step="0.01"
          className="w-24 min-w-24"
          placeholder="Normal"
          value={d.price}
          disabled={!canEdit}
          onChange={(e) => setD({ ...d, price: e.target.value })}
        />
        {diff != null && diff !== 0 && (
          <div className={cn('mt-0.5 text-xs tabular-nums', diff < 0 ? 'text-green-700' : 'text-amber-700')}>
            {diff < 0 ? '' : '+'}
            {formatMoney(diff)} ({item.base_price ? Math.round((diff / item.base_price) * 100) : 0}%)
          </div>
        )}
      </TD>
      <TD>
        <Input
          aria-label={`${item.name} starts`}
          type="date"
          className="w-36 min-w-36"
          value={d.starts_on}
          disabled={!canEdit}
          onChange={(e) => setD({ ...d, starts_on: e.target.value })}
        />
      </TD>
      <TD>
        <div className="flex items-center gap-2">
          <Switch aria-label="Always" checked={d.always} disabled={!canEdit} onCheckedChange={(v) => setD({ ...d, always: v })} />
          {d.always ? (
            <span className="text-xs text-muted-foreground">Always</span>
          ) : (
            <Input
              aria-label={`${item.name} expires`}
              type="date"
              className="w-36 min-w-36"
              value={d.expires_on}
              disabled={!canEdit}
              onChange={(e) => setD({ ...d, expires_on: e.target.value })}
            />
          )}
        </div>
      </TD>
      <TD>
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">Charged {formatMoney(item.effective_price)}</div>
      </TD>
      {canEdit && (
        <TD className="whitespace-nowrap text-right">
          <Button
            size="sm"
            variant={dirty ? 'default' : 'outline'}
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Spinner />} Save
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Remove from pantry"
            disabled={remove.isPending}
            onClick={async () => {
              if (
                await confirm({
                  title: `Remove ${item.name} from the pantry?`,
                  description: item.price != null ? 'Their special price for this product is removed too.' : undefined,
                  confirmText: 'Remove',
                  destructive: true,
                })
              )
                remove.mutate()
            }}
          >
            <Trash2 className="text-destructive" />
          </Button>
        </TD>
      )}
    </TR>
  )
}

function PantryTab({ customerId }: { customerId: number }) {
  const qc = useQueryClient()
  const { isAdmin } = usePermission()
  const key = ['customers', 'pantry', customerId]
  const pantry = useQuery({ queryKey: key, queryFn: () => api.get<PantryItem[]>(`/customers/${customerId}/pantry`) })
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const [productId, setProductId] = useState('')
  const [price, setPrice] = useState('')
  const [search, setSearch] = useState('')

  const inPantry = useMemo(() => new Set((pantry.data || []).map((i) => i.product_id)), [pantry.data])
  const options = (products.data?.items || []).filter((p) => !inPantry.has(p.id))
  const rows = (pantry.data || []).filter((i) => !search || `${i.name} ${i.sku}`.toLowerCase().includes(search.toLowerCase()))

  const add = useMutation({
    mutationFn: () =>
      api.post<PantryItem>(`/customers/${customerId}/pantry`, {
        product_id: Number(productId),
        price: price === '' ? null : Number(price),
      }),
    onSuccess: (i) => {
      toast.success(`${i.name} added to pantry`)
      setProductId('')
      setPrice('')
      qc.invalidateQueries({ queryKey: key })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const fromHistory = useMutation({
    mutationFn: () => api.post<{ added: number }>(`/customers/${customerId}/pantry/bulk`, { from_history: true }),
    onSuccess: (r) => {
      toast.success(r.added ? `${r.added} usual products added` : 'No new products from order history')
      qc.invalidateQueries({ queryKey: key })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (pantry.isLoading) return <LoadingRows rows={4} />
  if (pantry.isError) return <ErrorState error={pantry.error} />

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Pantry & special prices</CardTitle>
          <CardDescription>
            Products this customer buys. Set a special sell price just for them - always, or until an expiry date. Leave the price
            empty to charge the normal price. Applied automatically on new orders and invoices.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" disabled={fromHistory.isPending} onClick={() => fromHistory.mutate()}>
            {fromHistory.isPending ? <Spinner /> : <History />} Add usual products
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2">
            <SearchSelect
              aria-label="Product to add"
              className="min-w-64 flex-1"
              value={productId}
              onChange={setProductId}
              options={options.map((p) => productOption(p, { hint: `${p.sku} · ${formatMoney(p.price)}` }))}
              placeholder="Search product to add"
            />
            <Input
              aria-label="Special price"
              type="number"
              min={0}
              step="0.01"
              className="w-32"
              placeholder="Special price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Button disabled={!productId || add.isPending} onClick={() => add.mutate()}>
              {add.isPending ? <Spinner /> : <Plus />} Add
            </Button>
          </div>
        )}
        {(pantry.data || []).length > 8 && (
          <Input placeholder="Search pantry" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        )}
        {!pantry.data?.length ? (
          <Alert tone="info">
            Pantry is empty. Add products above, or click "Add usual products" to pull them from order history.
          </Alert>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH className="text-right">Normal</TH>
                  <TH>Special price</TH>
                  <TH>Starts</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                  {isAdmin && <TH />}
                </TR>
              </THead>
              <TBody>
                {rows.map((i) => (
                  <PantryRow key={`${i.id}-${i.updated_at}`} item={i} customerId={customerId} canEdit={isAdmin} />
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------- Details ----------------
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  )
}

function DetailsTab({ c }: { c: Customer }) {
  const join = (...parts: (string | null)[]) => parts.filter(Boolean).join(', ')
  const delivery = join(
    c.delivery_line1,
    c.delivery_line2,
    join(c.delivery_city, c.delivery_region, c.delivery_postcode),
    c.delivery_country,
  )
  const postal = join(c.postal_line1, c.postal_line2, join(c.postal_city, c.postal_region, c.postal_postcode), c.postal_country)
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label="Contact" value={join(c.first_name, c.last_name).replace(', ', ' ')} />
            <Row label="Email" value={c.email} />
            <Row label="Other emails" value={c.other_emails} />
            <Row label="Phone" value={c.phone} />
            <Row label="Mobile" value={c.mobile} />
            <Row label="DDI" value={c.ddi} />
            <Row label="Fax" value={c.fax} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Address & business</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label="Delivery" value={delivery || c.address} />
            <Row label="Attention" value={c.delivery_attention} />
            <Row label="Instructions" value={c.delivery_instructions} />
            <Row label="Postal" value={postal} />
            <Row label="ABN" value={c.abn} />
            <Row label="ACN" value={c.company_number} />
            <Row label="Currency" value={c.default_currency} />
            <Row label="Sales tax" value={c.sales_tax_type} />
            <Row label="Source" value={sourceLabel(c.source)} />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------- Page ----------------
export default function CustomerDetail() {
  const id = Number(useParams().id)
  const [params] = useSearchParams() // ?tab=portal se seedha Portal access
  const { isAdmin } = usePermission()
  const [editing, setEditing] = useState(false)
  const { setActive, softDelete, restore } = useLifecycle('customers')
  const customer = useQuery({ queryKey: ['customers', 'detail', id], queryFn: () => api.get<Customer>(`/customers/${id}`) })
  const finance = useQuery({
    queryKey: ['customers', 'finance', id],
    queryFn: () => api.get<CustomerFinance>(`/customers/${id}/finance`),
  })

  if (customer.isLoading) return <LoadingRows rows={6} />
  if (customer.isError || !customer.data) return <ErrorState error={customer.error} />
  const c = customer.data

  return (
    <div>
      <PageHeader
        back={{ to: '/customers', label: 'Customers' }}
        title={
          <>
            {c.name}
            {c.deleted_at ? (
              <Badge variant="destructive">In Trash</Badge>
            ) : c.is_active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </>
        }
        description={[c.code, c.email, c.phone || c.mobile].filter(Boolean).join(' · ') || undefined}
        actions={
          isAdmin &&
          (c.deleted_at ? (
            <Button onClick={() => restore(c)}>
              <ArchiveRestore /> Restore
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Switch id="active" checked={c.is_active} onCheckedChange={(v) => setActive(c, v)} />
                <label htmlFor="active">Active</label>
              </div>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
              <Button variant="ghost" onClick={() => softDelete(c)}>
                <Trash2 className="text-destructive" /> Delete
              </Button>
            </>
          ))
        }
      />

      <Tabs defaultValue={params.get('tab') || 'finance'}>
        <TabsList className="mb-4 h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="finance">Orders & finance</TabsTrigger>
          <TabsTrigger value="pantry">Pantry & prices</TabsTrigger>
          <TabsTrigger value="standing">Standing orders</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="learned">What AI learned</TabsTrigger>
          <TabsTrigger value="portal">Portal access</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="finance">
          {finance.isLoading ? (
            <LoadingRows rows={5} />
          ) : finance.isError || !finance.data ? (
            <ErrorState error={finance.error} />
          ) : (
            <FinanceTab f={finance.data} />
          )}
        </TabsContent>
        <TabsContent value="pantry">
          <PantryTab customerId={c.id} />
        </TabsContent>
        <TabsContent value="standing">
          <CustomerStandingOrders customerId={c.id} />
        </TabsContent>
        <TabsContent value="details">
          <DetailsTab c={c} />
        </TabsContent>
        <TabsContent value="learned">
          <Card>
            <CardContent className="pt-4">
              <InsightsPanel customer={c} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="portal">
          <PortalAccess customer={c} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryPanel entity="customer" id={c.id} />
        </TabsContent>
      </Tabs>

      {editing && <CustomerDialog customer={c} onClose={() => setEditing(false)} />}
    </div>
  )
}
