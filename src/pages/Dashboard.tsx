import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Circle, Clock, DollarSign, FileText, Gauge, Mail, Sparkles, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Activity, Dashboard as DashboardData, Onboarding, OrderSummary, Paged } from '@/lib/types'
import { formatDateTime, formatMoney, timeAgo } from '@/lib/utils'
import { useMe } from '@/hooks/useMe'
import { describeAction, entityLink, recordName } from '@/lib/activity'
import { PageHeader } from '@/components/common/PageHeader'
import { ChannelBadge, ConfidenceBadge } from '@/components/common/badges'
import { EmptyState, LoadingRows, StatCard } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { Select } from '@/components/ui/input'

function OnboardingCard() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['onboarding'], queryFn: () => api.get<Onboarding>('/onboarding') })
  const dismiss = useMutation({
    mutationFn: () => api.post('/onboarding/dismiss'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding'] }),
  })
  if (!data || data.dismissed || data.completed === data.total) return null

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Get set up
          </CardTitle>
          <CardDescription>
            {data.completed} of {data.total} steps done
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => dismiss.mutate()} title="Hide">
          <X />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={(data.completed / data.total) * 100} />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {data.steps.map((s) => (
            <Link
              key={s.key}
              to={s.link}
              className="flex items-start gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
            >
              {s.done ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className={s.done ? 'text-muted-foreground line-through' : 'font-medium'}>{s.title}</p>
                {!s.done && <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { data: me } = useMe()
  const [days, setDays] = useState(30)

  const dash = useQuery({
    queryKey: ['dashboard', days],
    queryFn: () => api.get<DashboardData>(`/reports/dashboard?days=${days}`),
  })
  const review = useQuery({
    queryKey: ['orders', 'review-preview'],
    queryFn: () => api.get<Paged<OrderSummary>>('/orders?status=needs_review&page_size=6'),
    refetchInterval: 15_000,
  })
  const activity = useQuery({ queryKey: ['activity'], queryFn: () => api.get<Activity[]>('/activity?limit=12') })

  const d = dash.data
  const chartData = d?.series.map((s) => ({ ...s, label: s.date.slice(5) })) || []

  return (
    <div>
      <PageHeader
        title={`Hi ${me?.name?.split(' ')[0] || ''}`}
        description={
          <>
            Forward orders to <span className="font-medium text-foreground">{me?.tenant.inbound_email}</span>
          </>
        }
        actions={
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        }
      />

      <OnboardingCard />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders received"
          value={d?.orders.received ?? '-'}
          hint={`${d?.orders.needs_review ?? 0} waiting for review`}
          icon={Mail}
        />
        <StatCard
          label="Approved value"
          value={formatMoney(d?.orders.approved_value ?? 0)}
          hint={`${d?.orders.approved ?? 0} orders approved`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="AI accuracy"
          value={d?.accuracy_percent != null ? `${d.accuracy_percent}%` : '-'}
          hint={`${d?.lines_processed ?? 0} lines approved without changes`}
          icon={Gauge}
        />
        <StatCard
          label="Time saved"
          value={`${d?.time_saved_hours ?? 0} hrs`}
          hint={d?.avg_processing_seconds ? `~${d.avg_processing_seconds}s per order to draft` : 'vs manual entry'}
          icon={Clock}
          tone="warning"
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Orders over time</CardTitle>
            <CardDescription>Orders received per day</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} fill="url(#fill)" name="Orders" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" /> Invoices
            </CardTitle>
            <CardDescription>Last {days} days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ['Invoiced', formatMoney(d?.invoices.total ?? 0), `${d?.invoices.count ?? 0} invoices`],
              ['Sent to customers', String(d?.invoices.sent ?? 0), ''],
              ['Paid', formatMoney(d?.invoices.paid ?? 0), ''],
              ['Outstanding', formatMoney(d?.invoices.outstanding ?? 0), ''],
            ].map(([label, value, hint]) => (
              <div key={label} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">
                  {value} {hint && <span className="text-xs font-normal text-muted-foreground">({hint})</span>}
                </span>
              </div>
            ))}
            {!!d?.invoices.overdue && (
              <Link to="/invoices?status=overdue" className="block rounded-md bg-red-50 px-3 py-2 text-red-700">
                {d.invoices.overdue} overdue invoice{d.invoices.overdue > 1 ? 's' : ''} →
              </Link>
            )}
            <div className="pt-1">
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">By channel</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(d?.by_channel || {}).map(([ch, n]) => (
                  <span key={ch} className="flex items-center gap-1">
                    <ChannelBadge channel={ch as never} /> <b>{n}</b>
                  </span>
                ))}
                {!Object.keys(d?.by_channel || {}).length && <span className="text-muted-foreground">No orders yet</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Waiting for review</CardTitle>
              <CardDescription>Newest AI drafts</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {review.isLoading ? (
              <LoadingRows rows={3} />
            ) : !review.data?.items.length ? (
              <EmptyState title="All caught up" description="New orders will show up here as they arrive." />
            ) : (
              <div className="divide-y">
                {review.data.items.map((o) => (
                  <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{o.customer_name || o.customer_raw || 'Unknown customer'}</p>
                      <p className="text-xs text-muted-foreground">
                        #{o.id} · {o.line_count} lines · {timeAgo(o.created_at)}
                      </p>
                    </div>
                    <ChannelBadge channel={o.channel} />
                    <ConfidenceBadge value={o.overall_confidence} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(activity.data || []).map((a) => (
              <div key={a.id} className="flex gap-2 text-sm">
                <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <span className="font-medium">{a.user_name}</span> {describeAction(a.action)}
                  {entityLink(a.entity, a.entity_id) ? (
                    <Link to={entityLink(a.entity, a.entity_id)!} className="text-primary">
                      {' '}
                      {recordName(a) || `#${a.entity_id}`}
                    </Link>
                  ) : (
                    recordName(a) && <span className="text-muted-foreground"> · {recordName(a)}</span>
                  )}
                  <div className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</div>
                </div>
              </div>
            ))}
            {!activity.data?.length && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          </CardContent>
        </Card>
      </div>

      {!!d?.top_customers.length && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Top customers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {d.top_customers.map((c) => (
              <div key={c.customer_id} className="rounded-lg border p-3">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {c.orders} orders · {formatMoney(c.value)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
