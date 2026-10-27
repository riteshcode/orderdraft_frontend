import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Save, ScanLine, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Paged, PODetail, Product, Supplier, SupplierProductLink, TenantSettings } from '@/lib/types'
import { cn, formatDate, formatMoney, todayISO } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { productOption, SearchSelect, supplierOption } from '@/components/ui/search-select'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

type Line = { key: string; product_id: string; description: string; quantity: string; unit_cost: string; tax_rate: string }
let n = 0
const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const blank = (): Line => ({ key: `l${++n}`, product_id: '', description: '', quantity: '1', unit_cost: '', tax_rate: '' })

export default function PurchaseOrderForm() {
  const { id } = useParams()
  const editing = !!id
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const existing = useQuery({
    queryKey: ['purchase-orders', 'detail', Number(id)],
    queryFn: () => api.get<PODetail>(`/purchase-orders/${id}`),
    enabled: editing,
  })
  const suppliers = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get<Paged<Supplier>>('/suppliers?page_size=5000&status=all'),
  })
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<TenantSettings>('/settings') })

  const [supplierId, setSupplierId] = useState(params.get('supplier') || '')
  const [orderDate, setOrderDate] = useState(todayISO())
  const [expected, setExpected] = useState('')
  const [reference, setReference] = useState('')
  const [deliverTo, setDeliverTo] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>(() => [blank()])
  const [scan, setScan] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const po = existing.data
    if (!po) return
    setSupplierId(String(po.supplier_id))
    setOrderDate(po.order_date)
    setExpected(po.expected_date || '')
    setReference(po.reference || '')
    setDeliverTo(po.deliver_to || '')
    setNotes(po.notes || '')
    setLines(
      po.lines.map((l) => ({
        key: `e${l.id}`,
        product_id: l.product_id ? String(l.product_id) : '',
        description: l.product_id ? '' : l.description,
        quantity: String(l.quantity),
        unit_cost: String(l.unit_cost),
        tax_rate: String(l.tax_rate),
      })),
    )
  }, [existing.data])

  // Supplier ke products: cost + supplier code default ke liye
  const links = useQuery({
    queryKey: ['suppliers', 'products', Number(supplierId)],
    queryFn: () => api.get<SupplierProductLink[]>(`/suppliers/${supplierId}/products`),
    enabled: !!supplierId,
  })
  const linkByProduct = useMemo(() => new Map((links.data || []).map((l) => [l.product_id, l])), [links.data])
  const productById = useMemo(() => new Map((products.data?.items || []).map((p) => [p.id, p])), [products.data])
  const gstRate = settings.data?.invoice.gst_rate ?? 10

  const defaultCost = (pid: number) => {
    const l = linkByProduct.get(pid)
    const p = productById.get(pid)
    return l?.unit_cost ?? l?.last_cost ?? p?.avg_cost ?? p?.purchase_price ?? null
  }
  const costOf = (l: Line) =>
    l.unit_cost !== '' ? Number(l.unit_cost) : l.product_id ? (defaultCost(Number(l.product_id)) ?? 0) : 0
  const rateOf = (l: Line) => {
    if (l.tax_rate !== '') return Number(l.tax_rate)
    const p = l.product_id ? productById.get(Number(l.product_id)) : undefined
    return p && !p.is_taxable ? 0 : gstRate
  }
  const amount = (l: Line) => costOf(l) * (Number(l.quantity) || 0)
  const subtotal = lines.reduce((s, l) => s + amount(l), 0)
  const gst = lines.reduce((s, l) => s + (amount(l) * rateOf(l)) / 100, 0)

  // Supplier ke linked products upar (★), cost ke saath - search name / SKU / barcode / supplier code
  const productOptions = useMemo(() => {
    const all = (products.data?.items || []).filter((p) => p.is_active)
    const linked = all.filter((p) => linkByProduct.has(p.id))
    const others = all.filter((p) => !linkByProduct.has(p.id))
    return [
      ...linked.map((p) => {
        const link = linkByProduct.get(p.id)!
        const cost = link.unit_cost ?? link.last_cost
        return productOption(p, {
          group: "This supplier's products",
          prefix: '★ ',
          hint: `${p.sku}${cost != null ? ` · ${formatMoney(cost)}` : ''}`,
          keywords: `${p.barcode || ''} ${link.supplier_sku || ''}`,
        })
      }),
      ...others.map((p) => productOption(p, { group: linked.length ? 'Other products' : undefined })),
    ]
  }, [products.data, linkByProduct])
  const supplierOptions = useMemo(
    () => (suppliers.data?.items || []).filter((s) => s.is_active || String(s.id) === supplierId).map((s) => supplierOption(s)),
    [suppliers.data, supplierId],
  )

  // Expected date khali ho to: order date + sabse lamba lead time (save pe server bhi yahi karta hai)
  const maxLead = Math.max(
    0,
    ...lines.map((l) => (l.product_id ? (linkByProduct.get(Number(l.product_id))?.lead_time_days ?? 0) : 0)),
  )
  const autoExpected = maxLead && orderDate ? addDays(orderDate, maxLead) : ''

  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  /** Product chuna: supplier ka cost bhar do, qty kam se kam supplier ka minimum */
  function pickProduct(l: Line, value: string) {
    if (!value) return update(l.key, { product_id: '', unit_cost: '', tax_rate: '' })
    const pid = Number(value)
    const cost = defaultCost(pid)
    const min = linkByProduct.get(pid)?.min_order_qty
    const qty = Number(l.quantity) || 0
    update(l.key, {
      product_id: value,
      unit_cost: cost != null ? String(cost) : '',
      tax_rate: '',
      quantity: min && qty < min ? String(min) : l.quantity,
    })
  }

  function addByScan() {
    const code = scan.trim().toLowerCase()
    if (!code) return
    const p = (products.data?.items || []).find((x) => x.barcode?.toLowerCase() === code || x.sku.toLowerCase() === code)
    if (!p) return toast.error(`No product for ${scan}`)
    setLines((ls) => {
      const hit = ls.find((l) => l.product_id === String(p.id))
      if (hit) return ls.map((l) => (l === hit ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l))
      const empty = ls.find((l) => !l.product_id && !l.description)
      const min = linkByProduct.get(p.id)?.min_order_qty
      const cost = defaultCost(p.id)
      const line = {
        ...(empty || blank()),
        product_id: String(p.id),
        quantity: min ? String(min) : '1',
        unit_cost: cost != null ? String(cost) : '',
      }
      return empty ? ls.map((l) => (l === empty ? line : l)) : [...ls, line]
    })
    setScan('')
  }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        supplier_id: Number(supplierId),
        order_date: orderDate || null,
        expected_date: expected || null,
        reference: reference || null,
        deliver_to: deliverTo || null,
        notes: notes || null,
        lines: lines
          .filter((l) => l.product_id || l.description.trim())
          .map((l) => ({
            product_id: l.product_id ? Number(l.product_id) : null,
            description: l.product_id ? null : l.description.trim(),
            quantity: Number(l.quantity),
            unit_cost: l.unit_cost === '' ? null : Number(l.unit_cost),
            tax_rate: l.tax_rate === '' ? null : Number(l.tax_rate),
          })),
      }
      return editing ? api.put<PODetail>(`/purchase-orders/${id}`, body) : api.post<PODetail>('/purchase-orders', body)
    },
    onSuccess: (po) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success(editing ? `${po.number} saved` : `${po.number} created`)
      navigate(`/purchase-orders/${po.id}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit() {
    setError('')
    if (!supplierId) return setError('Select a supplier')
    if (!lines.some((l) => l.product_id || l.description.trim())) return setError('Add at least one line')
    save.mutate()
  }

  if (editing && existing.isLoading) return <LoadingRows rows={6} />
  if (editing && existing.isError) return <ErrorState error={existing.error} />
  if (existing.data && existing.data.status !== 'draft')
    return <Alert tone="warning">Only draft purchase orders can be edited.</Alert>

  return (
    <div>
      <PageHeader
        back={{
          to: editing ? `/purchase-orders/${id}` : '/purchase-orders',
          label: editing ? existing.data?.number || 'Back' : 'Purchase orders',
        }}
        title={editing ? `Edit ${existing.data?.number}` : 'New purchase order'}
        description="Costs are ex GST. Picking a product fills in the supplier's cost and minimum order quantity."
      />
      <Card>
        <CardContent className="space-y-5 pt-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Supplier *" className="sm:col-span-2">
              <SearchSelect
                aria-label="Supplier"
                value={supplierId}
                onChange={setSupplierId}
                options={supplierOptions}
                placeholder="Search supplier"
              />
            </Field>
            <Field label="Order date">
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </Field>
            <Field
              label="Expected delivery"
              hint={!expected && autoExpected ? `Auto: ${formatDate(autoExpected)} (${maxLead} day lead time)` : undefined}
            >
              <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </Field>
            <Field label="Reference">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Deliver to" className="sm:col-span-3" hint="Empty = your business address">
              <Input value={deliverTo} onChange={(e) => setDeliverTo(e.target.value)} />
            </Field>
          </div>

          <div className="flex max-w-md items-center gap-2">
            <ScanLine className="size-4 text-muted-foreground" />
            <Input
              aria-label="Scan barcode"
              placeholder="Scan barcode or type SKU, then Enter"
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addByScan()
                }
              }}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH className="min-w-64">Product / description</TH>
                  <TH>Supplier code</TH>
                  <TH>Qty</TH>
                  <TH>Cost (ex GST)</TH>
                  <TH>GST %</TH>
                  <TH className="text-right">Amount</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {lines.map((l, i) => {
                  const pid = l.product_id ? Number(l.product_id) : null
                  const link = pid ? linkByProduct.get(pid) : undefined
                  const p = pid ? productById.get(pid) : undefined
                  return (
                    <TR key={l.key}>
                      <TD>
                        <SearchSelect
                          aria-label={`Line ${i + 1} product`}
                          value={l.product_id}
                          onChange={(v) => pickProduct(l, v)}
                          options={productOptions}
                          clearable
                          placeholder="Search product - or type a description below"
                        />
                        {!l.product_id && (
                          <Input
                            aria-label={`Line ${i + 1} description`}
                            className="mt-1"
                            placeholder="Description (freight, packaging...)"
                            value={l.description}
                            onChange={(e) => update(l.key, { description: e.target.value })}
                          />
                        )}
                        {(!!p?.is_tracked_inventory || !!link?.lead_time_days) && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {p?.is_tracked_inventory && <>On hand {p.quantity_on_hand ?? 0}</>}
                            {p?.is_tracked_inventory && p.reorder_level != null && ` · reorder at ${p.reorder_level}`}
                            {link?.lead_time_days
                              ? `${p?.is_tracked_inventory ? ' · ' : ''}${link.lead_time_days} day lead time`
                              : ''}
                          </div>
                        )}
                      </TD>
                      <TD className="font-mono text-xs">{link?.supplier_sku || '-'}</TD>
                      <TD>
                        <Input
                          aria-label={`Line ${i + 1} quantity`}
                          type="number"
                          min={0}
                          step="any"
                          className="w-20 min-w-20"
                          value={l.quantity}
                          onChange={(e) => update(l.key, { quantity: e.target.value })}
                        />
                        {link?.min_order_qty != null && link.min_order_qty > 0 && (
                          <div
                            className={cn(
                              'mt-1 text-xs whitespace-nowrap',
                              (Number(l.quantity) || 0) < link.min_order_qty
                                ? 'font-medium text-amber-600'
                                : 'text-muted-foreground',
                            )}
                          >
                            Min {link.min_order_qty}
                          </div>
                        )}
                      </TD>
                      <TD>
                        <Input
                          aria-label={`Line ${i + 1} cost`}
                          type="number"
                          min={0}
                          step="any"
                          className="w-24 min-w-24"
                          value={l.unit_cost}
                          placeholder={pid && defaultCost(pid) != null ? String(defaultCost(pid)) : '0.00'}
                          onChange={(e) => update(l.key, { unit_cost: e.target.value })}
                        />
                      </TD>
                      <TD>
                        <Input
                          aria-label={`Line ${i + 1} GST`}
                          type="number"
                          min={0}
                          max={100}
                          className="w-16 min-w-16"
                          value={l.tax_rate}
                          placeholder={String(rateOf(l))}
                          onChange={(e) => update(l.key, { tax_rate: e.target.value })}
                        />
                      </TD>
                      <TD className="whitespace-nowrap text-right tabular-nums">{formatMoney(amount(l))}</TD>
                      <TD>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Remove line"
                          disabled={lines.length === 1}
                          onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, blank()])}>
              <Plus /> Add line
            </Button>
            <div className="min-w-56 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (ex GST)</span>
                <span className="tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span className="tabular-nums">{formatMoney(gst)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(subtotal + gst)}</span>
              </div>
            </div>
          </div>
          <Field label="Notes for the supplier" hint="Printed on the PO">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? <Spinner /> : <Save />} {editing ? 'Save draft' : 'Create draft'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
