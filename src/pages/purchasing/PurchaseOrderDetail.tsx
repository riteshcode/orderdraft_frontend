import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Ban, CheckCircle2, FileDown, Lock, Mail, PackageCheck, Pencil, RotateCcw, ScanLine, Send, Trash2 } from 'lucide-react'
import { api, downloadFile } from '@/lib/api'
import type { PODetail, POLine } from '@/lib/types'
import { cn, formatDate, formatDateTime, formatMoney, todayISO } from '@/lib/utils'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { POStatusBadge } from '@/components/common/badges'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { HistoryPanel } from '@/components/common/ActivityList'

const q = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

// ---------------- Receive ----------------
function ReceiveDialog({ po, onClose, onDone }: { po: PODetail; onClose: () => void; onDone: (p: PODetail) => void }) {
  const open = po.lines.filter((l) => l.outstanding > 0)
  const [qty, setQty] = useState<Record<number, string>>(() => Object.fromEntries(open.map((l) => [l.id, q(l.outstanding)])))
  const [cost, setCost] = useState<Record<number, string>>({})
  const [reference, setReference] = useState('')
  const [receivedOn, setReceivedOn] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [scan, setScan] = useState('')
  const [scanned, setScanned] = useState<Set<number>>(new Set())

  function onScan() {
    const code = scan.trim().toLowerCase()
    if (!code) return
    const line = open.find(
      (l) => l.barcode?.toLowerCase() === code || l.sku?.toLowerCase() === code || l.supplier_sku?.toLowerCase() === code,
    )
    if (!line) return toast.error(`${scan} is not on this PO`)
    // scan mode: pehla scan 1 se shuru, phir har scan +1
    setQty((m) => ({ ...m, [line.id]: String(scanned.has(line.id) ? (Number(m[line.id]) || 0) + 1 : 1) }))
    setScanned((s) => new Set(s).add(line.id))
    setScan('')
  }

  const save = useMutation({
    mutationFn: () =>
      api.post<PODetail>(`/purchase-orders/${po.id}/receive`, {
        reference: reference || null,
        received_on: receivedOn || null,
        notes: notes || null,
        lines: open.map((l) => ({
          po_line_id: l.id,
          quantity: Number(qty[l.id]) || 0,
          unit_cost: cost[l.id] === undefined || cost[l.id] === '' ? null : Number(cost[l.id]),
        })),
      }),
    onSuccess: (p) => {
      toast.success(
        p.status === 'received' ? `${p.number} fully received - stock updated` : 'Stock received - PO is part received',
      )
      onDone(p)
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const total = open.reduce((s, l) => s + (Number(qty[l.id]) || 0), 0)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Receive stock · {po.number}</DialogTitle>
          <DialogDescription>
            Enter what actually arrived. Tracked products go into stock and their average cost updates.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Supplier docket / invoice no">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="Received on">
            <Input type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
          </Field>
          <Field label="Scan to count">
            <div className="flex items-center gap-2">
              <ScanLine className="size-4 shrink-0 text-muted-foreground" />
              <Input
                aria-label="Scan barcode"
                placeholder="Scan barcode"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onScan()
                  }
                }}
              />
            </div>
          </Field>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH className="text-right">Outstanding</TH>
                <TH>Received now</TH>
                <TH>Cost (ex GST)</TH>
              </TR>
            </THead>
            <TBody>
              {open.map((l) => {
                const now = Number(qty[l.id]) || 0
                return (
                  <TR key={l.id}>
                    <TD>
                      <div className="font-medium">{l.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {[l.sku, l.supplier_sku].filter(Boolean).join(' · ')}
                        {!l.tracked && l.product_id && ' · stock not tracked'}
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {q(l.outstanding)} {l.unit || ''}
                    </TD>
                    <TD>
                      <Input
                        aria-label={`${l.description} received`}
                        type="number"
                        min={0}
                        step="any"
                        className={cn('w-24 min-w-24', now > l.outstanding && 'border-amber-400')}
                        value={qty[l.id] ?? ''}
                        onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                      />
                      {now > l.outstanding && <div className="text-xs text-amber-700">More than ordered</div>}
                    </TD>
                    <TD>
                      <Input
                        aria-label={`${l.description} cost`}
                        type="number"
                        min={0}
                        step="any"
                        className="w-24 min-w-24"
                        placeholder={String(l.unit_cost)}
                        value={cost[l.id] ?? ''}
                        onChange={(e) => setCost({ ...cost, [l.id]: e.target.value })}
                      />
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </div>
        <Field label="Notes">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Damaged boxes, short delivery..."
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || total <= 0} onClick={() => save.mutate()}>
            {save.isPending ? <Spinner /> : <PackageCheck />} Receive {q(total)} items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Send ----------------
function SendDialog({ po, onClose, onDone }: { po: PODetail; onClose: () => void; onDone: (p: PODetail) => void }) {
  const [to, setTo] = useState(po.supplier.email || '')
  const [message, setMessage] = useState('')
  const send = useMutation({
    mutationFn: () =>
      api.post<PODetail>(`/purchase-orders/${po.id}/send`, {
        to: to.trim() === (po.supplier.email || '') ? null : to.trim(),
        message: message || null,
      }),
    onSuccess: (p) => {
      toast.success(`${p.number} emailed to ${p.sent_to}`)
      onDone(p)
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email {po.number}</DialogTitle>
          <DialogDescription>The PO goes as a PDF from your sender address (Settings → Email).</DialogDescription>
        </DialogHeader>
        <Field label="To" hint={po.supplier.cc_emails ? `CC: ${po.supplier.cc_emails}` : undefined}>
          <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Message" hint="Optional - a standard message is used when empty">
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!to.trim() || send.isPending} onClick={() => send.mutate()}>
            {send.isPending ? <Spinner /> : <Send />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Page ----------------
export default function PurchaseOrderDetail() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { isAdmin } = usePermission()
  const [dialog, setDialog] = useState<'receive' | 'send' | null>(null)
  const key = ['purchase-orders', 'detail', id]
  const po = useQuery({ queryKey: key, queryFn: () => api.get<PODetail>(`/purchase-orders/${id}`) })

  const done = (p: PODetail) => {
    qc.setQueryData(key, p)
    qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    qc.invalidateQueries({ queryKey: ['stock'] })
    qc.invalidateQueries({ queryKey: ['products'] })
  }
  const status = useMutation({
    mutationFn: (action: string) => api.post<PODetail>(`/purchase-orders/${id}/status`, { action }),
    onSuccess: done,
    onError: (e: Error) => toast.error(e.message),
  })
  async function act(action: 'cancel' | 'close' | 'reopen' | 'mark_sent') {
    if (action === 'cancel' || action === 'close') {
      const ok = await confirm({
        title: action === 'cancel' ? 'Cancel this purchase order?' : 'Close with items still outstanding?',
        description:
          action === 'cancel'
            ? 'Nothing has been received; the PO stays for your records.'
            : 'The rest will not be received. You can reopen it later.',
        confirmText: action === 'cancel' ? 'Cancel PO' : 'Close PO',
        destructive: true,
      })
      if (!ok) return
    }
    status.mutate(action)
  }
  async function remove() {
    const ok = await confirm({ title: 'Delete this draft?', confirmText: 'Delete', destructive: true })
    if (!ok) return
    try {
      await api.del(`/purchase-orders/${id}`)
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      navigate('/purchase-orders')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (po.isLoading) return <LoadingRows rows={6} />
  if (po.isError || !po.data) return <ErrorState error={po.error} />
  const p = po.data
  const receivable = ['draft', 'sent', 'partial'].includes(p.status) && p.lines.some((l: POLine) => l.outstanding > 0)

  return (
    <div>
      <PageHeader
        back={{ to: '/purchase-orders', label: 'Purchase orders' }}
        title={
          <>
            {p.number} <POStatusBadge status={p.status} />
            {p.overdue && <Badge variant="destructive">Late</Badge>}
          </>
        }
        description={
          <>
            <Link to={`/suppliers/${p.supplier_id}`} className="text-primary hover:underline">
              {p.supplier_name}
            </Link>{' '}
            · ordered {formatDate(p.order_date)}
            {p.expected_date && ` · expected ${formatDate(p.expected_date)}`}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => downloadFile(`/purchase-orders/${id}/pdf`, `${p.number}.pdf`, true)}>
              <FileDown /> PDF
            </Button>
            {isAdmin && p.status === 'draft' && (
              <Button asChild variant="outline">
                <Link to={`/purchase-orders/${id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            )}
            {isAdmin && ['draft', 'sent', 'partial'].includes(p.status) && (
              <Button variant={p.status === 'draft' ? 'default' : 'outline'} onClick={() => setDialog('send')}>
                <Mail /> {p.sent_at ? 'Resend' : 'Email supplier'}
              </Button>
            )}
            {isAdmin && p.status === 'draft' && (
              <Button variant="ghost" onClick={() => act('mark_sent')} title="Sent another way (phone, portal)">
                <CheckCircle2 /> Mark sent
              </Button>
            )}
            {isAdmin && receivable && (
              <Button variant={p.status === 'draft' ? 'outline' : 'default'} onClick={() => setDialog('receive')}>
                <PackageCheck /> Receive stock
              </Button>
            )}
            {isAdmin && p.status === 'partial' && (
              <Button variant="ghost" onClick={() => act('close')}>
                <Lock /> Close
              </Button>
            )}
            {isAdmin && p.status === 'closed' && (
              <Button variant="ghost" onClick={() => act('reopen')}>
                <RotateCcw /> Reopen
              </Button>
            )}
            {isAdmin && p.status === 'sent' && (
              <Button variant="ghost" onClick={() => act('cancel')}>
                <Ban className="text-destructive" /> Cancel
              </Button>
            )}
            {isAdmin && p.status === 'draft' && (
              <Button variant="ghost" onClick={remove} title="Delete draft">
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </>
        }
      />

      {p.sent_at && (
        <Alert tone="info" className="mb-4">
          Sent to {p.sent_to || 'supplier'} on {formatDateTime(p.sent_at)}
        </Alert>
      )}

      <Card className="mb-6">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH>Supplier code</TH>
                <TH className="text-right">Ordered</TH>
                <TH className="text-right">Received</TH>
                <TH className="text-right">Cost</TH>
                <TH className="text-right">GST</TH>
                <TH className="text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {p.lines.map((l) => (
                <TR key={l.id}>
                  <TD>
                    <div className="font-medium">{l.description}</div>
                    {l.sku && <div className="font-mono text-xs text-muted-foreground">{l.sku}</div>}
                  </TD>
                  <TD className="font-mono text-xs">{l.supplier_sku || '-'}</TD>
                  <TD className="text-right tabular-nums">
                    {q(l.quantity)} {l.unit || ''}
                    {l.below_min && (
                      <div className="text-xs font-medium text-amber-600" title="Supplier's minimum order quantity">
                        Below min {q(l.min_order_qty ?? 0)}
                      </div>
                    )}
                  </TD>
                  <TD
                    className={cn(
                      'text-right tabular-nums',
                      l.quantity_received >= l.quantity ? 'text-green-700' : l.quantity_received > 0 && 'text-amber-700',
                    )}
                  >
                    {q(l.quantity_received)}
                  </TD>
                  <TD className="text-right tabular-nums">{formatMoney(l.unit_cost)}</TD>
                  <TD className="text-right tabular-nums">{l.tax_rate}%</TD>
                  <TD className="text-right tabular-nums">{formatMoney(l.line_total)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="ml-auto max-w-xs space-y-1 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal (ex GST)</span>
              <span className="tabular-nums">{formatMoney(p.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST</span>
              <span className="tabular-nums">{formatMoney(p.gst)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(p.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deliveries received</CardTitle>
          </CardHeader>
          <CardContent>
            {!p.receipts.length ? (
              <p className="text-sm text-muted-foreground">Nothing received yet.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {p.receipts.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{r.number}</span>
                      <span className="ml-2 text-muted-foreground">{formatDate(r.received_on)}</span>
                      {r.reference && <div className="text-xs text-muted-foreground">Docket {r.reference}</div>}
                    </div>
                    <span className="tabular-nums">{formatMoney(r.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {(p.notes || p.deliver_to || p.reference) && (
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.reference && <p>Reference: {p.reference}</p>}
              {p.deliver_to && <p className="whitespace-pre-line">Deliver to: {p.deliver_to}</p>}
              {p.notes && <p className="whitespace-pre-line">Notes: {p.notes}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <HistoryPanel entity="purchase_order" id={p.id} />
      </div>

      {dialog === 'receive' && <ReceiveDialog po={p} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === 'send' && <SendDialog po={p} onClose={() => setDialog(null)} onDone={done} />}
    </div>
  )
}
