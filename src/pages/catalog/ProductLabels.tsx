import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { formatMoney } from '@/lib/utils'
import { ErrorState, LoadingRows } from '@/components/common/states'
import type { ProductCodesData } from '@/components/common/ProductCodes'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type Kind = 'barcode' | 'qr' | 'both'

/** /products/labels?ids=1,2,3 - sticker sheet print (browser ka Print -> PDF / label printer) */
export default function ProductLabels() {
  const [params] = useSearchParams()
  const ids = (params.get('ids') || '')
    .split(',')
    .map(Number)
    .filter((n) => n > 0)
  const [kind, setKind] = useState<Kind>('both')
  const [copies, setCopies] = useState(1)
  const [showPrice, setShowPrice] = useState(true)
  const [cols, setCols] = useState(3)

  const labels = useQuery({
    queryKey: ['labels', ids.join(',')],
    queryFn: () => api.post<ProductCodesData[]>('/products/labels', { ids }),
    enabled: ids.length > 0,
  })

  if (!ids.length) return <ErrorState error={new Error('No products selected')} />
  if (labels.isLoading) return <LoadingRows rows={4} />
  if (labels.isError || !labels.data) return <ErrorState error={labels.error} />

  const sheet = labels.data.flatMap((l) => Array.from({ length: Math.max(1, copies) }, (_, i) => ({ ...l, key: `${l.id}-${i}` })))

  return (
    <div className="min-h-screen bg-background p-4 print:bg-white print:p-0">
      <style>{`@media print { @page { margin: 8mm } .no-print { display: none !important } }`}</style>
      <div className="no-print mx-auto mb-6 max-w-5xl space-y-4">
        <Link to="/products" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" /> Products
        </Link>
        <h1 className="text-2xl font-semibold">Print labels</h1>
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
          <Field label="Code">
            <Select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              <option value="both">Barcode + QR</option>
              <option value="barcode">Barcode only</option>
              <option value="qr">QR only</option>
            </Select>
          </Field>
          <Field label="Copies each">
            <Input
              type="number"
              min={1}
              max={100}
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value) || 1)}
              className="w-24"
            />
          </Field>
          <Field label="Per row">
            <Select value={cols} onChange={(e) => setCols(Number(e.target.value))}>
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="price" checked={showPrice} onCheckedChange={setShowPrice} />
            <label htmlFor="price" className="text-sm">
              Show price
            </label>
          </div>
          <Button className="ml-auto" onClick={() => window.print()}>
            <Printer /> Print {sheet.length} labels
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {sheet.map((l) => (
          <div
            key={l.key}
            className="flex break-inside-avoid flex-col items-center gap-1 rounded border border-dashed bg-white p-2 text-center text-black"
          >
            <div className="line-clamp-2 text-xs font-semibold leading-tight">{l.name}</div>
            <div className="font-mono text-[10px] text-gray-600">
              {l.sku}
              {l.unit ? ` · ${l.unit}` : ''}
            </div>
            <div className="flex w-full items-center justify-center gap-2">
              {kind !== 'qr' && (
                <div
                  className="min-w-0 flex-1 [&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: l.barcode_svg }}
                />
              )}
              {kind !== 'barcode' && (
                <div
                  className={kind === 'qr' ? 'w-24 [&_svg]:h-auto [&_svg]:w-full' : 'w-14 shrink-0 [&_svg]:h-auto [&_svg]:w-full'}
                  dangerouslySetInnerHTML={{ __html: l.qr_svg }}
                />
              )}
            </div>
            {kind === 'qr' && <div className="font-mono text-[10px]">{l.barcode}</div>}
            {showPrice && l.price != null && <div className="text-sm font-bold">{formatMoney(l.price)}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
