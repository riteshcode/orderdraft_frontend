import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { AdminTenantRow } from '@/lib/types'
import { formatDate, timeAgo } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/common/PageHeader'
import { SubscriptionBadge } from '@/components/common/badges'
import { EmptyState, ErrorState, LoadingRows, Pagination, SearchInput } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

const PAGE_SIZE = 50

export default function AdminTenants() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search)

  // Backend {total, items} deta hai (page fields nahi)
  const tenants = useQuery({
    queryKey: ['admin-tenants', q, status, page],
    queryFn: () => api.get<{ total: number; items: AdminTenantRow[] }>('/admin/tenants' + qs({ q, status, page })),
  })

  return (
    <div>
      <PageHeader title="Tenants" description="Every business using OrderDraft." />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Name, slug or email"
        />
        <Select
          value={status}
          className="w-40"
          onChange={(e) => {
            setParams(e.target.value ? { status: e.target.value } : {})
            setPage(1)
          }}
        >
          <option value="">All</option>
          <option value="trialing">Trialing</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <Card>
        {tenants.isLoading ? (
          <LoadingRows />
        ) : tenants.isError ? (
          <div className="p-4">
            <ErrorState error={tenants.error} />
          </div>
        ) : !tenants.data?.items.length ? (
          <EmptyState icon={Building2} title="No tenants found" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Business</TH>
                  <TH>Plan</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Orders 30d</TH>
                  <TH className="text-right">AI cost</TH>
                  <TH className="text-right">Users</TH>
                  <TH>Last order</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {tenants.data.items.map((t) => (
                  <TR key={t.id} className="cursor-pointer" onClick={() => navigate(`/admin/tenants/${t.id}`)}>
                    <TD>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.slug}
                        {t.email && ` · ${t.email}`}
                      </div>
                    </TD>
                    <TD>{t.plan_name || '-'}</TD>
                    <TD>
                      <div className="flex gap-1">
                        <SubscriptionBadge status={t.subscription_status} />
                        {t.status === 'suspended' && <Badge variant="destructive">Suspended</Badge>}
                      </div>
                    </TD>
                    <TD className="text-right">{t.orders_30d}</TD>
                    <TD className="text-right">US${t.ai_cost_usd_30d.toFixed(2)}</TD>
                    <TD className="text-right">{t.users}</TD>
                    <TD className="text-muted-foreground">{t.last_order_at ? timeAgo(t.last_order_at) : '-'}</TD>
                    <TD className="text-muted-foreground">{formatDate(t.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={tenants.data.total} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
