import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import type { Plan } from '@/lib/types'
import { formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

type PlanForm = {
  code: string
  name: string
  price_aud_month: string
  stripe_price_id: string
  order_limit: string
  user_limit: string
  features: string
  is_active: boolean
  sort_order: string
}

const EMPTY: PlanForm = {
  code: '',
  name: '',
  price_aud_month: '0',
  stripe_price_id: '',
  order_limit: '300',
  user_limit: '3',
  features: '',
  is_active: true,
  sort_order: '0',
}

function toForm(p: Plan): PlanForm {
  return {
    code: p.code,
    name: p.name,
    price_aud_month: String(p.price_aud_month),
    stripe_price_id: p.stripe_price_id || '',
    order_limit: String(p.order_limit),
    user_limit: String(p.user_limit),
    features: p.features.join('\n'),
    is_active: p.is_active,
    sort_order: String(p.sort_order),
  }
}

export default function AdminPlans() {
  const qc = useQueryClient()
  const plans = useQuery({ queryKey: ['admin-plans'], queryFn: () => api.get<Plan[]>('/admin/plans') })
  const [editing, setEditing] = useState<Plan | 'new' | null>(null)
  const [form, setForm] = useState<PlanForm>(EMPTY)

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing === 'new' ? api.post<Plan>('/admin/plans', body) : api.put<Plan>(`/admin/plans/${(editing as Plan).id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      toast.success('Plan saved')
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function open(p: Plan | 'new') {
    setEditing(p)
    setForm(p === 'new' ? EMPTY : toForm(p))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) return toast.error('Code and name are required')
    save.mutate({
      code: form.code.trim(),
      name: form.name.trim(),
      price_aud_month: Number(form.price_aud_month) || 0,
      stripe_price_id: form.stripe_price_id.trim() || null,
      order_limit: Number(form.order_limit) || 0,
      user_limit: Number(form.user_limit) || 1,
      features: form.features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    })
  }

  const set = (key: keyof PlanForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Subscription plans shown on the billing page."
        actions={
          <Button onClick={() => open('new')}>
            <Plus /> New plan
          </Button>
        }
      />

      <Alert tone="info" className="mb-4">
        Create a recurring monthly AUD price in Stripe, paste its <code>price_...</code> id here. Plans without a Stripe price
        can't be purchased.
      </Alert>

      <Card>
        {plans.isLoading ? (
          <LoadingRows />
        ) : plans.isError ? (
          <div className="p-4">
            <ErrorState error={plans.error} />
          </div>
        ) : (
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH className="text-right">Price / mo</TH>
                  <TH className="text-right">Orders</TH>
                  <TH className="text-right">Users</TH>
                  <TH>Stripe price</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Sort</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {plans.data!.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-mono text-xs">{p.code}</TD>
                    <TD className="font-medium">{p.name}</TD>
                    <TD className="text-right">{formatMoney(p.price_aud_month)}</TD>
                    <TD className="text-right">{p.order_limit.toLocaleString()}</TD>
                    <TD className="text-right">{p.user_limit}</TD>
                    <TD>
                      {p.stripe_price_id ? (
                        <span className="font-mono text-xs">{p.stripe_price_id}</span>
                      ) : (
                        <Badge variant="warning">Not set</Badge>
                      )}
                    </TD>
                    <TD>{p.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Hidden</Badge>}</TD>
                    <TD className="text-right">{p.sort_order}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => open(p)}>
                        <Pencil /> Edit
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'New plan' : 'Edit plan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" hint="Lowercase, e.g. growth">
                <Input value={form.code} onChange={set('code')} />
              </Field>
              <Field label="Name">
                <Input value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Price (AUD / month, ex GST)">
                <Input type="number" min={0} step="0.01" value={form.price_aud_month} onChange={set('price_aud_month')} />
              </Field>
              <Field label="Stripe price id">
                <Input
                  value={form.stripe_price_id}
                  onChange={set('stripe_price_id')}
                  placeholder="price_..."
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Orders / month">
                <Input type="number" min={0} value={form.order_limit} onChange={set('order_limit')} />
              </Field>
              <Field label="Users">
                <Input type="number" min={1} value={form.user_limit} onChange={set('user_limit')} />
              </Field>
              <Field label="Sort order">
                <Input type="number" value={form.sort_order} onChange={set('sort_order')} />
              </Field>
              <div className="space-y-2">
                <Label>Active (visible to customers)</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <Field label="Features" hint="One per line">
              <Textarea rows={4} value={form.features} onChange={set('features')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button disabled={save.isPending}>{save.isPending && <Spinner />} Save plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
