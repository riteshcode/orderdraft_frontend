import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  History,
  Minus,
  PackageCheck,
  PackageX,
  Plus,
  PlusCircle,
  SlidersHorizontal,
} from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { Paged, Product, StockItem, StockList, StockMovement, StockStatus } from '@/lib/types'
import { cn, formatDateTime, formatMoney } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingRows, Pagination, SearchInput, StatCard } from '@/components/common/states'
import { SortTH, useSort } from '@/components/common/SortableTH'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { productOption, SearchSelect } from '@/components/ui/search-select'

const STATUS: Record<StockStatus, { label: string; variant: BadgeVariant }> = {
  ok: { label: 'In stock', variant: 'success' },
  low: { label: 'Low', variant: 'warning' },
  out: { label: 'Out of stock', variant: 'destructive' },
}
const FILTERS: { key: 'all' | StockStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low stock' },
  { key: 'out', label: 'Out of stock' },
  { key: 'ok', label: 'In stock' },
]
type Mode = 'add' | 'remove' | 'set'
const MODE_REASON: Record<Mode, string> = { add: 'receive', remove: 'damaged', set: 'count' }

const qty = (n: number | null | undefined) => (n == null ? '-' : Number.isInteger(n) ? String(n) : n.toFixed(2))

// ---------------- Adjust dialog ----------------
function AdjustDialog({
  item,
  reasons,
  initialMode,
  onClose,
}: {
  item: StockItem
  reasons: Record<string, string>
  initialMode: Mode
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState(MODE_REASON[initialMode])
  const [note, setNote] = useState('')
  const n = Number(amount) || 0
  const after = mode === 'add' ? item.quantity_on_hand + n : mode === 'remove' ? item.quantity_on_hand - n : n

  const save = useMutation({
    mutationFn: () =>
      api.post<StockItem>('/stock/adjust', { product_id: item.id, mode, quantity: n, reason, note: note || null }),
    onSuccess: (r) => {
      toast.success(`${r.name}: ${qty(r.quantity_on_hand)} on hand`)
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {item.name} · <span className="font-mono">{item.sku}</span> · now <b>{qty(item.quantity_on_hand)}</b>{' '}
            {item.unit || ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm">
          {(['add', 'remove', 'set'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setReason(MODE_REASON[m])
              }}
              className={cn(
                'cursor-pointer rounded-md py-1.5 font-medium',
                mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground',
              )}
            >
              {m === 'add' ? 'Add (received)' : m === 'remove' ? 'Remove' : 'Set (count)'}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={mode === 'set' ? 'Counted quantity' : 'Quantity'}>
            <Input autoFocus type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {Object.entries(reasons).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier PO, who counted..." />
          </Field>
        </div>
        <div className={cn('rounded-lg border p-3 text-sm', after < 0 && 'border-red-200 bg-red-50 text-red-900')}>
          After: <b className="tabular-nums">{qty(after)}</b> {item.unit || ''}
          {after < 0 && ' - stock will be negative'}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || amount === '' || (mode !== 'set' && n <= 0)} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- History dialog ----------------
function HistoryDialog({ item, onClose }: { item: StockItem | null; onClose: () => void }) {
  const [page, setPage] = useState(1)
  const log = useQuery({
    queryKey: ['stock', 'movements', item?.id ?? 'all', page],
    queryFn: () => api.get<Paged<StockMovement>>('/stock/movements' + qs({ product_id: item?.id, page, page_size: 25 })),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{item ? `Stock history - ${item.name}` : 'Stock history - all products'}</DialogTitle>
          <DialogDescription>Every change, who made it and why.</DialogDescription>
        </DialogHeader>
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
                    {!item && <TH>Product</TH>}
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
                      {!item && <TD>{m.name}</TD>}
                      <TD>
                        {m.reason_label}
                        {m.note && (
                          <div className="text-xs text-muted-foreground">
                            {m.ref_type === 'order' && m.ref_id ? (
                              <Link to={`/orders/${m.ref_id}`} className="text-primary hover:underline" onClick={onClose}>
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
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Track product dialog ----------------
function TrackDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const products = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get<Paged<Product>>('/products?page_size=5000') })
  const [productId, setProductId] = useState('')
  const [reorder, setReorder] = useState('')
  const options = useMemo(() => (products.data?.items || []).filter((p) => !p.is_tracked_inventory), [products.data])
  const save = useMutation({
    mutationFn: () =>
      api.post<StockItem>('/stock/track', {
        product_id: Number(productId),
        track: true,
        reorder_level: reorder === '' ? null : Number(reorder),
      }),
    onSuccess: (r) => {
      toast.success(`Now tracking ${r.name} - use Adjust to enter the opening stock`)
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track stock for a product</DialogTitle>
          <DialogDescription>
            OrderDraft keeps the count for every tracked product, including ones synced from your accounting software. Approved
            orders reduce it (Settings → Stock).
          </DialogDescription>
        </DialogHeader>
        <Field label="Product">
          <SearchSelect
            aria-label="Product"
            value={productId}
            onChange={setProductId}
            options={options.map((p) => productOption(p))}
            placeholder="Search product, SKU or barcode"
          />
        </Field>
        <Field label="Reorder level" hint="Optional - show as Low stock at or below this quantity">
          <Input type="number" min={0} step="any" value={reorder} onChange={(e) => setReorder(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!productId || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} Start tracking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Inline reorder level ----------------
function ReorderCell({ item, canEdit }: { item: StockItem; canEdit: boolean }) {
  const qc = useQueryClient()
  const [value, setValue] = useState(item.reorder_level != null ? String(item.reorder_level) : '')
  const save = useMutation({
    mutationFn: () => api.put(`/stock/${item.id}/reorder-level`, { reorder_level: value === '' ? null : Number(value) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
    onError: (e: Error) => toast.error(e.message),
  })
  if (!canEdit) return <span className="tabular-nums">{qty(item.reorder_level)}</span>
  return (
    <Input
      aria-label={`${item.name} reorder level`}
      type="number"
      min={0}
      step="any"
      className="h-8 w-20 min-w-20 text-right"
      placeholder="-"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== (item.reorder_level != null ? String(item.reorder_level) : '') && save.mutate()}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  )
}

// ---------------- Page ----------------
export default function Stock() {
  const { isAdmin } = usePermission()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | StockStatus>('all')
  const [page, setPage] = useState(1)
  const { sort, sortProps } = useSort('', () => setPage(1))
  const [adjusting, setAdjusting] = useState<{ item: StockItem; mode: Mode } | null>(null)
  const [history, setHistory] = useState<StockItem | 'all' | null>(null)
  const [tracking, setTracking] = useState(false)
  const q = useDebounce(search)

  const stock = useQuery({
    queryKey: ['stock', q, status, page, sort],
    queryFn: () => api.get<StockList>('/stock' + qs({ q, status, page, page_size: 50, sort })),
  })
  const s = stock.data?.summary

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Quantity on hand for products you track. Receive stock, record counts and write-offs - every change is logged."
        actions={
          <>
            <Button variant="outline" onClick={() => setHistory('all')}>
              <History /> History
            </Button>
            {isAdmin && (
              <Button asChild variant="outline">
                <Link to="/stock-receipts/new">
                  <PackageCheck /> Receive stock
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setTracking(true)}>
                <PlusCircle /> Track a product
              </Button>
            )}
          </>
        }
      />

      {s && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tracked products" value={s.tracked} hint={`${s.untracked} not tracked`} icon={Boxes} />
          <StatCard
            label="Low stock"
            value={s.low}
            hint="At or below reorder level"
            icon={AlertTriangle}
            tone={s.low ? 'warning' : 'default'}
          />
          <StatCard label="Out of stock" value={s.out} icon={PackageX} tone={s.out ? 'danger' : 'success'} />
          <StatCard
            label="Stock value"
            value={formatMoney(s.stock_value)}
            hint="At average cost (purchase / sell price until stock is received)"
            icon={DollarSign}
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Name, SKU or scan barcode"
        />
        <div className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatus(f.key)
                setPage(1)
              }}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1 font-medium text-muted-foreground',
                status === f.key && 'bg-card text-foreground shadow-sm',
              )}
            >
              {f.label}
              {f.key === 'low' && s?.low ? ` (${s.low})` : ''}
              {f.key === 'out' && s?.out ? ` (${s.out})` : ''}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {stock.isLoading ? (
          <LoadingRows />
        ) : stock.isError ? (
          <div className="p-4">
            <ErrorState error={stock.error} />
          </div>
        ) : !stock.data?.items.length ? (
          <EmptyState
            icon={Boxes}
            title={s?.tracked ? 'Nothing matches' : 'No tracked products yet'}
            description={
              s?.tracked
                ? undefined
                : 'Click "Track a product", or turn on "Track inventory" on a product - including products synced from your accounting software.'
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <SortTH {...sortProps('name')}>Product</SortTH>
                  <SortTH {...sortProps('sku')}>SKU</SortTH>
                  <SortTH {...sortProps('quantity_on_hand', true)} className="text-right" align="right">
                    On hand
                  </SortTH>
                  <SortTH {...sortProps('reorder_level')} className="text-right" align="right">
                    Reorder at
                  </SortTH>
                  <TH className="text-right">On order</TH>
                  <TH>Status</TH>
                  <SortTH {...sortProps('avg_cost', true)} className="text-right" align="right">
                    Avg cost
                  </SortTH>
                  <TH className="text-right">Value</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {stock.data.items.map((i) => {
                  const canEdit = isAdmin
                  return (
                    <TR key={i.id} className={i.is_active ? '' : 'opacity-60'}>
                      <TD>
                        <div className="flex items-center gap-3">
                          {i.image_url ? (
                            <img
                              src={i.image_url}
                              alt=""
                              className="size-9 shrink-0 rounded-md border object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-9 shrink-0 rounded-md border bg-muted" />
                          )}
                          <div className="min-w-0">
                            <Link to={`/products/${i.id}`} className="font-medium hover:text-primary hover:underline">
                              {i.name}
                            </Link>
                          </div>
                        </div>
                      </TD>
                      <TD className="font-mono text-xs">{i.sku}</TD>
                      <TD className="text-right text-base font-semibold tabular-nums">
                        {qty(i.quantity_on_hand)}
                        {i.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{i.unit}</span>}
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end">
                          <ReorderCell key={`${i.id}-${i.reorder_level}`} item={i} canEdit={isAdmin} />
                        </div>
                      </TD>
                      <TD className="text-right tabular-nums">
                        {i.on_order ? (
                          <span className="font-medium text-blue-700">+{qty(i.on_order)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TD>
                      <TD>
                        <Badge variant={STATUS[i.status].variant}>{STATUS[i.status].label}</Badge>
                      </TD>
                      <TD className="text-right tabular-nums">{formatMoney(i.avg_cost ?? i.purchase_price)}</TD>
                      <TD className="text-right tabular-nums text-muted-foreground">{formatMoney(i.stock_value)}</TD>
                      <TD className="whitespace-nowrap text-right">
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Add stock"
                              onClick={() => setAdjusting({ item: i, mode: 'add' })}
                            >
                              <Plus />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Remove stock"
                              onClick={() => setAdjusting({ item: i, mode: 'remove' })}
                            >
                              <Minus />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Stock count"
                              onClick={() => setAdjusting({ item: i, mode: 'set' })}
                            >
                              <SlidersHorizontal />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" title="History" onClick={() => setHistory(i)}>
                          <History />
                        </Button>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={50} total={stock.data.total} onChange={setPage} />
          </>
        )}
      </Card>

      {adjusting && stock.data && (
        <AdjustDialog
          item={adjusting.item}
          initialMode={adjusting.mode}
          reasons={stock.data.reasons}
          onClose={() => setAdjusting(null)}
        />
      )}
      {history && <HistoryDialog item={history === 'all' ? null : history} onClose={() => setHistory(null)} />}
      {tracking && <TrackDialog onClose={() => setTracking(false)} />}
    </div>
  )
}
