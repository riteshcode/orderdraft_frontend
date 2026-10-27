import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bot, Building2, CreditCard, DollarSign, Mail, ShoppingCart, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { AdminStats } from '@/lib/types'
import { formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { SubscriptionBadge } from '@/components/common/badges'
import { ErrorState, LoadingRows, StatCard } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminDashboard() {
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get<AdminStats>('/admin/stats') })

  if (stats.isLoading) return <LoadingRows />
  if (stats.isError) return <ErrorState error={stats.error} />
  const s = stats.data!
  const costPerOrder = s.orders_30d ? s.ai_cost_usd_30d / s.orders_30d : 0

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="All tenants, last 30 days."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/plans">
                <CreditCard /> Plans
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/tenants">
                <Building2 /> Tenants
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Tenants" value={s.tenants_total} hint={`${s.new_tenants_30d} new in 30 days`} icon={Building2} />
        <StatCard label="MRR" value={formatMoney(s.mrr_aud)} hint="Active subscriptions (AUD)" icon={DollarSign} tone="success" />
        <StatCard label="Orders (30d)" value={s.orders_30d} icon={ShoppingCart} />
        <StatCard
          label="AI cost (30d)"
          value={`US$${s.ai_cost_usd_30d.toFixed(2)}`}
          hint={`~US$${costPerOrder.toFixed(3)} per order`}
          icon={Bot}
          tone="warning"
        />
        <StatCard
          label="Messages (30d)"
          value={s.messages_30d}
          hint={`${s.failed_messages_30d} failed`}
          icon={Mail}
          tone={s.failed_messages_30d ? 'danger' : 'default'}
        />
        <StatCard label="Users" value={s.users_total} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {Object.entries(s.tenants_by_subscription).map(([status, count]) => (
            <Link
              key={status}
              to={`/admin/tenants?status=${status}`}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-muted/50"
            >
              <SubscriptionBadge status={status} /> <span className="font-semibold">{count}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
