import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DollarSign, Download, Package, ShoppingCart, Users } from 'lucide-react'
import { api, downloadFile, qs } from '@/lib/api'
import type { SalesByCategory, SalesByCustomer, SalesByOrder, SalesSummary } from '@/lib/types'
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingRows, Pagination, StatCard } from '@/components/common/states'
import { OrderStatusBadge } from '@/components/common/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { OrderStatus } from '@/lib/types'

/**
 * Reports - sales by category / customer / order. Sale = approved (ya exported) order, ex GST, approve date se.
 * Har table "Download CSV" se Excel mein.
 */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type Preset = 'month' | 'last_month' | '30' | '90' | 'fy' | 'custom'
function presetRange(p: Preset): [string, string] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (p) {
    case 'month':
      return [iso(new Date(y, m, 1)), iso(now)]
    case 'last_month':
      return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))]
    case '90':
      return [iso(new Date(y, m, now.getDate() - 89)), iso(now)]
    case 'fy': // Australian financial year: 1 July - 30 June
      return [iso(new Date(m >= 6 ? y : y - 1, 6, 1)), iso(now)]
    default:
      return [iso(new Date(y, m, now.getDate() - 29)), iso(now)]
  }
}

const qtyFmt = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 })

function ShareBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{value}%</span>
    </div>
  )
}

