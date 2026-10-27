import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Barcode, FolderTree, Image as ImageIcon, Package, Pencil, Printer, PlusCircle, Trash2, Upload } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { Paged, Product, SupplierProductLink } from '@/lib/types'
import { formatMoney } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermission } from '@/hooks/useMe'
import { purchaseRates, salesRates, useAccounts, useTaxRates } from '@/hooks/useAccounting'
import { PageHeader } from '@/components/common/PageHeader'
import { ActiveSwitch, StatusTabs, TrashActions, useLifecycle, type CatalogStatus } from '@/components/common/CatalogLifecycle'
import { EmptyState, ErrorState, LoadingRows, Pagination, SearchInput } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { SearchSelect } from '@/components/ui/search-select'
import { categoryOptions, useCategories } from '@/hooks/useCategories'
import { SortTH, useSort } from '@/components/common/SortableTH'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductImages } from '@/components/common/ProductImages'
import { ProductCodes } from '@/components/common/ProductCodes'
import { isProvider, sourceLabel } from '@/lib/providers'

function SourceBadge({ source }: { source: string }) {
  if (isProvider(source)) return <Badge variant="info">{sourceLabel(source)}</Badge>
  if (source === 'csv') return <Badge variant="secondary">CSV</Badge>
  return <Badge variant="outline">Manual</Badge>
}

type Form = {
  sku: string
  name: string
  description: string
  unit: string
  price: string
  is_taxable: boolean
  account_code: string
  tax_type: string
  aliases: string
  barcode: string
  reorder_level: string
  purchase_description: string
  purchase_price: string
  purchase_account_code: string
  purchase_tax_type: string
  is_tracked_inventory: boolean
  quantity_on_hand: string
  is_sold: boolean
  is_purchased: boolean
  category_id: string
}

const EMPTY: Form = {
  sku: '',
  name: '',
  description: '',
  unit: '',
  price: '',
  is_taxable: true,
  account_code: '',
  tax_type: '',
  aliases: '',
  barcode: '',
  reorder_level: '',
  purchase_description: '',
  purchase_price: '',
  purchase_account_code: '',
  purchase_tax_type: '',
  is_tracked_inventory: false,
  quantity_on_hand: '',
  is_sold: true,
  is_purchased: false,
  category_id: '',
}

