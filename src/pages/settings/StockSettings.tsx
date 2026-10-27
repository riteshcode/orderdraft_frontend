import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { TenantSettings } from '@/lib/types'
import { usePermission } from '@/hooks/useMe'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

export function StockSettings() {
  const qc = useQueryClient()
  const { isAdmin } = usePermission()
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<TenantSettings>('/settings') })

  const [prefix, setPrefix] = useState('')
  const [next, setNext] = useState('')
  useEffect(() => {
    if (settings.data) {
      setPrefix(settings.data.stock.po_prefix)
      setNext(String(settings.data.stock.po_next_number))
    }
  }, [settings.data])
  const saveNumbers = useMutation({
    mutationFn: () => api.put<TenantSettings>('/settings/stock', { po_prefix: prefix, po_next_number: Number(next) }),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      toast.success('Purchase order numbering saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = useMutation({
    mutationFn: (deduct_on_approve: boolean) => api.put<TenantSettings>('/settings/stock', { deduct_on_approve }),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      toast.success(data.stock.deduct_on_approve ? 'Approved orders will reduce stock' : 'Approved orders will not change stock')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (settings.isLoading) return <LoadingRows rows={2} />
  if (settings.isError || !settings.data) return <ErrorState error={settings.error} />
  const on = settings.data.stock.deduct_on_approve

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Stock</CardTitle>
        <CardDescription>
          OrderDraft keeps the quantity on hand for every product with <b>Track inventory</b> on, including products synced from
          Xero, QuickBooks or MYOB. After the first sync, sync never overwrites your stock.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Switch id="deduct" checked={on} disabled={!isAdmin || save.isPending} onCheckedChange={(v) => save.mutate(v)} />
          <div className="space-y-1">
            <Label htmlFor="deduct">Reduce stock when an order is approved</Label>
            <p className="text-sm text-muted-foreground">
              Each approved order takes its quantities off on hand for tracked products and logs it as “Sold” with the order
              number. Products without Track inventory are never counted. Orders still approve when stock runs short (on hand can
              go negative).
            </p>
          </div>
        </div>
        <div className="space-y-1 rounded-lg border p-4 text-sm">
          <p className="font-medium">Costing: weighted average cost</p>
          <p className="text-muted-foreground">
            Each delivery you receive updates a product's average cost: (stock on hand × old average + quantity received × new
            cost) ÷ new stock. Stock value and margins use it. This is the method Xero and MYOB inventory use and the usual choice
            for wholesale and fresh produce, where prices move every week.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Purchase order prefix">
            <Input className="w-32" value={prefix} disabled={!isAdmin} onChange={(e) => setPrefix(e.target.value)} />
          </Field>
          <Field label="Next PO number">
            <Input
              className="w-32"
              type="number"
              min={1}
              value={next}
              disabled={!isAdmin}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          {isAdmin && (
            <Button
              variant="outline"
              disabled={saveNumbers.isPending || !(Number(next) > 0)}
              onClick={() => saveNumbers.mutate()}
            >
              Save numbering
            </Button>
          )}
          <span className="pb-2 text-xs text-muted-foreground">
            Next PO: {prefix}
            {next}
          </span>
        </div>
        <p className="text-sm">
          <Link to="/stock" className="text-primary underline">
            Open the Stock page
          </Link>{' '}
          to receive stock, count it, or see the history.
        </p>
      </CardContent>
    </Card>
  )
}
