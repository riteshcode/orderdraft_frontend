import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PlayCircle, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import type { Paged, Product, StandingOrder } from '@/lib/types'
import { usePermission } from '@/hooks/useMe'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { dayLabel, StandingEmpty, StandingOrderCard, StandingOrderDialog, type StandingBody } from './StandingOrders'

/** Customer page -> Standing orders tab (staff). Customer ke portal se bane bhi yahin dikhte hain. */
export function CustomerStandingOrders({ customerId }: { customerId: number }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { role } = usePermission()
  const canEdit = role === 'owner' || role === 'admin' || role === 'reviewer'
  const key = ['standing-orders', customerId]
  const list = useQuery({ queryKey: key, queryFn: () => api.get<StandingOrder[]>(`/standing-orders?customer_id=${customerId}`) })
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const [editing, setEditing] = useState<StandingOrder | 'new' | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const skip = useMutation({
    mutationFn: ({ id, date, skip }: { id: number; date: string; skip: boolean }) =>
      api.post(`/standing-orders/${id}/skip`, { date, skip }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  })
  const createNow = useMutation({
    mutationFn: (id: number) => api.post<{ order_id: number; delivery_date: string }>(`/standing-orders/${id}/create-now`),
    onSuccess: (r) => {
      refresh()
      toast.success(`Order #${r.order_id} created for ${dayLabel(r.delivery_date, true)}`, {
        action: { label: 'Open', onClick: () => navigate(`/orders/${r.order_id}`) },
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function save(body: StandingBody) {
    if (editing && editing !== 'new') await api.put(`/standing-orders/${editing.id}`, body)
    else await api.post('/standing-orders', { ...body, customer_id: customerId })
    toast.success('Standing order saved')
    refresh()
  }

  async function remove(so: StandingOrder) {
    const ok = await confirm({
      title: `Delete "${so.name}"?`,
      description: 'No more orders will be created from it. Orders already created stay as they are.',
      confirmText: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.del(`/standing-orders/${so.id}`)
      toast.success('Standing order deleted')
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (list.isLoading) return <LoadingRows rows={3} />
  if (list.isError) return <ErrorState error={list.error} />
  const rows = list.data || []
  const pick = (products.data?.items || [])
    .filter((p) => p.is_active)
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku, unit: p.unit, price: p.price }))

  return (
    <div className="space-y-3">
      {rows.length > 0 && canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing('new')}>
            <Plus /> New standing order
          </Button>
        </div>
      )}
      {!rows.length ? (
        <StandingEmpty
          onAdd={canEdit ? () => setEditing('new') : undefined}
          text="Does this customer order the same things every week? Set up a standing order and OrderDraft creates the order automatically on the day you choose - it arrives in Orders as Needs review."
        />
      ) : (
        rows.map((so) => (
          <StandingOrderCard
            key={so.id}
            so={so}
            canEdit={canEdit}
            orderLink={(id) => `/orders/${id}`}
            onEdit={() => setEditing(so)}
            onDelete={() => remove(so)}
            onSkip={(date, s) => skip.mutate({ id: so.id, date, skip: s })}
            extra={
              so.is_active && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={createNow.isPending}
                  title="Create the next delivery's order now instead of waiting"
                  onClick={() => createNow.mutate(so.id)}
                >
                  <PlayCircle /> Create next order now
                </Button>
              )
            }
          />
        ))
      )}
      {editing && (
        <StandingOrderDialog
          initial={editing === 'new' ? null : editing}
          products={pick}
          showPrices
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
