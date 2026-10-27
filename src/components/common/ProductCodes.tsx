import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, Printer, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/misc'

export interface ProductCodesData {
  id: number
  sku: string
  name: string
  unit: string | null
  price: number | null
  barcode: string
  symbology: 'ean13' | 'upca' | 'ean8' | 'code128'
  barcode_svg: string // hamare server ka banaya SVG (python-barcode / qrcode)
  qr_svg: string
}

export const SYMBOLOGY_LABEL = { ean13: 'EAN-13', upca: 'UPC-A', ean8: 'EAN-8', code128: 'Code 128' }

export function isInternalBarcode(code: string) {
  return /^20\d{11}$/.test(code)
}

function download(name: string, svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Product dialog ka "Barcode & QR" tab */
export function ProductCodes({ productId, canEdit }: { productId: number; canEdit: boolean }) {
  const qc = useQueryClient()
  const codes = useQuery({
    queryKey: ['product-codes', productId],
    queryFn: () => api.get<ProductCodesData>(`/products/${productId}/codes`),
  })
  const regenerate = useMutation({
    mutationFn: () => api.post<ProductCodesData>(`/products/${productId}/barcode/regenerate`),
    onSuccess: (d) => {
      qc.setQueryData(['product-codes', productId], d)
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Internal barcode generated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (codes.isLoading || !codes.data)
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    )
  const c = codes.data
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono">{c.barcode}</span>
        <Badge variant="secondary">{SYMBOLOGY_LABEL[c.symbology]}</Badge>
        {isInternalBarcode(c.barcode) ? (
          <Badge variant="info">Internal (made by OrderDraft)</Badge>
        ) : (
          <Badge variant="outline">Your barcode</Badge>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4">
          <div className="w-full max-w-64 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: c.barcode_svg }} />
          <Button type="button" variant="ghost" size="sm" onClick={() => download(`${c.sku}-barcode.svg`, c.barcode_svg)}>
            <Download /> Barcode SVG
          </Button>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4">
          <div className="w-32 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: c.qr_svg }} />
          <Button type="button" variant="ghost" size="sm" onClick={() => download(`${c.sku}-qr.svg`, c.qr_svg)}>
            <Download /> QR SVG
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild type="button" variant="outline" size="sm">
          <Link to={`/products/labels?ids=${c.id}`} target="_blank">
            <Printer /> Print labels
          </Link>
        </Button>
        {canEdit && !isInternalBarcode(c.barcode) && (
          <Button type="button" variant="ghost" size="sm" disabled={regenerate.isPending} onClick={() => regenerate.mutate()}>
            {regenerate.isPending ? <Spinner /> : <RefreshCw />} Use internal barcode instead
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Scan either code at the counter or in an order - both give the same product. Internal codes start with 20 (reserved for
        in-store use, so they never clash with real retail barcodes). Got a manufacturer barcode on the box? Enter it on the Sales
        tab.
      </p>
    </div>
  )
}
