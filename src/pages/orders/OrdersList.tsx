import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarClock, Download, PenSquare, PlusCircle, ShoppingCart, Store } from 'lucide-react'
import { api, downloadFile, qs } from '@/lib/api'
import type { OrderStats, OrderSummary, Paged } from '@/lib/types'
import { formatDate, formatMoney, timeAgo } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/common/PageHeader'
import { ChannelBadge, ConfidenceBadge, OrderStatusBadge } from '@/components/common/badges'
import { EmptyState, ErrorState, LoadingRows, Pagination, SearchInput } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { SortTH, useSort } from '@/components/common/SortableTH'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TABS = [
  { key: 'needs_review', label: 'Needs review' },
  { key: 'approved', label: 'Approved' },
  { key: 'exported', label: 'Exported' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
]

export default function OrdersList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('status') || 'needs_review'
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search)

  const stats = useQuery({ queryKey: ['order-stats'], queryFn: () => api.get<OrderStats>('/orders/stats') })
  const { sort, sortProps } = useSort('', () => setPage(1))
  const orders = useQuery({
    queryKey: ['orders', tab, q, channel, page, sort],
    queryFn: () =>
      api.get<Paged<OrderSummary>>('/orders' + qs({ status: tab === 'all' ? '' : tab, q, channel, page, page_size: 25, sort })),
    refetchInterval: 10_000, // naye emails background mein aate rehte hain
  })

  async function exportCsv() {
    try {
      await downloadFile('/orders/export.csv?status=approved,exported', 'orders.csv')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const count = (s: string) => (s === 'all' ? null : stats.data?.by_status[s as keyof OrderStats['by_status']])

  return (
    <div>
      <PageHeader
        title="Orders"
        description="AI drafts from emails, voice notes, PDFs and messages."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Export CSV
            </Button>
            <Button asChild>
              <Link to="/orders/new">
                <PlusCircle /> New order
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setParams({ status: v })
            setPage(1)
          }}
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
                {!!count(t.key) && <span className="rounded-full bg-muted px-1.5 text-[11px]">{count(t.key)}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="Customer, PO or #id"
          />
          <Select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value)
              setPage(1)
            }}
            className="w-36"
          >
            <option value="">All sources</option>
            <option value="email">Email</option>
            <option value="voice">Voice</option>
            <option value="pdf">PDF</option>
            <option value="manual">Text</option>
            <option value="entered">Manual entry</option>
            <option value="portal">Customer portal</option>
            <option value="standing">Standing order</option>
          </Select>
        </div>
      </div>

      {!!stats.data?.processing && (
        <p className="mb-3 text-sm text-muted-foreground">
          {stats.data.processing} message{stats.data.processing > 1 ? 's' : ''} being processed by AI...
        </p>
      )}

      <Card>
        {orders.isLoading ? (
          <LoadingRows />
        ) : orders.isError ? (
          <div className="p-4">
            <ErrorState error={orders.error} />
          </div>
        ) : !orders.data?.items.length ? (
          <EmptyState
            icon={ShoppingCart}
            title={tab === 'needs_review' ? 'Nothing to review' : 'No orders here'}
            description="Forward an order email or create one manually to get started."
            action={
              <Button asChild variant="outline">
                <Link to="/orders/new">Create an order</Link>
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <SortTH {...sortProps('id', true)}>Order</SortTH>
                  <SortTH {...sortProps('customer')}>Customer</SortTH>
                  <TH>Source</TH>
                  <TH className="text-right">Lines</TH>
                  <SortTH {...sortProps('delivery_date')}>Delivery</SortTH>
                  <SortTH {...sortProps('total_amount', true)} className="text-right" align="right">
                    Value
                  </SortTH>
                  <SortTH {...sortProps('overall_confidence')}>Confidence</SortTH>
                  <SortTH {...sortProps('status')}>Status</SortTH>
                  <SortTH {...sortProps('created_at', true)}>Received</SortTH>
                </TR>
              </THead>
              <TBody>
                {orders.data.items.map((o) => (
                  <TR key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                    <TD className="font-medium text-primary">#{o.id}</TD>
                    <TD>
                      {o.customer_name || <span className="text-amber-700">? {o.customer_raw || 'Unknown'}</span>}
                      {o.po_number && <div className="text-xs text-muted-foreground">PO {o.po_number}</div>}
                    </TD>
                    <TD>
                      {o.source === 'portal' ? (
                        <Badge variant="info">
                          <Store /> Portal
                        </Badge>
                      ) : o.source === 'standing' ? (
                        <Badge variant="info">
                          <CalendarClock /> Standing
                        </Badge>
                      ) : o.source === 'manual' ? (
                        <Badge variant="secondary">
                          <PenSquare /> Manual
                        </Badge>
                      ) : (
                        <ChannelBadge channel={o.channel} />
                      )}
                    </TD>
                    <TD className="text-right">{o.line_count}</TD>
                    <TD>{formatDate(o.delivery_date)}</TD>
                    <TD className="text-right">{o.total_amount != null ? formatMoney(o.total_amount) : '-'}</TD>
                    <TD>
                      <ConfidenceBadge value={o.overall_confidence} />
                    </TD>
                    <TD>
                      <OrderStatusBadge status={o.status} />
                    </TD>
                    <TD className="text-muted-foreground">{timeAgo(o.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={25} total={orders.data.total} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
