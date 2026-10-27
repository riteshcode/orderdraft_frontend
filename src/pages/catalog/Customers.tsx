import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, Eye, Lightbulb, Pencil, PlusCircle, Trash2, Upload, Users } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { Customer, CustomerInsights, Paged } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { ActiveSwitch, StatusTabs, TrashActions, useLifecycle, type CatalogStatus } from '@/components/common/CatalogLifecycle'
import { EmptyState, ErrorState, LoadingRows, Pagination, SearchInput } from '@/components/common/states'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { SortTH, useSort } from '@/components/common/SortableTH'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isProvider, sourceLabel } from '@/lib/providers'

function SourceBadge({ source }: { source: string }) {
  if (isProvider(source)) return <Badge variant="info">{sourceLabel(source)}</Badge>
  if (source === 'csv') return <Badge variant="secondary">CSV</Badge>
  return <Badge variant="outline">Manual</Badge>
}

// Text fields jo form mein edit hote hain (sab Customer ke same naam ke keys)
const TEXT_FIELDS = [
  'name',
  'code',
  'email',
  'other_emails',
  'first_name',
  'last_name',
  'phone',
  'mobile',
  'fax',
  'ddi',
  'address',
  'delivery_line1',
  'delivery_line2',
  'delivery_city',
  'delivery_region',
  'delivery_postcode',
  'delivery_country',
  'delivery_attention',
  'delivery_instructions',
  'postal_line1',
  'postal_line2',
  'postal_city',
  'postal_region',
  'postal_postcode',
  'postal_country',
  'postal_attention',
  'abn',
  'company_number',
  'bank_account_details',
  'sales_tax_type',
  'purchase_tax_type',
  'default_currency',
] as const
type TextKey = (typeof TEXT_FIELDS)[number]
type Form = Record<TextKey, string> & { is_active: boolean }

const ADDRESS_PARTS = ['line1', 'line2', 'city', 'region', 'postcode', 'country', 'attention'] as const

function toForm(c: Customer | null): Form {
  const f = {} as Form
  for (const k of TEXT_FIELDS) f[k] = (c?.[k] as string | null) || ''
  f.is_active = c?.is_active ?? true
  return f
}

function AddressFields({
  prefix,
  form,
  set,
}: {
  prefix: 'delivery' | 'postal'
  form: Form
  set: (k: TextKey) => (e: { target: { value: string } }) => void
}) {
  const k = (part: (typeof ADDRESS_PARTS)[number]) => `${prefix}_${part}` as TextKey
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Address line 1" className="sm:col-span-2">
        <Input value={form[k('line1')]} onChange={set(k('line1'))} />
      </Field>
      <Field label="Address line 2" className="sm:col-span-2">
        <Input value={form[k('line2')]} onChange={set(k('line2'))} />
      </Field>
      <Field label="Suburb / city">
        <Input value={form[k('city')]} onChange={set(k('city'))} />
      </Field>
      <Field label="State / region">
        <Input value={form[k('region')]} onChange={set(k('region'))} placeholder="NSW" />
      </Field>
      <Field label="Postcode">
        <Input value={form[k('postcode')]} onChange={set(k('postcode'))} />
      </Field>
      <Field label="Country">
        <Input value={form[k('country')]} onChange={set(k('country'))} placeholder="Australia" />
      </Field>
      <Field label="Attention" className="sm:col-span-2">
        <Input value={form[k('attention')]} onChange={set(k('attention'))} placeholder="Person to address it to" />
      </Field>
    </div>
  )
}

