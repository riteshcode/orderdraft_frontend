import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Save, Send, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Customer, InvoiceDetail, ManualInvoiceInput, Paged, Product, TenantSettings } from '@/lib/types'
import { formatMoney, todayISO } from '@/lib/utils'
import { salesRates, useAccounts, useTaxRates } from '@/hooks/useAccounting'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { customerOption, productOption, SearchSelect } from '@/components/ui/search-select'

// Tax select ke special values
const DEFAULT_TAX = '__default' // backend ko null -> tenant ka GST rate
const NO_TAX = '' // backend ko "" -> 0%

type Line = {
  key: string
  product_id: string
  description: string
  quantity: string
  unit_price: string
  tax: string // DEFAULT_TAX | NO_TAX | tax code
  account_code: string
}

let counter = 0
const blankLine = (): Line => ({
  key: `n${++counter}`,
  product_id: '',
  description: '',
  quantity: '1',
  unit_price: '',
  tax: DEFAULT_TAX,
  account_code: '',
})

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** /invoices/new aur /invoices/:id/edit (sirf draft) */
export default function InvoiceForm() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<TenantSettings>('/settings') })
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const customers = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get<Paged<Customer>>('/customers?page_size=5000'),
  })
  const accounts = useAccounts()
  const taxes = useTaxRates()
  const existing = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<InvoiceDetail>(`/invoices/${id}`),
    enabled: editing,
  })

  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>(() => [blankLine()])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(!editing)

  const rates = useMemo(() => salesRates(taxes.data), [taxes.data])
  const rateByCode = useMemo(() => new Map(rates.map((r) => [r.code, r.rate])), [rates])
  const productById = useMemo(() => new Map((products.data?.items || []).map((p) => [p.id, p])), [products.data])
  // Inactive products list mein dikhte hain (purani line ke liye) lekin naye select nahi ho sakte
  const productOptions = useMemo(
    () =>
      (products.data?.items || []).map((p) =>
        productOption(p, p.is_active ? {} : { disabled: true, hint: `${p.sku} · inactive` }),
      ),
    [products.data],
  )
  const inv = settings.data?.invoice
  const gstRate = inv?.gst_rate ?? 10
  const inclusive = !!inv?.prices_include_gst

  // Edit: invoice ka data form mein
  useEffect(() => {
    const d = existing.data
    if (!d || loaded) return
    setCustomerId(d.customer_id ? String(d.customer_id) : '')
    setIssueDate(d.issue_date)
    setDueDate(d.due_date || '')
    setReference(d.reference || '')
    setNotes(d.notes || '')
    setLines(
      d.lines.map((l) => ({
        key: `l${l.id}`,
        product_id: l.product_id ? String(l.product_id) : '',
        description: l.description,
        quantity: String(l.quantity),
        unit_price: String(l.unit_price),
        tax: l.tax_code ? l.tax_code : l.tax_rate > 0 ? DEFAULT_TAX : NO_TAX,
        account_code: l.account_code || '',
      })),
    )
    setLoaded(true)
  }, [existing.data, loaded])

  /** Product ka tax -> select value */
  function taxForProduct(p: Product) {
    if (p.tax_type && rateByCode.has(p.tax_type)) return p.tax_type
    return p.is_taxable ? DEFAULT_TAX : NO_TAX
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l
        const next = { ...l, ...patch }
        if (patch.product_id !== undefined) {
          const p = productById.get(Number(patch.product_id))
          if (p) {
            next.description = p.name
            next.unit_price = p.price != null ? String(p.price) : ''
            next.tax = taxForProduct(p)
            next.account_code = p.account_code || ''
          }
        }
        return next
      }),
    )
  }

  // ---- Live totals (backend calculate_lines jaisa) ----
  const rateOf = (l: Line) => (l.tax === NO_TAX ? 0 : l.tax === DEFAULT_TAX ? gstRate : (rateByCode.get(l.tax) ?? gstRate))
  const calc = lines.map((l) => {
    const amount = round2((Number(l.quantity) || 0) * (Number(l.unit_price) || 0))
    const r = rateOf(l)
    const gst = r ? round2(inclusive ? (amount * r) / (100 + r) : (amount * r) / 100) : 0
    return { amount, gst }
  })
  const gross = calc.reduce((s, c) => s + c.amount, 0)
  const gstTotal = round2(calc.reduce((s, c) => s + c.gst, 0))
  const subtotal = round2(inclusive ? gross - gstTotal : gross)
  const total = round2(inclusive ? gross : gross + gstTotal)

  const customerList = (customers.data?.items || []).filter((c) => c.is_active || String(c.id) === customerId)
  const customer = customerList.find((c) => String(c.id) === customerId)
  const autoDue = inv ? addDays(issueDate || todayISO(), inv.payment_terms_days) : ''

  const save = useMutation({
    mutationFn: (body: ManualInvoiceInput) =>
      editing ? api.put<InvoiceDetail>(`/invoices/${id}/draft`, body) : api.post<InvoiceDetail>('/invoices', body),
    onSuccess: (saved, body) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.setQueryData(['invoice', String(saved.id)], saved)
      toast.success(body.send_email ? `${saved.number} saved and emailed` : `${saved.number} saved`)
      navigate(`/invoices/${saved.id}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit(sendEmail: boolean) {
    setError('')
    if (!customerId) return setError('Choose a customer')
    const filled = lines.filter((l) => l.description.trim() || l.product_id)
    if (!filled.length) return setError('Add at least one line')
    for (const [i, l] of filled.entries()) {
      if (!l.description.trim()) return setError(`Line ${i + 1}: description likho`)
      if (!(Number(l.quantity) > 0)) return setError(`Line ${i + 1}: quantity 0 se zyada ho`)
      if (l.unit_price === '' || !(Number(l.unit_price) >= 0)) return setError(`Line ${i + 1}: price daalo`)
    }
    if (dueDate && issueDate && dueDate < issueDate) return setError("The due date can't be before the issue date")
    if (sendEmail && !customer?.email) return setError('This customer has no email address - add one on the customer first')
    save.mutate({
      customer_id: Number(customerId),
      issue_date: issueDate || null,
      due_date: dueDate || null,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      send_email: sendEmail,
      lines: filled.map((l) => ({
        product_id: l.product_id ? Number(l.product_id) : null,
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        tax_code: l.tax === DEFAULT_TAX ? null : l.tax,
        account_code: l.account_code || null,
      })),
    })
  }

  const loading =
    settings.isLoading ||
    products.isLoading ||
    customers.isLoading ||
    accounts.isLoading ||
    taxes.isLoading ||
    (editing && !loaded && !existing.isError)
  const failed = settings.error || products.error || customers.error || existing.error

  const title = editing ? `Edit ${existing.data?.number || 'invoice'}` : 'New invoice'
  const back = editing
    ? { to: `/invoices/${id}`, label: existing.data?.number || 'Invoice' }
    : { to: '/invoices', label: 'Invoices' }

  if (failed) return <ErrorState error={failed} />
  if (loading)
    return (
      <div>
        <PageHeader back={back} title={title} />
        <Card>
          <LoadingRows rows={6} />
        </Card>
      </div>
    )

  const d = existing.data
  if (d && (d.source !== 'internal' || d.status !== 'draft' || d.amount_paid > 0))
    return (
      <div>
        <PageHeader back={back} title={title} />
        <Alert tone="warning">
          Only draft OrderDraft invoices without payments can be edited.{' '}
          <Link to={`/invoices/${id}`} className="font-medium underline">
            Back to invoice
          </Link>
        </Alert>
      </div>
    )

  const accountList = accounts.data || []

  return (
    <div>
      <PageHeader
        back={back}
        title={title}
        description={
          editing
            ? 'Draft invoice - change anything before sending.'
            : 'Bill a customer without an order: services, delivery fees, one-off sales.'
        }
      />

      <Card>
        <CardContent className="space-y-6 p-5 sm:p-6">
          {error && <Alert tone="error">{error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Customer *"
              className="sm:col-span-2"
              hint={
                customer && !customer.email ? 'No email on file - you can still download the PDF.' : customer?.email || undefined
              }
            >
              <SearchSelect
                aria-label="Customer"
                value={customerId}
                onChange={setCustomerId}
                options={customerList.map((c) => customerOption(c))}
                placeholder="Search customer by name, code or email"
              />
            </Field>
            <Field label="Issue date">
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field
              label="Due date"
              hint={!dueDate && autoDue ? `Auto: ${autoDue} (${inv?.payment_terms_days} day terms)` : undefined}
            >
              <Input type="date" value={dueDate} min={issueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Reference" className="sm:col-span-2" hint="PO number or job reference - printed on the invoice">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
            </Field>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH className="min-w-64">Item</TH>
                  <TH>Qty</TH>
                  <TH>Price</TH>
                  <TH>Tax rate</TH>
                  <TH>Account</TH>
                  <TH className="text-right">Amount</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {lines.map((l, i) => (
                  <TR key={l.key} className="align-top">
                    <TD className="space-y-1.5">
                      <SearchSelect
                        aria-label={`Line ${i + 1} product`}
                        value={l.product_id}
                        onChange={(v) => updateLine(l.key, { product_id: v })}
                        options={productOptions}
                        clearable
                        placeholder="Custom item (no product) - or search product"
                      />
                      <Input
                        aria-label={`Line ${i + 1} description`}
                        value={l.description}
                        placeholder="Description, e.g. Delivery fee"
                        onChange={(e) => updateLine(l.key, { description: e.target.value })}
                      />
                    </TD>
                    <TD>
                      <Input
                        aria-label={`Line ${i + 1} quantity`}
                        type="number"
                        min={0}
                        step="any"
                        value={l.quantity}
                        className="w-20 min-w-20 px-2"
                        onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                      />
                    </TD>
                    <TD>
                      <Input
                        aria-label={`Line ${i + 1} unit price`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.unit_price}
                        placeholder="0.00"
                        className="w-24 min-w-24 px-2"
                        onChange={(e) => updateLine(l.key, { unit_price: e.target.value })}
                      />
                    </TD>
                    <TD>
                      <Select
                        aria-label={`Line ${i + 1} tax rate`}
                        value={l.tax}
                        className="w-44 min-w-44"
                        onChange={(e) => updateLine(l.key, { tax: e.target.value })}
                      >
                        <option value={DEFAULT_TAX}>Default GST ({gstRate}%)</option>
                        {rates.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name} ({r.rate}%)
                          </option>
                        ))}
                        {l.tax !== DEFAULT_TAX && l.tax !== NO_TAX && !rateByCode.has(l.tax) && (
                          <option value={l.tax}>{l.tax}</option>
                        )}
                        <option value={NO_TAX}>No tax (0%)</option>
                      </Select>
                    </TD>
                    <TD>
                      <Select
                        aria-label={`Line ${i + 1} account`}
                        value={l.account_code}
                        className="w-40 min-w-40"
                        onChange={(e) => updateLine(l.key, { account_code: e.target.value })}
                      >
                        <option value="">Default</option>
                        {accountList.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                        {l.account_code && !accountList.some((a) => a.code === l.account_code) && (
                          <option value={l.account_code}>{l.account_code}</option>
                        )}
                      </Select>
                    </TD>
                    <TD className="whitespace-nowrap pt-4 text-right tabular-nums">
                      {formatMoney(calc[i].amount)}
                      {calc[i].gst > 0 && <div className="text-[11px] text-muted-foreground">GST {formatMoney(calc[i].gst)}</div>}
                    </TD>
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
                ))}
              </TBody>
            </Table>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4 sm:max-w-md sm:flex-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, blankLine()])}>
                <Plus /> Add line
              </Button>
              <Field label="Notes" hint="Shown on the invoice">
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
            <div className="w-full space-y-1.5 text-sm sm:max-w-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal{inclusive ? ' (ex GST)' : ''}</span>
                <span className="tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST{inclusive ? ' (included)' : ''}</span>
                <span className="tabular-nums">{formatMoney(gstTotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
                <span>Total AUD</span>
                <span className="tabular-nums">{formatMoney(total)}</span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Prices are {inclusive ? 'GST inclusive' : 'GST exclusive'} (Settings → Invoices).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-5">
            <Button variant="ghost" asChild>
              <Link to={back.to}>Cancel</Link>
            </Button>
            <Button variant="outline" onClick={() => submit(false)} disabled={save.isPending}>
              {save.isPending ? <Spinner /> : <Save />} Save draft
            </Button>
            <Button
              onClick={() => submit(true)}
              disabled={save.isPending || !customer?.email}
              title={customer && !customer.email ? 'Customer has no email' : ''}
            >
              {save.isPending ? <Spinner /> : <Send />} Save & email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
