import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, PackagePlus, PlusCircle, Sparkles } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { POList, POStatus } from '@/lib/types'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingRows, Pagination, SearchInput } from '@/components/common/states'
import { SortTH, useSort } from '@/components/common/SortableTH'
import { POStatusBadge } from '@/components/common/badges'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

const TABS: { key: string; label: string; statuses?: POStatus[] }[] = [
  { key: 'open', label: 'Open', statuses: ['draft', 'sent', 'partial'] },
  { key: 'draft', label: 'Draft', statuses: ['draft'] },
  { key: 'sent', label: 'Sent', statuses: ['sent'] },
  { key: 'partial', label: 'Part received', statuses: ['partial'] },
  { key: 'received,closed', label: 'Done', statuses: ['received', 'closed'] },
  { key: '', label: 'All' },
]

export default function PurchaseOrders() {
  const { isAdmin } = usePermission()
  const [tab, setTab] = useState('open')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { sort, sortProps } = useSort('', () => setPage(1))
  const q = useDebounce(search)
  const pos = useQuery({
    queryKey: ['purchase-orders', tab, q, page, sort],
    queryFn: () => api.get<POList>('/purchase-orders' + qs({ status: tab, q, page, page_size: 25, sort })),
  })
  const counts = pos.data?.counts || {}
  const countFor = (t: (typeof TABS)[number]) => (t.statuses ? t.statuses.reduce((n, s) => n + (counts[s] || 0), 0) : 0)

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        description="Order stock from suppliers, email the PO, and receive deliveries into stock."
        actions={
          isAdmin && (
            <>
              <Button asChild variant="outline">
                <Link to="/purchase-orders/suggestions">
                  <Sparkles /> Reorder suggestions
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/stock-receipts/new">
                  <PackagePlus /> Receive without PO
                </Link>
              </Button>
              <Button asChild>
                <Link to="/purchase-orders/new">
                  <PlusCircle /> New purchase order
                </Link>
              </Button>
            </>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="inline-flex h-9 flex-wrap items-center gap-1 rounded-lg bg-muted p-1 text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key)
                setPage(1)
              }}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1 font-medium text-muted-foreground',
                tab === t.key && 'bg-card text-foreground shadow-sm',
              )}
            >
              {t.label}
              {countFor(t) > 0 && t.key !== 'received,closed' && <span className="ml-1 text-xs">{countFor(t)}</span>}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="PO number, supplier or reference"
        />
      </div>
      <Card>
        {pos.isLoading ? (
          <LoadingRows />
        ) : pos.isError ? (
          <div className="p-4">
            <ErrorState error={pos.error} />
          </div>
        ) : !pos.data?.items.length ? (
          <EmptyState
            icon={ClipboardList}
            title="No purchase orders here"
            description="Create one, or start from reorder suggestions."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <SortTH {...sortProps('number', true)}>PO</SortTH>
                  <SortTH {...sortProps('supplier')}>Supplier</SortTH>
                  <SortTH {...sortProps('order_date', true)}>Ordered</SortTH>
                  <SortTH {...sortProps('expected_date')}>Expected</SortTH>
                  <TH>Received</TH>
                  <SortTH {...sortProps('status')}>Status</SortTH>
                  <SortTH {...sortProps('total', true)} className="text-right" align="right">
                    Total
                  </SortTH>
                </TR>
              </THead>
              <TBody>
                {pos.data.items.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <Link to={`/purchase-orders/${p.id}`} className="font-medium text-primary hover:underline">
                        {p.number}
                      </Link>
                      {p.reference && <div className="text-xs text-muted-foreground">{p.reference}</div>}
                    </TD>
                    <TD>{p.supplier_name}</TD>
                    <TD>{formatDate(p.order_date)}</TD>
                    <TD>
                      {formatDate(p.expected_date)}
                      {p.overdue && (
                        <Badge variant="destructive" className="ml-2">
                          Late
                        </Badge>
                      )}
                    </TD>
                    <TD className="w-36">
                      {p.status === 'draft' || p.status === 'cancelled' ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Progress value={p.received_pct} className="h-1.5 w-20" />
                          <span className="text-xs tabular-nums">{p.received_pct}%</span>
                        </div>
                      )}
                    </TD>
                    <TD>
                      <POStatusBadge status={p.status} />
                    </TD>
                    <TD className="text-right tabular-nums">{formatMoney(p.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={25} total={pos.data.total} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