export function CustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Form>(() => toForm(customer))
  const [error, setError] = useState('')
  const set = (k: TextKey) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function copyDeliveryToPostal() {
    setForm((f) => {
      const next = { ...f }
      for (const p of ADDRESS_PARTS) next[`postal_${p}` as TextKey] = f[`delivery_${p}` as TextKey]
      return next
    })
  }

  const save = useMutation({
    mutationFn: () => {
      // Khali strings ko null bhejo. Address khali = server delivery/postal parts se bana deta hai
      // Sab "customer" hain - supplier flag UI mein nahi (sirf accounting sync se aata hai)
      const body: Record<string, string | boolean | null> = { is_active: form.is_active, is_customer: true }
      for (const k of TEXT_FIELDS) body[k] = form[k].trim() || null
      body.name = form.name.trim()
      return customer ? api.put(`/customers/${customer.id}`, body) : api.post('/customers', body)
    },
    onSuccess: () => {
      toast.success(customer ? 'Customer updated' : 'Customer added')
      qc.invalidateQueries({ queryKey: ['customers'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit customer' : 'Add customer'}</DialogTitle>
        </DialogHeader>
        {isProvider(customer?.source) && (
          <Alert tone="info">Synced from {sourceLabel(customer?.source)}. The next sync may overwrite these details.</Alert>
        )}
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Business / contact name *">
          <Input value={form.name} onChange={set('name')} />
        </Field>

        <Tabs defaultValue="contact">
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="delivery">Delivery address</TabsTrigger>
            <TabsTrigger value="postal">Postal address</TabsTrigger>
            <TabsTrigger value="business">Business & tax</TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <Input value={form.first_name} onChange={set('first_name')} />
              </Field>
              <Field label="Last name">
                <Input value={form.last_name} onChange={set('last_name')} />
              </Field>
              <Field label="Email" hint="Order confirmations go here">
                <Input type="email" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="Account code">
                <Input value={form.code} onChange={set('code')} />
              </Field>
              <Field label="Other emails" hint="Comma separated - helps match orders from staff" className="sm:col-span-2">
                <Input value={form.other_emails} onChange={set('other_emails')} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Mobile">
                <Input value={form.mobile} onChange={set('mobile')} />
              </Field>
              <Field label="Direct dial (DDI)">
                <Input value={form.ddi} onChange={set('ddi')} />
              </Field>
              <Field label="Fax">
                <Input value={form.fax} onChange={set('fax')} />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="mt-4 space-y-3">
            <AddressFields prefix="delivery" form={form} set={set} />
            <Field label="Delivery instructions">
              <Textarea
                rows={2}
                value={form.delivery_instructions}
                onChange={set('delivery_instructions')}
                placeholder="e.g. Back door, before 7am"
              />
            </Field>
          </TabsContent>

          <TabsContent value="postal" className="mt-4 space-y-3">
            <Button type="button" variant="outline" size="sm" onClick={copyDeliveryToPostal}>
              <Copy /> Same as delivery address
            </Button>
            <AddressFields prefix="postal" form={form} set={set} />
            <Field label="Address (display)" hint="Leave empty to build it from the delivery / postal address">
              <Textarea value={form.address} onChange={set('address')} rows={2} />
            </Field>
          </TabsContent>

          <TabsContent value="business" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ABN / tax number">
                <Input value={form.abn} onChange={set('abn')} />
              </Field>
              <Field label="Company number (ACN)">
                <Input value={form.company_number} onChange={set('company_number')} />
              </Field>
              <Field label="Default sales tax">
                <Input value={form.sales_tax_type} onChange={set('sales_tax_type')} placeholder="OUTPUT" />
              </Field>
              <Field label="Default purchase tax">
                <Input value={form.purchase_tax_type} onChange={set('purchase_tax_type')} placeholder="INPUT" />
              </Field>
              <Field label="Currency">
                <Input value={form.default_currency} onChange={set('default_currency')} maxLength={3} placeholder="AUD" />
              </Field>
              <Field label="Bank account">
                <Input value={form.bank_account_details} onChange={set('bank_account_details')} />
              </Field>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2">
          <Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          <Label htmlFor="active">Active</Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => (form.name.trim() ? save.mutate() : setError('Name is required'))}>
            {save.isPending && <Spinner />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InsightsPanel({ customer }: { customer: Customer }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { isAdmin } = usePermission()
  const insights = useQuery({
    queryKey: ['customer-insights', customer.id],
    queryFn: () => api.get<CustomerInsights>(`/customers/${customer.id}/insights`),
  })

  async function removeAlias(id: number, alias: string) {
    const ok = await confirm({
      title: `Forget “${alias}”?`,
      description: 'AI will stop using this mapping for this customer.',
      confirmText: 'Forget',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.del(`/aliases/${id}`)
      toast.success('Mapping removed')
      qc.invalidateQueries({ queryKey: ['customer-insights', customer.id] })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <>
      {insights.isLoading ? (
        <LoadingRows rows={3} />
      ) : insights.isError ? (
        <ErrorState error={insights.error} />
      ) : (
        <div className="space-y-6">
          <section>
            <h4 className="mb-2 text-sm font-semibold">Usually orders</h4>
            {!insights.data?.usual_products.length ? (
              <p className="text-sm text-muted-foreground">No order history yet.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>SKU</TH>
                    <TH>Product</TH>
                    <TH className="text-right">Times</TH>
                    <TH>Last ordered</TH>
                  </TR>
                </THead>
                <TBody>
                  {insights.data.usual_products.map((u) => (
                    <TR key={u.sku}>
                      <TD className="font-mono text-xs">{u.sku}</TD>
                      <TD>{u.name}</TD>
                      <TD className="text-right">{u.times_ordered}</TD>
                      <TD>{formatDate(u.last_ordered_at)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </section>
          <section>
            <h4 className="mb-2 text-sm font-semibold">What OrderDraft learned</h4>
            {!insights.data?.aliases.length ? (
              <p className="text-sm text-muted-foreground">Nothing yet - approve a few orders and corrections show up here.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {insights.data.aliases.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-medium">“{a.alias}”</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="flex-1">
                      {a.product_name} <span className="font-mono text-xs text-muted-foreground">{a.sku}</span>
                    </span>
                    <Badge variant={a.source === 'learned' ? 'success' : 'secondary'}>{a.source}</Badge>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => removeAlias(a.id, a.alias)} title="Forget">
                        <Trash2 className="text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function InsightsDialog({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
          <DialogDescription>What this customer usually orders and what OrderDraft has learned.</DialogDescription>
        </DialogHeader>
        <InsightsPanel customer={customer} />
      </DialogContent>
    </Dialog>
  )
}

export default function Customers() {
  const { isAdmin } = usePermission()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CatalogStatus>('active')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Customer | null | 'new'>(null)
  const [insightsFor, setInsightsFor] = useState<Customer | null>(null)
  const q = useDebounce(search)
  const { softDelete } = useLifecycle('customers')

  const { sort, sortProps } = useSort('', () => setPage(1))

  const customers = useQuery({
    queryKey: ['customers', q, status, page, sort],
    queryFn: () => api.get<Paged<Customer>>('/customers' + qs({ q, page, page_size: 25, status, sort })),
  })

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Who orders from you. Click a customer to see their orders, balance, pantry and special prices."
        actions={
          isAdmin && (
            <>
              <Button asChild variant="outline">
                <Link to="/imports?kind=customers">
                  <Upload /> Import CSV
                </Link>
              </Button>
              <Button onClick={() => setEditing('new')}>
                <PlusCircle /> Add customer
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
          placeholder="Name, code or email"
        />
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
          Deleted customers stay here until you restore them or delete them forever. Customers with orders or invoices can't be
          deleted forever (kept for your records).
        </Alert>
      )}

      <Card>
        {customers.isLoading ? (
          <LoadingRows />
        ) : customers.isError ? (
          <div className="p-4">
            <ErrorState error={customers.error} />
          </div>
        ) : !customers.data?.items.length ? (
          <EmptyState
            icon={status === 'deleted' ? Trash2 : Users}
            title={status === 'deleted' ? 'Trash is empty' : 'No customers here'}
            description={status === 'active' ? 'Import a CSV or sync from your accounting software.' : undefined}
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <SortTH {...sortProps('code')}>Code</SortTH>
                  <SortTH {...sortProps('name')}>Name</SortTH>
                  <SortTH {...sortProps('email')}>Email</SortTH>
                  <SortTH {...sortProps('phone')}>Phone</SortTH>
                  <SortTH {...sortProps('source')}>Source</SortTH>
                  {isAdmin && <SortTH {...sortProps('is_active', true)}>Active</SortTH>}
                  <TH />
                </TR>
              </THead>
              <TBody>
                {customers.data.items.map((c) => (
                  <TR key={c.id} className={c.is_active ? '' : 'opacity-60'}>
                    <TD className="font-mono text-xs">{c.code || '-'}</TD>
                    <TD>
                      {c.deleted_at ? (
                        <div className="font-medium">{c.name}</div>
                      ) : (
                        <Link to={`/customers/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.name}
                        </Link>
                      )}
                      {(c.delivery_city || c.postal_city) && (
                        <div className="text-xs text-muted-foreground">{c.delivery_city || c.postal_city}</div>
                      )}
                    </TD>
                    <TD>{c.email || '-'}</TD>
                    <TD>{c.phone || c.mobile || '-'}</TD>
                    <TD>
                      <SourceBadge source={c.source} />
                    </TD>
                    {isAdmin && (
                      <TD>
                        <ActiveSwitch item={c} kind="customers" />
                      </TD>
                    )}
                    <TD className="whitespace-nowrap text-right">
                      {c.deleted_at ? (
                        isAdmin && <TrashActions item={c} kind="customers" />
                      ) : (
                        <>
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/customers/${c.id}`}>
                              <Eye /> View
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setInsightsFor(c)} title="Insights">
                            <Lightbulb />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => setEditing(c)} title="Edit">
                                <Pencil />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => softDelete(c)} title="Move to Trash">
                                <Trash2 className="text-destructive" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={25} total={customers.data.total} onChange={setPage} />
          </>
        )}
      </Card>

      {editing && (
        <CustomerDialog
          key={editing === 'new' ? 'new' : editing.id}
          customer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {insightsFor && <InsightsDialog customer={insightsFor} onClose={() => setInsightsFor(null)} />}
    </div>
  )
}
