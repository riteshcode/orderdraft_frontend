import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ActivityBrowser } from '@/pages/ActivityLog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Ban, CheckCircle2, LogIn } from 'lucide-react'
import { api, auth } from '@/lib/api'
import type { AdminTenantDetail as Detail, LoginResponse, Plan } from '@/lib/types'
import { formatDate, timeAgo } from '@/lib/utils'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { SubscriptionBadge } from '@/components/common/badges'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Progress, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

type SubForm = { plan_id: string; subscription_status: string; trial_date: string }

export default function AdminTenantDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const tenant = useQuery({ queryKey: ['admin-tenant', id], queryFn: () => api.get<Detail>(`/admin/tenants/${id}`) })
  const plans = useQuery({ queryKey: ['admin-plans'], queryFn: () => api.get<Plan[]>('/admin/plans') })
  const [form, setForm] = useState<SubForm | null>(null)

  useEffect(() => {
    if (tenant.data) {
      setForm({
        plan_id: tenant.data.plan_id ? String(tenant.data.plan_id) : '',
        subscription_status: tenant.data.subscription_status,
        trial_date: tenant.data.trial_ends_at ? tenant.data.trial_ends_at.slice(0, 10) : '',
      })
    }
  }, [tenant.data])

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<Detail>(`/admin/tenants/${id}`, body),
    onSuccess: (data) => {
      qc.setQueryData(['admin-tenant', id], data)
      qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      toast.success('Tenant updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const impersonate = useMutation({
    mutationFn: () => api.post<LoginResponse>(`/admin/tenants/${id}/impersonate`),
    onSuccess: (res) => auth.startImpersonation(res.token),
    onError: (e: Error) => toast.error(e.message),
  })

  if (tenant.isLoading || !form) return <LoadingRows />
  if (tenant.isError) return <ErrorState error={tenant.error} />
  const t = tenant.data!
  const suspended = t.status === 'suspended'

  async function toggleSuspend() {
    const ok = await confirm({
      title: suspended ? `Activate ${t.name}?` : `Suspend ${t.name}?`,
      description: suspended
        ? 'Users will be able to log in again.'
        : 'Users will be locked out and orders will stop processing.',
      destructive: !suspended,
      confirmText: suspended ? 'Activate' : 'Suspend',
    })
    if (ok) update.mutate({ status: suspended ? 'active' : 'suspended' })
  }

  // Sirf badle hue fields bhejo
  function saveSubscription() {
    if (!form) return
    const body: Record<string, unknown> = {}
    if (form.plan_id && Number(form.plan_id) !== t.plan_id) body.plan_id = Number(form.plan_id)
    if (form.subscription_status !== t.subscription_status) body.subscription_status = form.subscription_status
    if (form.trial_date && form.trial_date !== (t.trial_ends_at || '').slice(0, 10))
      body.trial_ends_at = `${form.trial_date}T23:59:59`
    if (!Object.keys(body).length) return toast.info('Nothing to save - no changes')
    update.mutate(body)
  }

  const u = t.usage
  return (
    <div>
      <PageHeader
        back={{ to: '/admin/tenants', label: 'Tenants' }}
        title={
          <>
            {t.name} <SubscriptionBadge status={t.subscription_status} />
            {suspended && <Badge variant="destructive">Suspended</Badge>}
          </>
        }
        description={`${t.slug} · ${t.email || 'no email'} · joined ${formatDate(t.created_at)}`}
        actions={
          <>
            <Button variant="outline" onClick={toggleSuspend} disabled={update.isPending}>
              {suspended ? <CheckCircle2 /> : <Ban />} {suspended ? 'Activate' : 'Suspend'}
            </Button>
            <Button onClick={() => impersonate.mutate()} disabled={impersonate.isPending}>
              {impersonate.isPending ? <Spinner /> : <LogIn />} Login as owner
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan">
              <Select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
                <option value="">-</option>
                {(plans.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" hint="Manual override (e.g. pilot clients)">
              <Select
                value={form.subscription_status}
                onChange={(e) => setForm({ ...form, subscription_status: e.target.value })}
              >
                {['trialing', 'active', 'past_due', 'canceled', 'expired'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Trial ends">
              <Input type="date" value={form.trial_date} onChange={(e) => setForm({ ...form, trial_date: e.target.value })} />
            </Field>
            <Field label="Current period ends">
              <Input readOnly value={formatDate(t.current_period_end)} />
            </Field>
            <Field label="Stripe customer">
              <Input readOnly className="font-mono text-xs" value={t.stripe_customer_id || '-'} />
            </Field>
            <Field label="Stripe subscription">
              <Input readOnly className="font-mono text-xs" value={t.stripe_subscription_id || '-'} />
            </Field>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={saveSubscription} disabled={update.isPending}>
              {update.isPending && <Spinner />} Save
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage this period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orders</span>
                <span className="font-medium">
                  {u.orders_used} / {u.orders_limit} ({u.percent}%)
                </span>
              </div>
              <Progress value={u.percent} tone={u.percent >= 100 ? 'danger' : u.percent >= 80 ? 'warning' : 'default'} />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Users</span>
                <span>
                  {u.users_used} / {u.users_limit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoices (all time)</span>
                <span>{t.invoices_total}</span>
              </div>
              {!u.can_process && <p className="text-destructive">Blocked: {u.blocked_reason}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI cost (30 days)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TBody>
                  {Object.entries(t.ai_cost_by_kind_30d).map(([kind, cost]) => (
                    <TR key={kind}>
                      <TD>{kind}</TD>
                      <TD className="text-right">US${cost.toFixed(4)}</TD>
                    </TR>
                  ))}
                  {!Object.keys(t.ai_cost_by_kind_30d).length && (
                    <TR>
                      <TD className="text-muted-foreground">No AI usage yet</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>Last login</TH>
              </TR>
            </THead>
            <TBody>
              {t.users.map((usr) => (
                <TR key={usr.id}>
                  <TD className="font-medium">{usr.name}</TD>
                  <TD>{usr.email}</TD>
                  <TD className="capitalize">{usr.role}</TD>
                  <TD>{usr.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Disabled</Badge>}</TD>
                  <TD className="text-muted-foreground">{timeAgo(usr.last_login_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {/* Support: client ne kya kiya / kya badla - "ulta seedha" hua to yahin se pata chalega */}
      <div className="mt-6">
        <h2 className="mb-1 text-lg font-semibold">Activity log</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Everything this business changed (old → new values), logins and failed logins. For server errors, search{' '}
          <code className="rounded bg-muted px-1">logs/app.log</code> for the reference number the customer sends.
        </p>
        <ActivityBrowser basePath={`/admin/tenants/${id}/activity`} />
      </div>
    </div>
  )
}
