import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Plus, Save, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Customer, ManualOrderInput, OrderDetail, Paged, PantryItem, Product } from '@/lib/types'
import { formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { customerOption, productOption, SearchSelect } from '@/components/ui/search-select'

type Line = { key: string; product_id: string; quantity: string; unit: string; unit_price: string }

let counter = 0
const newLine = (): Line => ({ key: `n${++counter}`, product_id: '', quantity: '1', unit: '', unit_price: '' })

/** Phone / counter order - AI ke bina, seedha form se */
export function ManualOrderForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const customers = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get<Paged<Customer>>('/customers?page_size=5000'),
  })

  const [customerId, setCustomerId] = useState('')
  const [po, setPo] = useState('')
  const [delivery, setDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>(() => [newLine()])
  const [error, setError] = useState('')

  // Customer ki pantry - special price (valid ho to) normal price ki jagah
  const pantry = useQuery({
    queryKey: ['customers', 'pantry', Number(customerId)],
    queryFn: () => api.get<PantryItem[]>(`/customers/${customerId}/pantry`),
    enabled: !!customerId,
  })
  const special = useMemo(
    () => new Map((pantry.data || []).filter((i) => i.status === 'active').map((i) => [i.product_id, i.effective_price])),
    [pantry.data],
  )
  const productList = (products.data?.items || []).filter((p) => p.is_active)
  const productById = useMemo(() => new Map((products.data?.items || []).map((p) => [p.id, p])), [products.data])
  const customerList = (customers.data?.items || []).filter((c) => c.is_active)
  const productOptions = useMemo(
    () => (products.data?.items || []).filter((p) => p.is_active).map((p) => productOption(p)),
    [products.data],
  )

  const priceOf = (l: Line) => {
    if (l.unit_price !== '') return Number(l.unit_price)
    if (!l.product_id) return null
    if (special.has(Number(l.product_id))) return special.get(Number(l.product_id)) ?? null
    return productById.get(Number(l.product_id))?.price ?? null
  }
  const lineTotal = (l: Line) => {
    const price = priceOf(l)
    return price == null ? null : price * (Number(l.quantity) || 0)
  }
  const total = lines.reduce((s, l) => s + (lineTotal(l) || 0), 0)

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l
        const next = { ...l, ...patch }
        if (patch.product_id !== undefined) {
          const p = productById.get(Number(patch.product_id))
          next.unit = p?.unit || ''
          next.unit_price = '' // naye product ka default price
        }
        return next
      }),
    )
  }

  const create = useMutation({
    mutationFn: (body: ManualOrderInput) => api.post<OrderDetail>('/orders/manual', body),
    onSuccess: (o, body) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order-stats'] })
      toast.success(body.approve ? `Order #${o.id} created and approved` : `Draft order #${o.id} created`)
      navigate(`/orders/${o.id}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit(approve: boolean) {
    setError('')
    if (!customerId) return setError('Choose a customer')
    const filled = lines.filter((l) => l.product_id)
    if (!filled.length) return setError('Add at least one product')
    for (const [i, l] of filled.entries()) {
      if (!(Number(l.quantity) > 0)) return setError(`Line ${i + 1}: quantity 0 se zyada ho`)
      if (l.unit_price !== '' && !(Number(l.unit_price) >= 0)) return setError(`Line ${i + 1}: enter a valid price`)
    }
    create.mutate({
      customer_id: Number(customerId),
      po_number: po.trim() || null,
      delivery_date: delivery || null,
      notes: notes.trim() || null,
      approve,
      lines: filled.map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        unit: l.unit.trim() || null,
        unit_price: l.unit_price === '' ? null : Number(l.unit_price),
      })),
    })
  }

  if (products.isLoading || customers.isLoading)
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Spinner />
      </div>
    )

  if (!productList.length || !customerList.length)
    return (
      <Alert tone="info">
        Manual orders need customers and products first.{' '}
        <Link to="/imports" className="font-medium underline">
          Import them
        </Link>{' '}
        or connect your accounting software.
      </Alert>
    )

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        submit(false)
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer *" className="sm:col-span-2">
          <SearchSelect
            aria-label="Customer"
            value={customerId}
            onChange={setCustomerId}
            options={customerList.map((c) => customerOption(c))}
            placeholder="Search customer by name, code or email"
          />
        </Field>
        <Field label="PO number">
          <Input value={po} onChange={(e) => setPo(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Delivery date">
          <Input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
        </Field>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <THead>
            <TR>
              <TH className="min-w-56">Product</TH>
              <TH>Qty</TH>
              <TH>Unit</TH>
              <TH>Unit price</TH>
              <TH className="text-right">Amount</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {lines.map((l, i) => {
              const p = l.product_id ? productById.get(Number(l.product_id)) : undefined
              return (
                <TR key={l.key}>
                  <TD>
                    <SearchSelect
                      aria-label={`Line ${i + 1} product`}
                      value={l.product_id}
                      onChange={(v) => updateLine(l.key, { product_id: v })}
                      options={productOptions}
                      placeholder="Search product, SKU or barcode"
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
                      aria-label={`Line ${i + 1} unit`}
                      value={l.unit}
                      className="w-20 min-w-20 px-2"
                      onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                    />
                  </TD>
                  <TD>
                    <Input
                      aria-label={`Line ${i + 1} unit price`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.unit_price}
                      placeholder={
                        special.has(Number(l.product_id))
                          ? String(special.get(Number(l.product_id)))
                          : p?.price != null
                            ? String(p.price)
                            : '0.00'
                      }
                      title="Leave empty to use the customer's special price (pantry) or the product price"
                      className="w-24 min-w-24 px-2"
                      onChange={(e) => updateLine(l.key, { unit_price: e.target.value })}
                    />
                  </TD>
                  <TD className="whitespace-nowrap text-right tabular-nums">
                    {lineTotal(l) != null ? formatMoney(lineTotal(l)) : '-'}
                    {l.unit_price === '' && special.has(Number(l.product_id)) && (
                      <div className="text-xs font-normal text-green-700">Customer price</div>
                    )}
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
              )
            })}
          </TBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine()])}>
          <Plus /> Add line
        </Button>
        <p className="text-sm">
          <span className="text-muted-foreground">Order total </span>
          <span className="text-base font-semibold tabular-nums">{formatMoney(total)}</span>
        </p>
      </div>

      <Field label="Notes">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, etc." />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" disabled={create.isPending}>
          {create.isPending ? <Spinner /> : <Save />} Save as draft
        </Button>
        <Button type="button" disabled={create.isPending} onClick={() => submit(true)}>
          {create.isPending ? <Spinner /> : <Check />} Create & approve
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        "Create & approve" sends the order to your active destinations (accounting software, invoice, API...) straight away.
      </p>
    </form>
  )
}
