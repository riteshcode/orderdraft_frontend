import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Boxes, Image as ImageIcon, Package, Pencil, ShoppingCart, Users } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { OrderStatus, Paged, Product, ProductOrders, StockMovement } from '@/lib/types'
import { cn, formatDate, formatDateTime, formatMoney } from '@/lib/utils'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { OrderStatusBadge } from '@/components/common/badges'
import { ErrorState, LoadingRows, Pagination, StatCard } from '@/components/common/states'
import { HistoryPanel } from '@/components/common/ActivityList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductDialog } from '@/pages/catalog/Products'

/**
 * Product page - naam pe click karke yahan: kis kis order mein kitni qty, stock kaise badla, kisne kya edit kiya.
 * Edit button wahi product form kholta hai.
 */
const qty = (n: number | null | undefined) => (n == null ? '-' : Number.isInteger(n) ? String(n) : n.toFixed(2))

export default function ProductDetail() {
  const id = Number(useParams().id)
  const { isAdmin } = usePermission()
  const [editing, setEditing] = useState(false)
  const product = useQuery({ queryKey: ['product', id], queryFn: () => api.get<Product>(`/products/${id}`) })
  const orders = useQuery({
    queryKey: ['product', id, 'orders-summary'],
    queryFn: () => api.get<ProductOrders>(`/products/${id}/orders?page_size=1`),
  })

  if (product.isLoading) return <LoadingRows rows={6} />
  if (product.isError || !product.data) return <ErrorState error={product.error} />
  const p = product.data
  const s = orders.data?.summary

  return (
    <div>
      <PageHeader
        back={{ to: '/products', label: 'Products' }}
        title={
          <>
            {p.name}
            {!p.is_active && <Badge variant="secondary">{p.deleted_at ? 'In Trash' : 'Inactive'}</Badge>}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">{p.sku}</span>
            {p.category_name && <span>{p.category_name}</span>}
            {p.unit && <span>per {p.unit}</span>}
            <span>{formatMoney(p.price)}</span>
          </span>
        }
        actions={
          isAdmin &&
          !p.deleted_at && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> Edit product
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-4">
        {p.image_url ? (
          <img src={p.image_url} alt="" className="hidden size-24 shrink-0 rounded-lg border object-cover sm:block" />
        ) : (
          <div className="hidden size-24 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground sm:flex">
            <ImageIcon className="size-6" />
          </div>
        )}
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Sold"
            value={s ? `${qty(s.sold_quantity)} ${p.unit || ''}` : '-'}
            hint={s ? `${formatMoney(s.sold_value)} ex GST` : undefined}
            icon={ShoppingCart}
          />
          <StatCard label="Orders" value={s?.sold_orders ?? '-'} hint="Approved orders with this product" icon={Package} />
          <StatCard label="Customers" value={s?.customers ?? '-'} hint="Who bought it" icon={Users} />
          <StatCard
            label={p.is_tracked_inventory ? 'On hand' : 'Waiting for review'}
            value={p.is_tracked_inventory ? qty(p.quantity_on_hand ?? 0) : qty(s?.pending_quantity ?? 0)}
            hint={
              p.is_tracked_inventory
                ? `${qty(s?.pending_quantity ?? 0)} in orders waiting for review`
                : 'Quantity in orders not approved yet'
            }
            icon={Boxes}
          />
        </div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="stock">Stock changes</TabsTrigger>
          <TabsTrigger value="history">Edit history</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <OrdersTab productId={p.id} unit={p.unit} />
        </TabsContent>
        <TabsContent value="stock">
          <StockTab product={p} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryPanel entity="product" id={p.id} title="Edit history" />
        </TabsContent>
      </Tabs>

      {editing && <ProductDialog product={p} open onClose={() => setEditing(false)} />}
    </div>
  )
}

const STATUSES: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'All orders' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'approved', label: 'Approved' },
  { value: 'exported', label: 'Exported' },
  { value: 'rejected', label: 'Rejected' },
]