export default function Reports() {
  const [preset, setPreset] = useState<Preset>('30')
  const [[from, to], setRange] = useState<[string, string]>(presetRange('30'))
  const range = { date_from: from, date_to: to }

  const summary = useQuery({
    queryKey: ['reports', 'summary', from, to],
    queryFn: () => api.get<SalesSummary>('/reports/sales/summary' + qs(range)),
  })

  async function csv(path: string, name: string, extra: Record<string, string> = {}) {
    try {
      await downloadFile(`/reports/sales/${path}` + qs({ ...range, ...extra, format: 'csv' }), `${name}-${from}-${to}.csv`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const s = summary.data
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales from approved orders, ex GST. Pick a date range, then look by category, customer or order."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Date range"
          className="w-48"
          value={preset}
          onChange={(e) => {
            const p = e.target.value as Preset
            setPreset(p)
            if (p !== 'custom') setRange(presetRange(p))
          }}
        >
          <option value="month">This month</option>
          <option value="last_month">Last month</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="fy">This financial year</option>
          <option value="custom">Custom dates</option>
        </Select>
        <Input
          aria-label="From"
          type="date"
          className="w-40"
          value={from}
          max={to}
          onChange={(e) => {
            setPreset('custom')
            setRange([e.target.value, to])
          }}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          aria-label="To"
          type="date"
          className="w-40"
          value={to}
          min={from}
          onChange={(e) => {
            setPreset('custom')
            setRange([from, e.target.value])
          }}
        />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sales (ex GST)" value={s ? formatMoney(s.value) : '-'} icon={DollarSign} />
        <StatCard
          label="Orders"
          value={s?.orders ?? '-'}
          hint={s ? `Average ${formatMoney(s.average_order)}` : undefined}
          icon={ShoppingCart}
        />
        <StatCard label="Customers" value={s?.customers ?? '-'} hint="Who ordered in this period" icon={Users} />
        <StatCard label="Items sold" value={s ? qtyFmt(s.quantity) : '-'} hint="Total quantity" icon={Package} />
      </div>

      <Tabs defaultValue="category">
        <TabsList className="mb-4">
          <TabsTrigger value="category">By category</TabsTrigger>
          <TabsTrigger value="customer">By customer</TabsTrigger>
          <TabsTrigger value="order">By order</TabsTrigger>
        </TabsList>
        <TabsContent value="category">
          <ByCategory range={range} onCsv={(level) => csv('by-category', 'sales-by-category', { level })} />
        </TabsContent>
        <TabsContent value="customer">
          <ByCustomer range={range} onCsv={() => csv('by-customer', 'sales-by-customer')} />
        </TabsContent>
        <TabsContent value="order">
          <ByOrder range={range} onCsv={() => csv('by-order', 'sales-by-order')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type Range = { date_from: string; date_to: string }

function CsvButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Download /> Download CSV
    </Button>
  )
}

function ByCategory({ range, onCsv }: { range: Range; onCsv: (level: string) => void }) {
  const [level, setLevel] = useState<'parent' | 'sub'>('parent')
  const data = useQuery({
    queryKey: ['reports', 'category', range, level],
    queryFn: () => api.get<SalesByCategory>('/reports/sales/by-category' + qs({ ...range, level })),
  })
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Sales by category</CardTitle>
          <CardDescription>
            Products without a category show as "Uncategorised" - set categories on the{' '}
            <Link to="/categories" className="text-primary hover:underline">
              Categories
            </Link>{' '}
            page.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Category level"
            className="w-48"
            value={level}
            onChange={(e) => setLevel(e.target.value as 'parent' | 'sub')}
          >
            <option value="parent">Main categories</option>
            <option value="sub">Include sub-categories</option>
          </Select>
          <CsvButton onClick={() => onCsv(level)} />
        </div>
      </CardHeader>
      <CardContent>
        {data.isLoading ? (
          <LoadingRows rows={4} />
        ) : data.isError ? (
          <ErrorState error={data.error} />
        ) : !data.data?.items.length ? (
          <p className="text-sm text-muted-foreground">No sales in this period.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH>Category</TH>
                  <TH className="text-right">Sales</TH>
                  <TH>Share</TH>
                  <TH className="text-right">Qty</TH>
                  <TH className="text-right">Orders</TH>
                  <TH className="text-right">Products</TH>
                </TR>
              </THead>
              <TBody>
                {data.data.items.map((i) => (
                  <TR key={`${i.category_id ?? 'none'}-${i.category}`}>
                    <TD className={i.category_id ? 'font-medium' : 'text-muted-foreground'}>
                      {i.category_id ? (
                        <Link to={`/products?category=${i.category_id}`} className="hover:underline">
                          {i.category}
                        </Link>
                      ) : (
                        i.category
                      )}
                    </TD>
                    <TD className="text-right font-medium tabular-nums">{formatMoney(i.value)}</TD>
                    <TD>
                      <ShareBar value={i.share} />
                    </TD>
                    <TD className="text-right tabular-nums">{qtyFmt(i.quantity)}</TD>
                    <TD className="text-right tabular-nums">{i.orders}</TD>
                    <TD className="text-right tabular-nums">{i.products}</TD>
                  </TR>
                ))}
                <TR className="bg-muted/40 font-semibold">
                  <TD>Total</TD>
                  <TD className="text-right tabular-nums">{formatMoney(data.data.total)}</TD>
                  <TD colSpan={4} />
                </TR>
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ByCustomer({ range, onCsv }: { range: Range; onCsv: () => void }) {
  const data = useQuery({
    queryKey: ['reports', 'customer', range],
    queryFn: () => api.get<SalesByCustomer>('/reports/sales/by-customer' + qs(range)),
  })
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Sales by customer</CardTitle>
          <CardDescription>Your best customers first. Click a name for their full history.</CardDescription>
        </div>
        <CsvButton onClick={onCsv} />
      </CardHeader>
      <CardContent>
        {data.isLoading ? (
          <LoadingRows rows={4} />
        ) : data.isError ? (
          <ErrorState error={data.error} />
        ) : !data.data?.items.length ? (
          <p className="text-sm text-muted-foreground">No sales in this period.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH>Customer</TH>
                  <TH className="text-right">Sales</TH>
                  <TH>Share</TH>
                  <TH className="text-right">Orders</TH>
                  <TH className="text-right">Average order</TH>
                  <TH className="text-right">Qty</TH>
                  <TH>Last order</TH>
                </TR>
              </THead>
              <TBody>
                {data.data.items.map((i) => (
                  <TR key={i.customer_id ?? 'none'}>
                    <TD>
                      {i.customer_id ? (
                        <Link to={`/customers/${i.customer_id}`} className="font-medium hover:underline">
                          {i.customer}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{i.customer}</span>
                      )}
                      {i.code && <div className="text-xs text-muted-foreground">{i.code}</div>}
                    </TD>
                    <TD className="text-right font-medium tabular-nums">{formatMoney(i.value)}</TD>
                    <TD>
                      <ShareBar value={i.share} />
                    </TD>
                    <TD className="text-right tabular-nums">{i.orders}</TD>
                    <TD className="text-right tabular-nums">{formatMoney(i.average_order)}</TD>
                    <TD className="text-right tabular-nums">{qtyFmt(i.quantity)}</TD>
                    <TD className="whitespace-nowrap text-xs">{i.last_order ? formatDate(i.last_order) : '-'}</TD>
                  </TR>
                ))}
                <TR className="bg-muted/40 font-semibold">
                  <TD>Total</TD>
                  <TD className="text-right tabular-nums">{formatMoney(data.data.total)}</TD>
                  <TD colSpan={5} />
                </TR>
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ByOrder({ range, onCsv }: { range: Range; onCsv: () => void }) {
  const [page, setPage] = useState(1)
  const data = useQuery({
    queryKey: ['reports', 'order', range, page],
    queryFn: () => api.get<SalesByOrder>('/reports/sales/by-order' + qs({ ...range, page, page_size: 50 })),
  })
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Sales by order</CardTitle>
          <CardDescription>
            Every approved order in the period, newest first
            {data.data ? ` - ${data.data.total} orders, ${formatMoney(data.data.total_value)}` : ''}.
          </CardDescription>
        </div>
        <CsvButton onClick={onCsv} />
      </CardHeader>
      <CardContent>
        {data.isLoading ? (
          <LoadingRows rows={4} />
        ) : data.isError ? (
          <ErrorState error={data.error} />
        ) : !data.data?.items.length ? (
          <p className="text-sm text-muted-foreground">No approved orders in this period.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <THead>
                  <TR>
                    <TH>Order</TH>
                    <TH>Approved</TH>
                    <TH>Customer</TH>
                    <TH>Delivery</TH>
                    <TH className="text-right">Lines</TH>
                    <TH className="text-right">Qty</TH>
                    <TH className="text-right">Sales</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.data.items.map((i) => (
                    <TR key={i.order_id}>
                      <TD>
                        <Link to={`/orders/${i.order_id}`} className="font-medium text-primary hover:underline">
                          #{i.order_id}
                        </Link>
                        {i.po_number && <div className="text-xs text-muted-foreground">PO {i.po_number}</div>}
                      </TD>
                      <TD className="whitespace-nowrap text-xs">{i.approved_at ? formatDateTime(i.approved_at) : '-'}</TD>
                      <TD>
                        {i.customer_id ? (
                          <Link to={`/customers/${i.customer_id}`} className="hover:underline">
                            {i.customer}
                          </Link>
                        ) : (
                          i.customer
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-xs">{i.delivery_date ? formatDate(i.delivery_date) : '-'}</TD>
                      <TD className="text-right tabular-nums">{i.lines}</TD>
                      <TD className="text-right tabular-nums">{qtyFmt(i.quantity)}</TD>
                      <TD className="text-right font-medium tabular-nums">{formatMoney(i.value)}</TD>
                      <TD>
                        <OrderStatusBadge status={i.status as OrderStatus} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <Pagination page={page} pageSize={50} total={data.data.total} onChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
