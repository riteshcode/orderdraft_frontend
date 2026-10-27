import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import type { BillingInfo } from '@/lib/types'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { SubscriptionBadge } from '@/components/common/badges'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, Progress, Spinner } from '@/components/ui/misc'

export function BillingSettings() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const billing = useQuery({ queryKey: ['billing'], queryFn: () => api.get<BillingInfo>('/billing') })

  // Stripe checkout se wapas aaye?
  useEffect(() => {
    const result = params.get('checkout')
    if (!result) return
    if (result === 'success') {
      toast.success('Subscription updated - thank you!')
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['billing'] })
    } else {
      toast.info('Checkout cancelled')
    }
    setParams({}, { replace: true })
  }, [params, setParams, qc])

  const checkout = useMutation({
    mutationFn: (plan_code: string) => api.post<{ url: string }>('/billing/checkout', { plan_code }),
    onSuccess: (res) => {
      window.location.href = res.url
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const portal = useMutation({
    mutationFn: () => api.post<{ url: string }>('/billing/portal'),
    onSuccess: (res) => {
      window.location.href = res.url
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (billing.isLoading) return <LoadingRows />
  if (billing.isError) return <ErrorState error={billing.error} />
  const { plans, usage, has_subscription, stripe_enabled } = billing.data!
  const tone = usage.percent >= 100 ? 'danger' : usage.percent >= 80 ? 'warning' : 'default'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {usage.plan_name || 'No plan'} <SubscriptionBadge status={usage.subscription_status} />
            </CardTitle>
            <CardDescription>
              {usage.subscription_status === 'trialing' && usage.trial_ends_at
                ? `Free trial ends ${formatDate(usage.trial_ends_at)}`
                : usage.current_period_end
                  ? `Renews ${formatDate(usage.current_period_end)}`
                  : 'Current plan'}
            </CardDescription>
          </div>
          {has_subscription && (
            <Button variant="outline" onClick={() => portal.mutate()} disabled={portal.isPending}>
              {portal.isPending ? <Spinner /> : <ExternalLink />} Manage billing
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!usage.can_process && (
            <Alert tone="error" title="Order processing paused">
              {usage.blocked_reason}
            </Alert>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Orders this period</span>
                <span className="font-medium">
                  {usage.orders_used} / {usage.orders_limit} ({usage.percent}%)
                </span>
              </div>
              <Progress value={usage.percent} tone={tone} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Team members</span>
                <span className="font-medium">
                  {usage.users_used} / {usage.users_limit}
                </span>
              </div>
              <Progress value={(usage.users_used / Math.max(1, usage.users_limit)) * 100} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const current = p.code === usage.plan_code
          const canBuy = stripe_enabled && p.has_stripe_price
          const isActivePlan = current && usage.subscription_status === 'active'
          return (
            <Card key={p.id} className={cn('flex flex-col', current && 'border-primary ring-1 ring-primary')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {p.name} {current && <Badge>Current</Badge>}
                </CardTitle>
                <p className="pt-2">
                  <span className="text-3xl font-semibold">{formatMoney(p.price_aud_month)}</span>
                  <span className="text-sm text-muted-foreground">/mo AUD (ex GST)</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex-1 space-y-2 text-sm">
                  <li className="flex gap-2">
                    <Check className="size-4 text-green-600" /> {p.order_limit.toLocaleString()} orders / month
                  </li>
                  <li className="flex gap-2">
                    <Check className="size-4 text-green-600" /> {p.user_limit} users
                  </li>
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-muted-foreground">
                      <Check className="size-4 text-green-600" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={current ? 'outline' : 'default'}
                  disabled={!canBuy || isActivePlan || checkout.isPending}
                  title={!canBuy ? 'Billing not configured yet — contact support' : undefined}
                  onClick={() => checkout.mutate(p.code)}
                >
                  {checkout.isPending && checkout.variables === p.code && <Spinner />}
                  {isActivePlan ? 'Current plan' : has_subscription ? 'Switch plan' : 'Choose plan'}
                </Button>
                {!canBuy && (
                  <p className="text-center text-xs text-muted-foreground">Billing not configured yet — contact support</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