function OrdersTab({ productId, unit }: { productId: number; unit: string | null }) {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const data = useQuery({
    queryKey: ['product', productId, 'orders', status, page],
    queryFn: () => api.get<ProductOrders>(`/products/${productId}/orders` + qs({ status, page, page_size: 25 })),
  })
  const by = data.data?.summary.by_status || {}
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Orders with this product</CardTitle>
          <CardDescription>
            Every order line for this product - newest first. Only approved / exported orders count as sold.
          </CardDescription>
        </div>
        <Select
          aria-label="Order status"
          className="w-48"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          {STATUSES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
              {st.value && by[st.value] ? ` (${by[st.value].orders})` : ''}
            </option>
          ))}
        </Select>
      </CardHeader>
      <CardContent>
        {data.isLoading ? (
          <LoadingRows rows={4} />
        ) : data.isError ? (
          <ErrorState error={data.error} />
        ) : !data.data?.items.length ? (
          <p className="text-sm text-muted-foreground">No orders with this product{status ? ' in this status' : ' yet'}.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <THead>
                  <TR>
                    <TH>Order</TH>
                    <TH>Date</TH>
                    <TH>Customer</TH>
                    <TH className="text-right">Qty</TH>
                    <TH className="text-right">Price</TH>
                    <TH className="text-right">Amount</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.data.items.map((l, i) => (
                    <TR key={`${l.order_id}-${i}`}>
                      <TD>
                        <Link to={`/orders/${l.order_id}`} className="font-medium text-primary hover:underline">
                          #{l.order_id}
                        </Link>
                        {l.po_number && <div className="text-xs text-muted-foreground">PO {l.po_number}</div>}
                      </TD>
                      <TD className="whitespace-nowrap text-xs">
                        {formatDateTime(l.approved_at || l.created_at)}
                        {l.delivery_date && <div className="text-muted-foreground">Deliver {formatDate(l.delivery_date)}</div>}
                      </TD>
                      <TD>
                        {l.customer_id ? (
                          <Link to={`/customers/${l.customer_id}`} className="hover:underline">
                            {l.customer_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{l.customer_name || '-'}</span>
                        )}
                      </TD>
                      <TD className="text-right font-medium tabular-nums">
                        {qty(l.quantity)}{' '}
                        <span className="text-xs font-normal text-muted-foreground">{l.unit || unit || ''}</span>
                      </TD>
                      <TD className="text-right tabular-nums">{l.unit_price != null ? formatMoney(l.unit_price) : '-'}</TD>
                      <TD className="text-right tabular-nums">{l.line_total != null ? formatMoney(l.line_total) : '-'}</TD>
                      <TD>
                        <OrderStatusBadge status={l.status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <Pagination page={page} pageSize={25} total={data.data.total} onChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StockTab({ product }: { product: Product }) {
  const [page, setPage] = useState(1)
  const log = useQuery({
    queryKey: ['stock', 'movements', product.id, page],
    queryFn: () => api.get<Paged<StockMovement>>('/stock/movements' + qs({ product_id: product.id, page, page_size: 25 })),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock changes</CardTitle>
        <CardDescription>
          {product.is_tracked_inventory
            ? 'Every change to the quantity on hand - orders, deliveries received, adjustments - with who made it.'
            : 'Stock is not tracked for this product. Turn on "Track inventory" in Edit product or on the Stock page.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {log.isLoading ? (
          <LoadingRows rows={4} />
        ) : log.isError ? (
          <ErrorState error={log.error} />
        ) : !log.data?.items.length ? (
          <p className="text-sm text-muted-foreground">No stock changes yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <THead>
                  <TR>
                    <TH>When</TH>
                    <TH>Reason</TH>
                    <TH className="text-right">Change</TH>
                    <TH className="text-right">After</TH>
                    <TH>By</TH>
                  </TR>
                </THead>
                <TBody>
                  {log.data.items.map((m) => (
                    <TR key={m.id}>
                      <TD className="whitespace-nowrap text-xs">{formatDateTime(m.created_at)}</TD>
                      <TD>
                        {m.reason_label}
                        {m.note && (
                          <div className="text-xs text-muted-foreground">
                            {m.ref_type === 'order' && m.ref_id ? (
                              <Link to={`/orders/${m.ref_id}`} className="text-primary hover:underline">
                                {m.note}
                              </Link>
                            ) : (
                              m.note
                            )}
                          </div>
                        )}
                      </TD>
                      <TD className={cn('text-right font-medium tabular-nums', m.change < 0 ? 'text-red-600' : 'text-green-700')}>
                        {m.change > 0 ? '+' : ''}
                        {qty(m.change)}
                      </TD>
                      <TD className="text-right tabular-nums">{qty(m.qty_after)}</TD>
                      <TD className="text-xs">{m.user_name || '-'}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <Pagination page={page} pageSize={25} total={log.data.total} onChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
