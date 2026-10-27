import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ClipboardList, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import type { Paged, ReorderSuggestion, Supplier } from '@/lib/types'
import { formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingRows } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { SearchSelect, supplierOption } from '@/components/ui/search-select'

type Pick = { on: boolean; qty: string; supplier: string }

/** Low stock -> ek click mein har supplier ka draft PO */
export default function ReorderSuggestions() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const sug = useQuery({
    queryKey: ['purchase-orders', 'suggestions'],
    queryFn: () => api.get<ReorderSuggestion[]>('/purchase-orders/suggestions'),
  })
  const suppliers = useQuery({
    queryKey: ['suppliers', 'active-all'],
    queryFn: () => api.get<Paged<Supplier>>('/suppliers?page_size=5000'),
  })
  const [picks, setPicks] = useState<Record<number, Pick>>({})

  useEffect(() => {
    if (sug.data)
      setPicks(
        Object.fromEntries(
          sug.data.map((s) => [
            s.product_id,
            { on: !!s.supplier_id, qty: String(s.suggested_qty), supplier: s.supplier_id ? String(s.supplier_id) : '' },
          ]),
        ),
      )
  }, [sug.data])

  const chosen = useMemo(
    () =>
      (sug.data || []).filter(
        (s) => picks[s.product_id]?.on && picks[s.product_id]?.supplier && Number(picks[s.product_id]?.qty) > 0,
      ),
    [sug.data, picks],
  )
  const supplierCount = new Set(chosen.map((s) => picks[s.product_id].supplier)).size

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: number; number: string }[]>('/purchase-orders/from-suggestions', {
        items: chosen.map((s) => ({
          product_id: s.product_id,
          supplier_id: Number(picks[s.product_id].supplier),
          quantity: Number(picks[s.product_id].qty),
        })),
      }),
    onSuccess: (pos) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success(
        `${pos.length} draft purchase order${pos.length > 1 ? 's' : ''} created: ${pos.map((p) => p.number).join(', ')}`,
      )
      navigate(pos.length === 1 ? `/purchase-orders/${pos[0].id}` : '/purchase-orders')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const set = (pid: number, patch: Partial<Pick>) => setPicks((m) => ({ ...m, [pid]: { ...m[pid], ...patch } }))

  return (
    <div>
      <PageHeader
        back={{ to: '/purchase-orders', label: 'Purchase orders' }}
        title="Reorder suggestions"
        description="Tracked products at or below their reorder level, after counting what is already on order. Suggested quantity fills up to twice the reorder level (at least the supplier's minimum order)."
        actions={
          <Button disabled={!chosen.length || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? <Spinner /> : <ClipboardList />} Create {supplierCount || ''} draft PO
            {supplierCount === 1 ? '' : 's'}
          </Button>
        }
      />
      <Card>
        {sug.isLoading ? (
          <LoadingRows />
        ) : sug.isError ? (
          <div className="p-4">
            <ErrorState error={sug.error} />
          </div>
        ) : !sug.data?.length ? (
          <EmptyState
            icon={Sparkles}
            title="Nothing to reorder"
            description="Every tracked product with a reorder level has enough on hand or on order. Set reorder levels on the Stock page."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="w-8" />
                <TH>Product</TH>
                <TH className="text-right">On hand</TH>
                <TH className="text-right">On order</TH>
                <TH className="text-right">Reorder at</TH>
                <TH>Order qty</TH>
                <TH>Supplier</TH>
                <TH className="text-right">Cost</TH>
              </TR>
            </THead>
            <TBody>
              {sug.data.map((s) => {
                const pk = picks[s.product_id]
                if (!pk) return null
                return (
                  <TR key={s.product_id}>
                    <TD>
                      <input
                        type="checkbox"
                        aria-label={`Order ${s.name}`}
                        className="size-4 accent-primary"
                        checked={pk.on}
                        onChange={(e) => set(s.product_id, { on: e.target.checked })}
                      />
                    </TD>
                    <TD>
                      <div className="font-medium">{s.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{s.sku}</div>
                    </TD>
                    <TD
                      className={
                        s.quantity_on_hand <= 0 ? 'text-right font-semibold text-red-600 tabular-nums' : 'text-right tabular-nums'
                      }
                    >
                      {s.quantity_on_hand}
                    </TD>
                    <TD className="text-right tabular-nums">{s.on_order || '-'}</TD>
                    <TD className="text-right tabular-nums">{s.reorder_level}</TD>
                    <TD>
                      <Input
                        aria-label={`${s.name} order qty`}
                        type="number"
                        min={0}
                        step="any"
                        className="w-24 min-w-24"
                        value={pk.qty}
                        onChange={(e) => set(s.product_id, { qty: e.target.value })}
                      />
                    </TD>
                    <TD>
                      <SearchSelect
                        aria-label={`${s.name} supplier`}
                        className="min-w-48"
                        value={pk.supplier}
                        onChange={(v) => set(s.product_id, { supplier: v, on: !!v || pk.on })}
                        options={(suppliers.data?.items || []).map((x) =>
                          supplierOption(x, x.id === s.supplier_id ? { hint: 'preferred' } : {}),
                        )}
                        placeholder="Choose supplier"
                      />
                      {(!!s.min_order_qty || !!s.lead_time_days) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {s.min_order_qty ? `Min order ${s.min_order_qty}` : ''}
                          {s.min_order_qty && s.lead_time_days ? ' · ' : ''}
                          {s.lead_time_days ? `${s.lead_time_days} day lead time` : ''}
                        </div>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">{s.unit_cost != null ? formatMoney(s.unit_cost) : '-'}</TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>
      {sug.data?.some((s) => !s.supplier_id) && (
        <Alert tone="info" className="mt-4">
          Some products have no supplier yet - pick one here, or link products on a{' '}
          <Link to="/suppliers" className="underline">
            supplier's page
          </Link>{' '}
          and mark the preferred one.
        </Alert>
      )}
    </div>
  )
}
