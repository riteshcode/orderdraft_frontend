import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import type { StandingOrder } from '@/lib/types'
import { useConfirm } from '@/components/common/ConfirmDialog'
import {
  StandingEmpty,
  StandingOrderCard,
  StandingOrderDialog,
  type PickProduct,
  type StandingBody,
} from '@/components/common/StandingOrders'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/misc'
import { usePortal } from './context'

/**
 * Portal -> Standing orders: customer apna har-hafte ka order khud set kare
 * (delivery day, order kab bane, items). Har order "Received" mein aata hai, staff confirm karta hai.
 */
export default function PortalStanding() {
  const { slug, info, loggedIn, get, post, put, del } = usePortal()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const key = ['portal', slug, 'standing']
  const list = useQuery({ queryKey: key, queryFn: () => get<StandingOrder[]>('/standing-orders'), enabled: loggedIn })
  const products = useQuery({
    queryKey: ['portal', slug, 'standing-products'],
    queryFn: () => get<PickProduct[]>('/standing-orders/products'),
    enabled: loggedIn,
  })
  const [editing, setEditing] = useState<StandingOrder | 'new' | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const skip = useMutation({
    mutationFn: ({ id, date, skip }: { id: number; date: string; skip: boolean }) =>
      post(`/standing-orders/${id}/skip`, { date, skip }),
    onSuccess: (_, v) => {
      toast.success(v.skip ? "Skipped - we won't send that delivery" : 'Skip removed')
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!loggedIn) return <Alert tone="info">Please log in to manage your standing orders.</Alert>
  if (info && !info.allow_standing) return <Alert tone="info">Standing orders aren't available - please contact us.</Alert>
  if (list.isLoading) return <Spinner />
  if (list.isError) return <Alert tone="error">{(list.error as Error).message}</Alert>
  const rows = list.data || []

  async function save(body: StandingBody) {
    if (editing && editing !== 'new') await put(`/standing-orders/${editing.id}`, body)
    else await post('/standing-orders', body)
    toast.success('Standing order saved')
    refresh()
  }

  async function remove(so: StandingOrder) {
    if (
      !(await confirm({
        title: `Delete "${so.name}"?`,
        description: "We'll stop creating this order. Orders already placed aren't changed.",
        confirmText: 'Delete',
        destructive: true,
      }))
    )
      return
    try {
      await del(`/standing-orders/${so.id}`)
      toast.success('Standing order deleted')
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="hidden text-xl font-semibold md:block">Standing orders</h1>
          <p className="text-sm text-muted-foreground">
            Order the same things every week without lifting a finger. Skip a week any time.
          </p>
        </div>
        {rows.length > 0 && (
          <Button onClick={() => setEditing('new')}>
            <Plus /> New standing order
          </Button>
        )}
      </div>
      {!rows.length ? (
        <StandingEmpty
          onAdd={() => setEditing('new')}
          text="Get the same items delivered on a regular day - for example every Monday. We create the order for you on the day you pick, and you can skip a week whenever you like."
        />
      ) : (
        rows.map((so) => (
          <StandingOrderCard
            key={so.id}
            so={so}
            showPrices
            showCreator={false}
            orderLink={(id) => `/portal/${slug}/orders/${id}`}
            onEdit={() => setEditing(so)}
            onDelete={() => remove(so)}
            onSkip={(date, s) => skip.mutate({ id: so.id, date, skip: s })}
          />
        ))
      )}
      <p className="text-xs text-muted-foreground">
        Each order shows in{' '}
        <Link to={`/portal/${slug}/orders`} className="text-primary hover:underline">
          My orders
        </Link>{' '}
        and we confirm it before delivery. Prices are your prices on the day the order is confirmed.
      </p>
      {editing && (
        <StandingOrderDialog
          initial={editing === 'new' ? null : editing}
          products={products.data || []}
          showPrices
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
