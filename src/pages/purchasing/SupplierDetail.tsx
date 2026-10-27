import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ClipboardList, Pencil, Plus, RotateCcw, Star, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Paged, Product, SupplierDetail as SupplierData, SupplierProductLink } from '@/lib/types'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingRows, StatCard } from '@/components/common/states'
import { POStatusBadge } from '@/components/common/badges'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { productOption, SearchSelect } from '@/components/ui/search-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HistoryPanel } from '@/components/common/ActivityList'
import { SupplierDialog } from './Suppliers'

type Draft = { supplier_sku: string; unit_cost: string; min_order_qty: string; lead_time_days: string; is_preferred: boolean }
const toDraft = (l: SupplierProductLink): Draft => ({
  supplier_sku: l.supplier_sku || '',
  unit_cost: l.unit_cost != null ? String(l.unit_cost) : '',
  min_order_qty: l.min_order_qty != null ? String(l.min_order_qty) : '',
  lead_time_days: l.lead_time_days != null ? String(l.lead_time_days) : '',
  is_preferred: l.is_preferred,
})
const num = (v: string) => (v === '' ? null : Number(v))

function LinkRow({ link, supplierId, canEdit }: { link: SupplierProductLink; supplierId: number; canEdit: boolean }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [d, setD] = useState<Draft>(() => toDraft(link))
  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(link))
  const refresh = () => qc.invalidateQueries({ queryKey: ['suppliers'] })
  const save = useMutation({
    mutationFn: () =>
      api.put(`/suppliers/${supplierId}/products/${link.id}`, {
        supplier_sku: d.supplier_sku || null,
        unit_cost: num(d.unit_cost),
        min_order_qty: num(d.min_order_qty),
        lead_time_days: num(d.lead_time_days),
        is_preferred: d.is_preferred,
      }),
    onSuccess: () => {
      toast.success(`${link.name} saved`)
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: () => api.del(`/suppliers/${supplierId}/products/${link.id}`),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  })
  const input = (k: keyof Omit<Draft, 'is_preferred'>, label: string, cls: string, type = 'number') => (
    <Input
      aria-label={`${link.name} ${label}`}
      type={type}
      min={0}
      step="any"
      className={cls}
      value={d[k]}
      disabled={!canEdit}
      onChange={(e) => setD({ ...d, [k]: e.target.value })}
    />
  )
  return (
    <TR className={link.product_active ? '' : 'opacity-60'}>
      <TD>
        <div className="font-medium">{link.name}</div>
        <div className="font-mono text-xs text-muted-foreground">{link.sku}</div>
      </TD>
      <TD>{input('supplier_sku', 'supplier code', 'w-28 min-w-28', 'text')}</TD>
      <TD>{input('unit_cost', 'cost', 'w-24 min-w-24')}</TD>
      <TD className="text-right text-xs tabular-nums text-muted-foreground">
        {link.last_cost != null ? formatMoney(link.last_cost) : '-'}
        {link.last_received_at && <div>{formatDate(link.last_received_at)}</div>}
      </TD>
      <TD>{input('min_order_qty', 'min order', 'w-20 min-w-20')}</TD>
      <TD>{input('lead_time_days', 'lead time', 'w-20 min-w-20')}</TD>
      <TD>
        <Switch
          aria-label={`${link.name} preferred`}
          checked={d.is_preferred}
          disabled={!canEdit}
          onCheckedChange={(v) => setD({ ...d, is_preferred: v })}
        />
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
            title="Remove"
            disabled={remove.isPending}
            onClick={async () => {
              if (
                await confirm({
                  title: `Remove ${link.name} from this supplier?`,
                  description: 'The supplier code, cost and lead time for this product are removed. The product itself stays.',
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

function ProductsTab({ supplierId }: { supplierId: number }) {
  const qc = useQueryClient()
  const { isAdmin } = usePermission()
  const links = useQuery({
    queryKey: ['suppliers', 'products', supplierId],
    queryFn: () => api.get<SupplierProductLink[]>(`/suppliers/${supplierId}/products`),
  })
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const [productId, setProductId] = useState('')
  const [cost, setCost] = useState('')
  const [code, setCode] = useState('')
  const [minQty, setMinQty] = useState('')
  const [lead, setLead] = useState('')
  const linked = useMemo(() => new Set((links.data || []).map((l) => l.product_id)), [links.data])
  const add = useMutation({
    mutationFn: () =>
      api.post(`/suppliers/${supplierId}/products`, {
        product_id: Number(productId),
        unit_cost: num(cost),
        supplier_sku: code || null,
        min_order_qty: num(minQty),
        lead_time_days: num(lead),
      }),
    onSuccess: () => {
      setProductId('')
      setCost('')
      setCode('')
      setMinQty('')
      setLead('')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  if (links.isLoading) return <LoadingRows rows={3} />
  if (links.isError) return <ErrorState error={links.error} />
  return (
    <Card>
      <CardHeader>
        <CardTitle>Products from this supplier</CardTitle>
        <CardDescription>
          What these do on a purchase order: <b>Cost</b> fills the line price, <b>Supplier code</b> is printed on the PO,{' '}
          <b>Min order</b> sets the starting quantity (with a warning if you order less), <b>Lead days</b> sets the expected
          delivery date. The <b>preferred</b> supplier is used for reorder suggestions. Last cost updates when stock is received.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <SearchSelect
              aria-label="Product to link"
              className="min-w-64 flex-1"
              value={productId}
              onChange={setProductId}
              options={(products.data?.items || []).filter((p) => !linked.has(p.id)).map((p) => productOption(p))}
              placeholder="Search product to add"
            />
            <Input
              aria-label="Supplier code"
              className="w-32"
              placeholder="Supplier code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Input
              aria-label="Cost"
              type="number"
              min={0}
              step="any"
              className="w-32"
              placeholder="Cost (ex GST)"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            <Input
              aria-label="Min order"
              type="number"
              min={0}
              step="any"
              className="w-28"
              placeholder="Min order"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
            />
            <Input
              aria-label="Lead days"
              type="number"
              min={0}
              className="w-28"
              placeholder="Lead days"
              value={lead}
              onChange={(e) => setLead(e.target.value)}
            />
            <Button disabled={!productId || add.isPending} onClick={() => add.mutate()}>
              {add.isPending ? <Spinner /> : <Plus />} Add
            </Button>
          </div>
        )}
        {!links.data?.length ? (
          <p className="text-sm text-muted-foreground">
            No products linked yet. Products are also linked automatically the first time you receive them from this supplier.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH>Supplier code</TH>
                  <TH>Cost (ex GST)</TH>
                  <TH className="text-right">Last cost</TH>
                  <TH>Min order</TH>
                  <TH>Lead days</TH>
                  <TH>
                    <Star className="inline size-3.5" /> Preferred
                  </TH>
                  {isAdmin && <TH />}
                </TR>
              </THead>
              <TBody>
                {links.data.map((l) => (
                  <LinkRow
                    key={`${l.id}-${l.unit_cost}-${l.is_preferred}-${l.last_cost}`}
                    link={l}
                    supplierId={supplierId}
                    canEdit={isAdmin}
                  />
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 whitespace-pre-line break-words">{value}</dd>
    </div>
  )
}

export default function SupplierDetail() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { isAdmin } = usePermission()
  const [editing, setEditing] = useState(false)
  const sup = useQuery({ queryKey: ['suppliers', 'detail', id], queryFn: () => api.get<SupplierData>(`/suppliers/${id}`) })

  const setActive = useMutation({
    mutationFn: (is_active: boolean) => api.post(`/suppliers/${id}/status`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: (e: Error) => toast.error(e.message),
  })
  async function remove() {
    const ok = await confirm({
      title: 'Move this supplier to the Trash?',
      description: 'Its purchase orders are kept. You can restore it any time from Suppliers → Trash.',
      confirmText: 'Move to Trash',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.del(`/suppliers/${id}`)
      toast.success('Supplier moved to the Trash')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      navigate('/suppliers')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function restoreSupplier() {
    try {
      await api.post(`/suppliers/${id}/restore`)
      toast.success('Supplier restored')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (sup.isLoading) return <LoadingRows rows={6} />
  if (sup.isError || !sup.data) return <ErrorState error={sup.error} />
  const s = sup.data

  return (
    <div>
      <PageHeader
        back={{ to: '/suppliers', label: 'Suppliers' }}
        title={
          <>
            {s.name}{' '}
            {s.deleted_at ? (
              <Badge variant="destructive">In Trash</Badge>
            ) : s.is_active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </>
        }
        description={[s.code, s.email, s.phone].filter(Boolean).join(' · ') || undefined}
        actions={
          isAdmin &&
          (s.deleted_at ? (
            <Button onClick={restoreSupplier}>
              <RotateCcw /> Restore
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Switch id="sup-active" checked={s.is_active} onCheckedChange={(v) => setActive.mutate(v)} />
                <label htmlFor="sup-active">Active</label>
              </div>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
              <Button asChild>
                <Link to={`/purchase-orders/new?supplier=${s.id}`}>
                  <ClipboardList /> New purchase order
                </Link>
              </Button>
              <Button variant="ghost" title="Move to Trash" onClick={remove}>
                <Trash2 className="text-destructive" />
              </Button>
            </>
          ))
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open purchase orders" value={s.open_pos} hint={`${formatMoney(s.open_po_value)} on order`} />
        <StatCard label="Received to date" value={formatMoney(s.received_total)} hint="Ex GST, all stock receipts" />
        <StatCard label="Purchase orders" value={s.po_count} />
      </div>
      <Tabs defaultValue="products">
        <TabsList className="mb-4">
          <TabsTrigger value="products">Products & costs</TabsTrigger>
          <TabsTrigger value="pos">Purchase orders</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductsTab supplierId={s.id} />
        </TabsContent>
        <TabsContent value="pos">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              {!s.recent_pos.length ? (
                <p className="p-6 text-sm text-muted-foreground">No purchase orders yet.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>PO</TH>
                      <TH>Ordered</TH>
                      <TH>Expected</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {s.recent_pos.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <Link to={`/purchase-orders/${p.id}`} className="font-medium text-primary hover:underline">
                            {p.number}
                          </Link>
                        </TD>
                        <TD>{formatDate(p.order_date)}</TD>
                        <TD>{formatDate(p.expected_date)}</TD>
                        <TD>
                          <POStatusBadge status={p.status} />
                        </TD>
                        <TD className="text-right tabular-nums">{formatMoney(p.total)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details">
          <Card>
            <CardContent className="pt-4">
              <dl className={cn('divide-y')}>
                <Row label="Contact" value={s.contact_name} />
                <Row label="Orders email" value={s.email} />
                <Row label="CC" value={s.cc_emails} />
                <Row label="Phone" value={s.phone} />
                <Row label="Address" value={s.address} />
                <Row label="ABN" value={s.abn} />
                <Row label="Payment terms" value={s.payment_terms_days != null ? `${s.payment_terms_days} days` : null} />
                <Row label="Our account" value={s.account_number} />
                <Row label="Currency" value={s.currency} />
                <Row label="Notes" value={s.notes} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <HistoryPanel entity="supplier" id={s.id} />
        </TabsContent>
      </Tabs>
      {editing && <SupplierDialog supplier={s} onClose={() => setEditing(false)} />}
    </div>
  )
}
