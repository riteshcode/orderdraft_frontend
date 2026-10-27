import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileText, PlusCircle, Wallet } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { Invoice, InvoiceSummary, Paged } from '@/lib/types'
import { cn, formatDate, formatMoney } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { InvoiceStatusBadge } from '@/components/common/badges'
import { EmptyState, ErrorState, LoadingRows, Pagination, SearchInput, StatCard } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Table, TBody, TD, THead, TR } from '@/components/ui/table'
import { SortTH, useSort } from '@/components/common/SortableTH'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sourceLabel } from '@/lib/providers'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
]

function SourceBadge({ source }: { source: Invoice['source'] }) {
  return source === 'internal' ? (
    <Badge variant="secondary">OrderDraft</Badge>
  ) : (
    <Badge variant="info">{sourceLabel(source)}</Badge>
  )
}

export default function InvoicesList() {
  const navigate = useNavigate()
  const { isAdmin } = usePermission()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const [source, setSource] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search)

  const summary = useQuery({ queryKey: ['invoices', 'summary'], queryFn: () => api.get<InvoiceSummary>('/invoices/summary') })
  const { sort, sortProps } = useSort('', () => setPage(1))
  const invoices = useQuery({
    queryKey: ['invoices', status, source, q, page, sort],
    queryFn: () =>
      api.get<Paged<Invoice>>('/invoices' + qs({ status: status === 'all' ? '' : status, source, q, page, page_size: 25, sort })),
  })

  const s = summary.data

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Invoices created by OrderDraft and tracked from Xero, QuickBooks or MYOB."
        actions={
          isAdmin && (
            <Button asChild>
              <Link to="/invoices/new">
                <PlusCircle /> New invoice
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={formatMoney(s?.outstanding ?? 0)}
          hint="Approved or sent, not yet paid"
          icon={Wallet}
        />
        <StatCard
          label="Overdue"
          value={formatMoney(s?.overdue_amount ?? 0)}
          hint={`${s?.overdue_count ?? 0} invoice${s?.overdue_count === 1 ? '' : 's'}`}
          icon={AlertTriangle}
          tone="danger"
        />
        <StatCard label="Paid" value={formatMoney(s?.paid_total ?? 0)} icon={CheckCircle2} tone="success" />
        <StatCard label="Drafts" value={s?.by_status.draft?.count ?? 0} hint="Not sent yet" icon={FileText} tone="warning" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onValueChange={(v) => {
            setParams(v === 'all' ? {} : { status: v })
            setPage(1)
          }}
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
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
            placeholder="Number, PO or customer"
          />
          <Select
            value={source}
            onChange={(e) => {
              setSource(e.target.value)
              setPage(1)
            }}
            className="w-36"
          >
            <option value="">All sources</option>
            <option value="internal">OrderDraft</option>
            <option value="xero">Xero</option>
            <option value="quickbooks">QuickBooks</option>
            <option value="myob">MYOB</option>
          </Select>
        </div>
      </div>

      <Card>
        {invoices.isLoading ? (
          <LoadingRows />
        ) : invoices.isError ? (
          <div className="p-4">
            <ErrorState error={invoices.error} />
          </div>
        ) : !invoices.data?.items.length ? (
          <EmptyState
            icon={FileText}
            title="No invoices here"
            description="Invoices appear when approved orders go to your accounting software or an OrderDraft Invoice destination - or create one yourself."
            action={
              isAdmin && (
                <Button asChild variant="outline">
                  <Link to="/invoices/new">
                    <PlusCircle /> New invoice
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <SortTH {...sortProps('number')}>Number</SortTH>
                  <SortTH {...sortProps('customer')}>Customer</SortTH>
                  <SortTH {...sortProps('source')}>Source</SortTH>
                  <SortTH {...sortProps('issue_date', true)}>Issued</SortTH>
                  <SortTH {...sortProps('due_date')}>Due</SortTH>
                  <SortTH {...sortProps('total', true)} className="text-right" align="right">
                    Total
                  </SortTH>
                  <SortTH {...sortProps('balance', true)} className="text-right" align="right">
                    Balance
                  </SortTH>
                  <SortTH {...sortProps('status')}>Status</SortTH>
                </TR>
              </THead>
              <TBody>
                {invoices.data.items.map((inv) => (
                  <TR key={inv.id} className="cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <TD className="font-medium text-primary">{inv.number || `#${inv.id}`}</TD>
                    <TD>
                      {inv.customer_name || '-'}
                      {inv.reference && <div className="text-xs text-muted-foreground">Ref {inv.reference}</div>}
                    </TD>
                    <TD>
                      <SourceBadge source={inv.source} />
                    </TD>
                    <TD>{formatDate(inv.issue_date)}</TD>
                    <TD className={cn(inv.overdue && 'font-medium text-destructive')}>{formatDate(inv.due_date)}</TD>
                    <TD className="text-right">{formatMoney(inv.total)}</TD>
                    <TD className="text-right">{formatMoney(inv.balance)}</TD>
                    <TD>
                      <div className="flex gap-1">
                        <InvoiceStatusBadge status={inv.status} />
                        {inv.overdue && <Badge variant="destructive">Overdue</Badge>}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={25} total={invoices.data.total} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
