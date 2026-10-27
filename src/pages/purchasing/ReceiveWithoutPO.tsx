import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PackageCheck, Plus, ScanLine, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Paged, Product, StockReceiptSummary, Supplier } from '@/lib/types'
import { formatMoney, todayISO } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { productOption, SearchSelect, supplierOption } from '@/components/ui/search-select'

type Line = { key: string; product_id: string; quantity: string; unit_cost: string }
let n = 0
const blank = (): Line => ({ key: `r${++n}`, product_id: '', quantity: '', unit_cost: '' })

/** Maal aaya par PO nahi tha (market se khareeda, sample, transfer) */
export default function ReceiveWithoutPO() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const suppliers = useQuery({
    queryKey: ['suppliers', 'active-all'],
    queryFn: () => api.get<Paged<Supplier>>('/suppliers?page_size=5000'),
  })
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [receivedOn, setReceivedOn] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>(() => [blank()])
  const [scan, setScan] = useState('')
  const [error, setError] = useState('')
  const byId = useMemo(() => new Map((products.data?.items || []).map((p) => [p.id, p])), [products.data])
  const productOptions = useMemo(
    () => (products.data?.items || []).filter((x) => x.is_active).map((x) => productOption(x)),
    [products.data],
  )
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  function onScan() {
    const code = scan.trim().toLowerCase()
    const p = (products.data?.items || []).find((x) => x.barcode?.toLowerCase() === code || x.sku.toLowerCase() === code)
    if (!p) return toast.error(`No product for ${scan}`)
    setLines((ls) => {
      const hit = ls.find((l) => l.product_id === String(p.id))
      if (hit) return ls.map((l) => (l === hit ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l))
      const empty = ls.find((l) => !l.product_id)
      const line = { ...(empty || blank()), product_id: String(p.id), quantity: '1' }
      return empty ? ls.map((l) => (l === empty ? line : l)) : [...ls, line]
    })
    setScan('')
  }

  const save = useMutation({
    mutationFn: () =>
      api.post<StockReceiptSummary>('/stock-receipts', {
        supplier_id: supplierId ? Number(supplierId) : null,
        reference: reference || null,
        received_on: receivedOn || null,
        notes: notes || null,
        lines: lines
          .filter((l) => l.product_id && Number(l.quantity) > 0)
          .map((l) => ({
            product_id: Number(l.product_id),
            quantity: Number(l.quantity),
            unit_cost: l.unit_cost === '' ? null : Number(l.unit_cost),
          })),
      }),
    onSuccess: (r) => {
      toast.success(`${r.number} saved - stock updated`)
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      navigate('/stock')
    },
    onError: (e: Error) => setError(e.message),
  })
  const total = lines.reduce((s, l) => {
    const p = l.product_id ? byId.get(Number(l.product_id)) : undefined
    const cost = l.unit_cost !== '' ? Number(l.unit_cost) : (p?.avg_cost ?? p?.purchase_price ?? 0)
    return s + cost * (Number(l.quantity) || 0)
  }, 0)

  return (
    <div>
      <PageHeader
        back={{ to: '/purchase-orders', label: 'Purchase orders' }}
        title="Receive stock without a PO"
        description="For stock bought without a purchase order. Tracked products go into stock and their average cost updates."
      />
      <Card>
        <CardContent className="space-y-5 pt-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Supplier" hint="Optional">
              <SearchSelect
                aria-label="Supplier"
                value={supplierId}
                onChange={setSupplierId}
                options={(suppliers.data?.items || []).map((s) => supplierOption(s))}
                clearable
                placeholder="None - or search supplier"
              />
            </Field>
            <Field label="Docket / invoice no">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
            <Field label="Received on">
              <Input type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
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
                  onScan()
                }
              }}
            />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH className="min-w-64">Product</TH>
                  <TH>Quantity</TH>
                  <TH>Cost (ex GST)</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {lines.map((l, i) => {
                  const p = l.product_id ? byId.get(Number(l.product_id)) : undefined
                  return (
                    <TR key={l.key}>
                      <TD>
                        <SearchSelect
                          aria-label={`Line ${i + 1} product`}
                          value={l.product_id}
                          onChange={(v) => update(l.key, { product_id: v })}
                          options={productOptions}
                          placeholder="Search product, SKU or barcode"
                        />
                        {p && !p.is_tracked_inventory && (
                          <div className="mt-1 text-xs text-amber-700">
                            Stock not tracked for this product - only its cost updates
                          </div>
                        )}
                      </TD>
                      <TD>
                        <Input
                          aria-label={`Line ${i + 1} quantity`}
                          type="number"
                          min={0}
                          step="any"
                          className="w-24 min-w-24"
                          value={l.quantity}
                          onChange={(e) => update(l.key, { quantity: e.target.value })}
                        />
                      </TD>
                      <TD>
                        <Input
                          aria-label={`Line ${i + 1} cost`}
                          type="number"
                          min={0}
                          step="any"
                          className="w-24 min-w-24"
                          value={l.unit_cost}
                          placeholder={
                            p?.avg_cost != null
                              ? String(p.avg_cost)
                              : p?.purchase_price != null
                                ? String(p.purchase_price)
                                : '0.00'
                          }
                          onChange={(e) => update(l.key, { unit_cost: e.target.value })}
                        />
                      </TD>
                      <TD>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Remove"
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
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, blank()])}>
              <Plus /> Add line
            </Button>
            <span className="text-sm">
              Value <b className="tabular-nums">{formatMoney(total)}</b> ex GST
            </span>
          </div>
          <Field label="Notes">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Spinner /> : <PackageCheck />} Receive into stock
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
