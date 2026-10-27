import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Ban, Download, ExternalLink, Pencil, RefreshCw, Send, Wallet } from 'lucide-react'
import { api, downloadFile } from '@/lib/api'
import type { InvoiceDetail as InvoiceDetailData } from '@/lib/types'
import { formatDate, formatDateTime, formatMoney, todayISO } from '@/lib/utils'
import { usePermission } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { InvoiceStatusBadge } from '@/components/common/badges'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { sourceLabel } from '@/lib/providers'

type DialogName = 'send' | 'payment' | 'edit' | null

export default function InvoiceDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { isAdmin } = usePermission()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<DialogName>(null)

  // Dialog form states
  const [sendTo, setSendTo] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISO())
  const [payMethod, setPayMethod] = useState('Bank transfer')
  const [payRef, setPayRef] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const invoice = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<InvoiceDetailData>(`/invoices/${id}`),
  })

  function done(updated: InvoiceDetailData, message: string) {
    qc.setQueryData(['invoice', id], updated)
    qc.invalidateQueries({ queryKey: ['invoices'] })
    setDialog(null)
    toast.success(message)
  }

  const onError = (e: Error) => toast.error(e.message)

  const send = useMutation({
    mutationFn: () => api.post<InvoiceDetailData>(`/invoices/${id}/send`, { to: sendTo || null, message: sendMessage || null }),
    onSuccess: (inv) => done(inv, `Invoice emailed to ${sendTo || inv.customer_email}`),
    onError,
  })
  const pay = useMutation({
    mutationFn: () =>
      api.post<InvoiceDetailData>(`/invoices/${id}/payments`, {
        amount: Number(payAmount),
        paid_on: payDate,
        method: payMethod,
        reference: payRef || null,
      }),
    onSuccess: (inv) => done(inv, 'Payment recorded'),
    onError,
  })
  const edit = useMutation({
    mutationFn: () => api.put<InvoiceDetailData>(`/invoices/${id}`, { due_date: editDue || null, notes: editNotes || null }),
    onSuccess: (inv) => done(inv, 'Invoice updated'),
    onError,
  })
  const voidInv = useMutation({
    mutationFn: () => api.post<InvoiceDetailData>(`/invoices/${id}/void`),
    onSuccess: (inv) => done(inv, 'Invoice voided'),
    onError,
  })
  const refresh = useMutation({
    mutationFn: () => api.post<InvoiceDetailData>(`/invoices/${id}/refresh`),
    onSuccess: (inv) => done(inv, `Status refreshed from ${sourceLabel(inv.source)}`),
    onError,
  })

  if (invoice.isLoading) return <LoadingRows rows={8} />
  if (invoice.isError || !invoice.data) return <ErrorState error={invoice.error} />
  const inv = invoice.data
  const isInternal = inv.source === 'internal'
  const closed = inv.status === 'paid' || inv.status === 'void'

  function openSend() {
    setSendTo(inv.customer_email || '')
    setSendMessage('')
    setDialog('send')
  }
  function openPayment() {
    setPayAmount(String(inv.balance))
    setPayDate(todayISO())
    setPayMethod('Bank transfer')
    setPayRef('')
    setDialog('payment')
  }
  function openEdit() {
    // Draft (bina payment) = poora invoice edit page; baaki = sirf due date / notes
    if (inv.status === 'draft' && inv.amount_paid === 0) return navigate(`/invoices/${inv.id}/edit`)
    setEditDue(inv.due_date || '')
    setEditNotes(inv.notes || '')
    setDialog('edit')
  }
  async function onVoid() {
    if (
      await confirm({
        title: `Void invoice ${inv.number}?`,
        description: 'This cannot be undone.',
        confirmText: 'Void invoice',
        destructive: true,
      })
    )
      voidInv.mutate()
  }
  async function downloadPdf() {
    try {
      await downloadFile(`/invoices/${id}/pdf`, `${inv.number}.pdf`, true)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function submitPayment(e: FormEvent) {
    e.preventDefault()
    const amount = Number(payAmount)
    if (!amount || amount <= 0) return toast.error('Amount 0 se zyada ho')
    if (amount > inv.balance + 0.001) return toast.error(`The amount is more than the balance (${formatMoney(inv.balance)})`)
    pay.mutate()
  }

  return (
    <div>
      <PageHeader
        back={{ to: '/invoices', label: 'Invoices' }}
        title={
          <>
            {inv.number || `Invoice #${inv.id}`}
            <InvoiceStatusBadge status={inv.status} />
            {inv.overdue && <Badge variant="destructive">Overdue</Badge>}
            {isInternal ? <Badge variant="secondary">OrderDraft</Badge> : <Badge variant="info">{sourceLabel(inv.source)}</Badge>}
          </>
        }
        description={inv.customer_name || undefined}
        actions={
          isInternal ? (
            <>
              <Button variant="outline" onClick={downloadPdf}>
                <Download /> PDF
              </Button>
              {isAdmin && !closed && (
                <Button variant="outline" onClick={openEdit}>
                  <Pencil /> Edit
                </Button>
              )}
              {isAdmin && inv.status !== 'void' && (
                <Button variant="outline" onClick={openSend}>
                  <Send /> {inv.sent_at ? 'Resend' : 'Send'}
                </Button>
              )}
              {isAdmin && !closed && (
                <Button onClick={openPayment}>
                  <Wallet /> Record payment
                </Button>
              )}
              {isAdmin && inv.status !== 'void' && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={onVoid}
                  disabled={inv.amount_paid > 0}
                  title={inv.amount_paid > 0 ? 'Has payments' : ''}
                >
                  <Ban /> Void
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                {refresh.isPending ? <Spinner /> : <RefreshCw />} Refresh status
              </Button>
              {inv.external_url && (
                <Button asChild>
                  <a href={inv.external_url} target="_blank" rel="noreferrer">
                    <ExternalLink /> Open in {sourceLabel(inv.source)}
                  </a>
                </Button>
              )}
            </>
          )
        }
      />

      {!isInternal && (
        <Alert tone="info" className="mb-4">
          This invoice lives in {sourceLabel(inv.source)} - send it and record payments there. Status syncs automatically
          {inv.last_synced_at && ` (last synced ${formatDateTime(inv.last_synced_at)})`}.
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* ---- Document look ---- */}
        <Card className="lg:col-span-2">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-wrap justify-between gap-6">
              <div className="space-y-1 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bill to</p>
                <p className="font-semibold">{inv.customer_name || '-'}</p>
                {inv.customer_email && <p className="text-muted-foreground">{inv.customer_email}</p>}
              </div>
              <div className="space-y-1 text-right text-sm">
                <p className="text-lg font-semibold tracking-tight">TAX INVOICE</p>
                <p>
                  <span className="text-muted-foreground">Invoice # </span>
                  {inv.number || '-'}
                </p>
                <p>
                  <span className="text-muted-foreground">Issued </span>
                  {formatDate(inv.issue_date)}
                </p>
                <p className={inv.overdue ? 'font-medium text-destructive' : ''}>
                  <span className="text-muted-foreground">Due </span>
                  {formatDate(inv.due_date)}
                </p>
                {inv.reference && (
                  <p>
                    <span className="text-muted-foreground">Reference </span>
                    {inv.reference}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <THead>
                  <TR>
                    <TH>Item</TH>
                    <TH>Description</TH>
                    <TH className="text-right">Qty</TH>
                    <TH className="text-right">Unit price</TH>
                    <TH className="text-right">GST</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {inv.lines.map((l) => (
                    <TR key={l.id}>
                      <TD className="font-mono text-xs">{l.sku || '-'}</TD>
                      <TD>{l.description}</TD>
                      <TD className="text-right">{l.quantity}</TD>
                      <TD className="text-right">{formatMoney(l.unit_price)}</TD>
                      <TD className="text-right">
                        {formatMoney(l.gst_amount)}
                        {isInternal && (
                          <div className="text-[11px] text-muted-foreground">
                            {l.tax_code || (l.tax_rate ? 'GST' : 'No tax')} · {l.tax_rate}%
                          </div>
                        )}
                      </TD>
                      <TD className="text-right">{formatMoney(l.line_total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(inv.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span>{formatMoney(inv.gst)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
                <span>Total AUD</span>
                <span>{formatMoney(inv.total)}</span>
              </div>
              {inv.amount_paid > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>-{formatMoney(inv.amount_paid)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Balance due</span>
                <span>{formatMoney(inv.balance)}</span>
              </div>
            </div>

            {inv.notes && (
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{inv.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Side info ---- */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {inv.order_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order</span>
                  <Link to={`/orders/${inv.order_id}`} className="text-primary hover:underline">
                    #{inv.order_id}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDateTime(inv.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sent</span>
                <span>{inv.sent_at ? formatDateTime(inv.sent_at) : 'Not sent'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{inv.paid_at ? formatDateTime(inv.paid_at) : '-'}</span>
              </div>
            </CardContent>
          </Card>

          {isInternal && (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {inv.payments.length === 0 && <p className="text-muted-foreground">No payments recorded.</p>}
                {inv.payments.map((p) => (
                  <div key={p.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{formatMoney(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.paid_on)}
                        {p.method && ` · ${p.method}`}
                        {p.reference && ` · ${p.reference}`}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ---- Dialogs ---- */}
      <Dialog open={dialog === 'send'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email invoice</DialogTitle>
            <DialogDescription>The PDF will be attached.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (!sendTo.trim()) return toast.error('Email address daalo')
              send.mutate()
            }}
          >
            <Field label="To">
              <Input type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} />
            </Field>
            <Field label="Message (optional)" hint="Leave empty to use the default message">
              <Textarea rows={4} value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button disabled={send.isPending}>{send.isPending ? <Spinner /> : <Send />} Send</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'payment'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Balance due: {formatMoney(inv.balance)}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" noValidate onSubmit={submitPayment}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (AUD)">
                <Input type="number" step="0.01" min={0} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </Field>
              <Field label="Paid on">
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </Field>
              <Field label="Method">
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option>Bank transfer</option>
                  <option>Card</option>
                  <option>Cash</option>
                  <option>Other</option>
                </Select>
              </Field>
              <Field label="Reference (optional)">
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button disabled={pay.isPending}>{pay.isPending && <Spinner />} Save payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'edit'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit invoice</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              edit.mutate()
            }}
          >
            <Field label="Due date">
              <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
            </Field>
            <Field label="Notes" hint="Printed on the invoice PDF">
              <Textarea rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button disabled={edit.isPending}>{edit.isPending && <Spinner />} Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