/** Product dialog -> Suppliers tab: kaun supply karta hai, kis cost pe, min order, lead time */
function ProductSuppliers({ productId }: { productId: number }) {
  const links = useQuery({
    queryKey: ['suppliers', 'by-product', productId],
    queryFn: () => api.get<SupplierProductLink[]>(`/products/${productId}/suppliers`),
  })
  if (links.isLoading) return <LoadingRows rows={2} />
  if (!links.data?.length)
    return (
      <Alert tone="info">
        No supplier linked yet. Open a supplier → Products tab to link this product with its cost, minimum order and lead time.
      </Alert>
    )
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <THead>
          <TR>
            <TH>Supplier</TH>
            <TH>Code</TH>
            <TH className="text-right">Cost</TH>
            <TH className="text-right">Last cost</TH>
            <TH className="text-right">Min order</TH>
            <TH className="text-right">Lead days</TH>
          </TR>
        </THead>
        <TBody>
          {links.data.map((l) => (
            <TR key={l.id}>
              <TD>
                <Link className="font-medium hover:underline" to={`/suppliers/${l.supplier_id}`}>
                  {l.supplier_name}
                </Link>
                {l.is_preferred && <span className="ml-1.5 text-xs text-amber-600">★ preferred</span>}
              </TD>
              <TD className="font-mono text-xs">{l.supplier_sku || '-'}</TD>
              <TD className="text-right tabular-nums">{l.unit_cost != null ? formatMoney(l.unit_cost) : '-'}</TD>
              <TD className="text-right tabular-nums">{l.last_cost != null ? formatMoney(l.last_cost) : '-'}</TD>
              <TD className="text-right tabular-nums">{l.min_order_qty ?? '-'}</TD>
              <TD className="text-right tabular-nums">{l.lead_time_days ?? '-'}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}

export function ProductDialog({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Form>(() =>
    product
      ? {
          sku: product.sku,
          name: product.name,
          description: product.description || '',
          unit: product.unit || '',
          price: product.price != null ? String(product.price) : '',
          is_taxable: product.is_taxable,
          account_code: product.account_code || '',
          tax_type: product.tax_type || '',
          aliases: product.aliases.join(', '),
          barcode: product.barcode || '',
          reorder_level: product.reorder_level != null ? String(product.reorder_level) : '',
          purchase_description: product.purchase_description || '',
          purchase_price: product.purchase_price != null ? String(product.purchase_price) : '',
          purchase_account_code: product.purchase_account_code || '',
          purchase_tax_type: product.purchase_tax_type || '',
          is_tracked_inventory: product.is_tracked_inventory,
          quantity_on_hand: product.quantity_on_hand != null ? String(product.quantity_on_hand) : '',
          is_sold: product.is_sold,
          is_purchased: product.is_purchased,
          category_id: product.category_id ? String(product.category_id) : '',
        }
      : EMPTY,
  )
  const [error, setError] = useState('')
  const accounts = useAccounts()
  const taxes = useTaxRates()
  const categories = useCategories()
  // Product pe pehle se koi code ho jo list mein nahi (inactive/purana) - wo bhi dikhao
  const accountOptions = [...(accounts.data || [])]
  if (form.account_code && !accountOptions.some((a) => a.code === form.account_code))
    accountOptions.push({ code: form.account_code, name: '(not in list)' } as (typeof accountOptions)[number])
  const taxOptions = [...salesRates(taxes.data)]
  if (form.tax_type && !taxOptions.some((t) => t.code === form.tax_type))
    taxOptions.push({ code: form.tax_type, name: form.tax_type, rate: NaN } as (typeof taxOptions)[number])
  const purchaseTaxOptions = [...purchaseRates(taxes.data)]
  if (form.purchase_tax_type && !purchaseTaxOptions.some((t) => t.code === form.purchase_tax_type))
    purchaseTaxOptions.push({
      code: form.purchase_tax_type,
      name: form.purchase_tax_type,
      rate: NaN,
    } as (typeof taxOptions)[number])
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  const save = useMutation({
    mutationFn: () => {
      const body = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description || null,
        unit: form.unit || null,
        price: form.price === '' ? null : Number(form.price),
        is_taxable: form.is_taxable,
        account_code: form.account_code || null,
        tax_type: form.tax_type || null,
        barcode: form.barcode.trim() || null, // khali = internal barcode
        reorder_level: form.reorder_level === '' ? null : Number(form.reorder_level),
        aliases: form.aliases
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        purchase_description: form.purchase_description || null,
        purchase_price: form.purchase_price === '' ? null : Number(form.purchase_price),
        purchase_account_code: form.purchase_account_code || null,
        purchase_tax_type: form.purchase_tax_type || null,
        is_tracked_inventory: form.is_tracked_inventory,
        quantity_on_hand: form.quantity_on_hand === '' ? null : Number(form.quantity_on_hand),
        is_sold: form.is_sold,
        is_purchased: form.is_purchased,
        category_id: form.category_id ? Number(form.category_id) : null,
      }
      return product ? api.put(`/products/${product.id}`, body) : api.post('/products', body)
    },
    onSuccess: () => {
      toast.success(product ? 'Product updated' : 'Product added')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit() {
    if (!form.sku.trim() || !form.name.trim()) return setError('SKU and name are required')
    if (form.price !== '' && isNaN(Number(form.price))) return setError('Price must be a number')
    if (form.purchase_price !== '' && isNaN(Number(form.purchase_price))) return setError('Cost price must be a number')
    setError('')
    save.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'Add product'}</DialogTitle>
        </DialogHeader>
        {isProvider(product?.source) && (
          <Alert tone="info">
            This product comes from {sourceLabel(product?.source)}. The next sync may overwrite name and price.
          </Alert>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        <Tabs defaultValue="sales">
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="purchase">Purchase & stock</TabsTrigger>
            <TabsTrigger value="codes">Barcode & QR</TabsTrigger>
            {product && <TabsTrigger value="suppliers">Suppliers</TabsTrigger>}
            <TabsTrigger value="images">Photos{product?.images.length ? ` (${product.images.length})` : ''}</TabsTrigger>
          </TabsList>
          <TabsContent value="sales" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU *">
                <Input value={form.sku} onChange={set('sku')} />
              </Field>
              <Field label="Barcode" hint="Scan the EAN / UPC on the box, or leave empty and we create one">
                <Input value={form.barcode} onChange={set('barcode')} placeholder="Auto" className="font-mono" />
              </Field>
              <Field label="Name *">
                <Input value={form.name} onChange={set('name')} />
              </Field>
              <Field
                label="Category"
                className="sm:col-span-2"
                hint={
                  <Link to="/categories" className="underline">
                    Manage categories
                  </Link>
                }
              >
                <SearchSelect
                  aria-label="Category"
                  value={form.category_id}
                  onChange={(v) => setForm({ ...form, category_id: v })}
                  options={categoryOptions(categories.data, product?.category_id)}
                  clearable
                  placeholder="No category - or search, e.g. Fruit › Citrus"
                />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea value={form.description} onChange={set('description')} rows={2} />
              </Field>
              <Field label="Unit" hint="box, kg, each...">
                <Input value={form.unit} onChange={set('unit')} />
              </Field>
              <Field label="Price (AUD)">
                <Input type="number" step="0.01" value={form.price} onChange={set('price')} />
              </Field>
              <Field
                label="Sales account"
                hint={
                  <Link to="/settings/accounting" className="underline">
                    Manage accounts
                  </Link>
                }
              >
                <Select value={form.account_code} onChange={set('account_code')}>
                  <option value="">Default (from settings)</option>
                  {accountOptions.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tax rate" hint="Overrides the GST switch when set">
                <Select
                  value={form.tax_type}
                  onChange={(e) => {
                    const code = e.target.value
                    const rate = taxOptions.find((t) => t.code === code)?.rate
                    setForm({
                      ...form,
                      tax_type: code,
                      is_taxable: rate === undefined || Number.isNaN(rate) ? form.is_taxable : rate > 0,
                    })
                  }}
                >
                  <option value="">Default (GST switch)</option>
                  {taxOptions.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                      {Number.isNaN(t.rate) ? '' : ` (${t.rate}%)`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Other names (aliases)" hint="Comma separated, e.g. romas, roma toms" className="sm:col-span-2">
                <Input value={form.aliases} onChange={set('aliases')} />
              </Field>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch checked={form.is_taxable} onCheckedChange={(v) => setForm({ ...form, is_taxable: v })} id="taxable" />
                <Label htmlFor="taxable">GST applies</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="purchase" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Purchase description" className="sm:col-span-2">
                <Textarea value={form.purchase_description} onChange={set('purchase_description')} rows={2} />
              </Field>
              <Field
                label="Cost price"
                hint={product?.avg_cost != null ? `Average cost from receipts: $${product.avg_cost.toFixed(2)}` : undefined}
              >
                <Input type="number" step="0.0001" value={form.purchase_price} onChange={set('purchase_price')} />
              </Field>
              <Field label="Purchase account">
                <Select value={form.purchase_account_code} onChange={set('purchase_account_code')}>
                  <option value="">-</option>
                  {[
                    ...(accounts.data || []),
                    ...(form.purchase_account_code && !(accounts.data || []).some((a) => a.code === form.purchase_account_code)
                      ? [{ code: form.purchase_account_code, name: '(not in list)' } as (typeof accountOptions)[number]]
                      : []),
                  ].map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {purchaseTaxOptions.length ? (
                <Field label="Purchase tax rate" hint="Used on purchase orders and supplier bills">
                  <Select value={form.purchase_tax_type} onChange={set('purchase_tax_type')}>
                    <option value="">Default</option>
                    {purchaseTaxOptions.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                        {Number.isNaN(t.rate) ? '' : ` (${t.rate}%)`}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field label="Purchase tax type" hint="Sync tax rates in Settings → Accounts & Tax to pick from a list">
                  <Input value={form.purchase_tax_type} onChange={set('purchase_tax_type')} placeholder="INPUT" />
                </Field>
              )}
              <Field label="Reorder level" hint="Shows as Low stock at or below this quantity">
                <Input type="number" min={0} step="any" value={form.reorder_level} onChange={set('reorder_level')} />
              </Field>
              <Field label="Quantity on hand" hint="Changes are logged on the Stock page">
                <Input
                  type="number"
                  step="any"
                  value={form.quantity_on_hand}
                  onChange={set('quantity_on_hand')}
                  disabled={!form.is_tracked_inventory}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="tracked"
                    checked={form.is_tracked_inventory}
                    onCheckedChange={(v) => setForm({ ...form, is_tracked_inventory: v })}
                  />
                  <Label htmlFor="tracked">Track inventory</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="sold" checked={form.is_sold} onCheckedChange={(v) => setForm({ ...form, is_sold: v })} />
                  <Label htmlFor="sold">I sell this</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="purchased"
                    checked={form.is_purchased}
                    onCheckedChange={(v) => setForm({ ...form, is_purchased: v })}
                  />
                  <Label htmlFor="purchased">I buy this</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="codes" className="mt-4">
            {product ? (
              <ProductCodes productId={product.id} canEdit />
            ) : (
              <Alert tone="info">Save the product first - a barcode and QR code are created automatically.</Alert>
            )}
          </TabsContent>

          {product && (
            <TabsContent value="suppliers" className="mt-4">
              <ProductSuppliers productId={product.id} />
            </TabsContent>
          )}
          <TabsContent value="images" className="mt-4">
            {product ? (
              <ProductImages productId={product.id} />
            ) : (
              <Alert tone="info">Save the product first, then add photos.</Alert>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Spinner />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Products() {
  const { isAdmin } = usePermission()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '') // Ctrl+K se product khola: /products?q=SKU
  const [status, setStatus] = useState<CatalogStatus>('active')
  const [categoryId, setCategoryId] = useState(params.get('category') || '')
  const [bulkOpen, setBulkOpen] = useState(false)
  const categories = useCategories()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | null | 'new'>(null)
  const q = useDebounce(search)
  const { softDelete } = useLifecycle('products')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const { sort, sortProps } = useSort('', () => setPage(1))

  const products = useQuery({
    queryKey: ['products', q, status, page, sort, categoryId],
    queryFn: () => api.get<Paged<Product>>('/products' + qs({ q, page, page_size: 25, status, sort, category_id: categoryId })),
  })

  return (
    <div>
      <PageHeader
        title="Products"
        description="Your catalog. AI matches every order line to these SKUs."
        actions={
          isAdmin && (
            <>
              <Button
                variant="outline"
                disabled={!selected.size}
                title="Tick products in the list, then choose their category"
                onClick={() => setBulkOpen(true)}
              >
                <FolderTree /> Set category{selected.size ? ` (${selected.size})` : ''}
              </Button>
              <Button
                variant="outline"
                disabled={!selected.size}
                title="Tick products in the list, then print barcode / QR labels"
                onClick={() => window.open(`/products/labels?ids=${[...selected].join(',')}`, '_blank')}
              >
                <Printer /> Print labels{selected.size ? ` (${selected.size})` : ''}
              </Button>
              <Button asChild variant="outline">
                <Link to="/imports?kind=products">
                  <Upload /> Import CSV
                </Link>
              </Button>
              <Button onClick={() => setEditing('new')}>
                <PlusCircle /> Add product
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Name, SKU or scan barcode"
        />
        <Select
          aria-label="Category filter"
          className="w-56"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All categories</option>
          <option value="0">Uncategorised</option>
          {(categories.data || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent_id ? '\u00a0\u00a0\u00a0' : ''}
              {c.name} ({c.product_count})
            </option>
          ))}
        </Select>
        <StatusTabs
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        />
      </div>
      {status === 'deleted' && (
        <Alert tone="info" className="mb-4">
          Deleted products stay here until you restore them or delete them forever. Products used on orders or invoices can't be
          deleted forever (kept for your records).
        </Alert>
      )}

      <Card>
        {products.isLoading ? (
          <LoadingRows />
        ) : products.isError ? (
          <div className="p-4">
            <ErrorState error={products.error} />
          </div>
        ) : !products.data?.items.length ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Import a CSV or connect Xero, QuickBooks or MYOB to bring in your catalog."
            action={
              isAdmin && (
                <Button asChild variant="outline">
                  <Link to="/imports?kind=products">Import products</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH className="w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="size-4 cursor-pointer accent-primary"
                      checked={products.data.items.length > 0 && products.data.items.every((p) => selected.has(p.id))}
                      onChange={(e) =>
                        setSelected((s) => {
                          const next = new Set(s)
                          products.data.items.forEach((p) => (e.target.checked ? next.add(p.id) : next.delete(p.id)))
                          return next
                        })
                      }
                    />
                  </TH>
                  <SortTH {...sortProps('sku')}>SKU</SortTH>
                  <SortTH {...sortProps('name')}>Name</SortTH>
                  <TH>Category</TH>
                  <SortTH {...sortProps('unit')}>Unit</SortTH>
                  <SortTH {...sortProps('price', true)} className="text-right" align="right">
                    Price
                  </SortTH>
                  <SortTH {...sortProps('is_taxable')}>GST</SortTH>
                  <SortTH {...sortProps('source')}>Source</SortTH>
                  <TH>Aliases</TH>
                  {isAdmin && <SortTH {...sortProps('is_active', true)}>Active</SortTH>}
                  {isAdmin && <TH />}
                </TR>
              </THead>
              <TBody>
                {products.data.items.map((p) => (
                  <TR key={p.id} className={p.is_active ? '' : 'opacity-50'}>
                    <TD>
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        className="size-4 cursor-pointer accent-primary"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </TD>
                    <TD className="font-mono text-xs">
                      {p.sku}
                      {p.barcode && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Barcode">
                          <Barcode className="size-3" /> {p.barcode}
                        </div>
                      )}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            className="size-9 shrink-0 rounded-md border object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            <ImageIcon className="size-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link to={`/products/${p.id}`} className="font-medium hover:text-primary hover:underline">
                            {p.name}
                          </Link>
                          {p.description && (
                            <div className="max-w-xs truncate text-xs text-muted-foreground">{p.description}</div>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD className="text-xs">{p.category_name || <span className="text-muted-foreground">-</span>}</TD>
                    <TD>{p.unit || '-'}</TD>
                    <TD className="text-right">{formatMoney(p.price)}</TD>
                    <TD>{p.is_taxable ? 'Yes' : <span className="text-muted-foreground">GST-free</span>}</TD>
                    <TD>
                      <SourceBadge source={p.source} />
                    </TD>
                    <TD className="max-w-[200px] truncate text-xs text-muted-foreground" title={p.aliases.join(', ')}>
                      {p.aliases.join(', ') || '-'}
                    </TD>
                    {isAdmin && (
                      <TD>
                        <ActiveSwitch item={p} kind="products" />
                      </TD>
                    )}
                    {isAdmin && (
                      <TD className="whitespace-nowrap text-right">
                        {p.deleted_at ? (
                          <TrashActions item={p} kind="products" />
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setEditing(p)} title="Edit">
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => softDelete(p)} title="Move to Trash">
                              <Trash2 className="text-destructive" />
                            </Button>
                          </>
                        )}
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={25} total={products.data.total} onChange={setPage} />
          </>
        )}
      </Card>

      {editing && (
        <ProductDialog
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          open
          onClose={() => setEditing(null)}
        />
      )}
      {bulkOpen && (
        <BulkCategoryDialog
          ids={[...selected]}
          onClose={(done) => {
            setBulkOpen(false)
            if (done) setSelected(new Set())
          }}
        />
      )}
    </div>
  )
}

/** Tick kiye products ki category ek saath */
function BulkCategoryDialog({ ids, onClose }: { ids: number[]; onClose: (done: boolean) => void }) {
  const qc = useQueryClient()
  const categories = useCategories()
  const [categoryId, setCategoryId] = useState('')
  const save = useMutation({
    mutationFn: () =>
      api.post<{ updated: number; category: string | null }>('/products/bulk-category', {
        product_ids: ids,
        category_id: categoryId ? Number(categoryId) : null,
      }),
    onSuccess: (r) => {
      toast.success(`${r.updated} product${r.updated === 1 ? '' : 's'} → ${r.category || 'No category'}`)
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      onClose(true)
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Set category for {ids.length} product{ids.length === 1 ? '' : 's'}
          </DialogTitle>
        </DialogHeader>
        <Field label="Category" hint="Leave empty to remove the category">
          <SearchSelect
            aria-label="New category"
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions(categories.data)}
            clearable
            placeholder="No category - or search"
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
