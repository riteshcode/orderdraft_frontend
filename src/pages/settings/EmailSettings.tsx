import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, Clock, Copy, Mail, RefreshCw, Send, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { EmailSettings as EmailData, SenderStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { useMe } from '@/hooks/useMe'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

const KEY = ['email-settings']

const STATUS: Record<SenderStatus, { label: string; variant: BadgeVariant }> = {
  none: { label: 'Not set up', variant: 'secondary' },
  pending: { label: 'Waiting for DNS', variant: 'warning' },
  verified: { label: 'Verified', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success('Copied'),
    () => toast.error('Copy failed'),
  )
}

function SenderCard({ data }: { data: EmailData }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [name, setName] = useState(data.sender.name || '')
  const [email, setEmail] = useState(data.sender.email || '')
  const s = data.sender
  const onDone = (d: EmailData) => qc.setQueryData(KEY, d)
  const onError = (e: Error) => toast.error(e.message)

  const save = useMutation({
    mutationFn: () => api.put<EmailData>('/settings/email/sender', { name: name.trim() || null, email: email.trim() }),
    onSuccess: (d) => {
      onDone(d)
      toast.success(d.sender.status === 'verified' ? 'Sender saved' : 'Sender saved - now add the DNS records below')
    },
    onError,
  })
  const verify = useMutation({
    mutationFn: () => api.post<EmailData>('/settings/email/sender/verify'),
    onSuccess: (d) => {
      onDone(d)
      if (d.sender.status === 'verified') toast.success('Domain verified - emails now go from your address')
      else toast.warning(`Not verified yet: ${(d.missing || []).join(', ')} record not found. DNS can take up to a few hours.`)
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: () => api.del<EmailData>('/settings/email/sender'),
    onSuccess: (d) => {
      onDone(d)
      setEmail('')
      setName('')
      toast.success('Removed - emails will go from OrderDraft')
    },
    onError,
  })

  async function onRemove() {
    const ok = await confirm({
      title: 'Stop sending from your domain?',
      description: 'Emails will go from OrderDraft with your email as Reply-To.',
      confirmText: 'Remove',
      destructive: true,
    })
    if (ok) remove.mutate()
  }

  const st = STATUS[s.status] || STATUS.none
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Send emails from your own address <Badge variant={st.variant}>{st.label}</Badge>
        </CardTitle>
        <CardDescription>
          Order confirmations and invoices go from your business email once your domain is verified. Until then they go from{' '}
          <b>“Your business via OrderDraft”</b> and replies still come to you (Reply-To).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <div>
            <span className="text-muted-foreground">Customers currently see: </span>
            <span className="font-medium break-all">{data.effective_from}</span>
          </div>
          {data.reply_to && (
            <div>
              <span className="text-muted-foreground">Replies go to: </span>
              <span className="font-medium">{data.reply_to}</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From name" hint="e.g. Fresh Farms Orders">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your business name" />
          </Field>
          <Field label="From email" hint="Must be on your own domain (not Gmail / Outlook)">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@yourbusiness.com.au"
            />
          </Field>
        </div>

        {!data.domain_api_configured && (
          <Alert tone="warning">
            Domain verification is not configured on this server yet (POSTMARK_ACCOUNT_TOKEN). Records below are examples.
          </Alert>
        )}

        {s.domain && s.dns.length > 0 && s.status !== 'verified' && (
          <div className="space-y-2">
            <p className="text-sm">
              Add these 2 records in your domain's DNS (GoDaddy, Cloudflare, Crazy Domains...) for <b>{s.domain}</b>, then click
              Verify. You don't need to change your SPF record - the Return-Path record takes care of it.
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <THead>
                  <TR>
                    <TH>Type</TH>
                    <TH>Host / Name</TH>
                    <TH>Value</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {s.dns.map((r) => (
                    <TR key={r.purpose}>
                      <TD>
                        <div className="font-mono text-xs">{r.type}</div>
                        <div className="text-xs text-muted-foreground">{r.purpose}</div>
                      </TD>
                      <TD>
                        <button
                          type="button"
                          className="flex max-w-56 items-start gap-1 text-left font-mono text-xs break-all"
                          onClick={() => copy(r.host)}
                        >
                          {r.host} <Copy className="mt-0.5 size-3 shrink-0" />
                        </button>
                      </TD>
                      <TD>
                        <button
                          type="button"
                          className="flex max-w-72 items-start gap-1 text-left font-mono text-xs break-all"
                          onClick={() => copy(r.value)}
                        >
                          <span className="line-clamp-3">{r.value}</span> <Copy className="mt-0.5 size-3 shrink-0" />
                        </button>
                      </TD>
                      <TD>
                        {r.verified ? (
                          <CheckCircle2 className="size-4 text-green-600" />
                        ) : (
                          <Clock className="size-4 text-amber-500" />
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {s.checked_at && (
              <p className="text-xs text-muted-foreground">
                Last checked {formatDate(s.checked_at)}. We also re-check automatically every few hours.
              </p>
            )}
          </div>
        )}
        {s.status === 'verified' && (
          <Alert tone="success">
            <b>{s.domain}</b> is verified. Emails are signed with DKIM so they land in the inbox, not spam.
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button disabled={save.isPending || !email.trim()} onClick={() => save.mutate()}>
          {save.isPending ? <Spinner /> : <Mail />} Save sender
        </Button>
        {s.domain && s.status !== 'verified' && (
          <Button variant="outline" disabled={verify.isPending} onClick={() => verify.mutate()}>
            {verify.isPending ? <Spinner /> : <RefreshCw />} Verify DNS
          </Button>
        )}
        {s.domain && (
          <Button variant="ghost" disabled={remove.isPending} onClick={onRemove}>
            <Trash2 className="text-destructive" /> Remove
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function OrderEmailCard({ data }: { data: EmailData }) {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const [form, setForm] = useState(data.order_email)
  const [testTo, setTestTo] = useState('')
  useEffect(() => setForm(data.order_email), [data.order_email])

  const save = useMutation({
    mutationFn: () =>
      api.put<EmailData>('/settings/email/order', {
        enabled: form.enabled,
        subject: form.subject || null,
        message: form.message || null,
        cc_other: form.cc_other,
        bcc: form.bcc || null,
      }),
    onSuccess: (d) => {
      qc.setQueryData(KEY, d)
      toast.success('Order email settings saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const test = useMutation({
    mutationFn: () => api.post<{ ok: boolean; to: string }>('/settings/email/test', { to: testTo.trim() || null }),
    onSuccess: (r) => toast.success(`Test email sent to ${r.to}`),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order confirmation email</CardTitle>
        <CardDescription>
          Sent to the customer automatically when you approve their order (with the items, quantities and total).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch id="order_email" checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          <Label htmlFor="order_email">Email customers when an order is approved</Label>
        </div>
        <Field label="Subject" hint="You can use {order_number}, {customer_name}, {business_name}, {po_number}, {delivery_date}">
          <Input
            value={form.subject || ''}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder={form.default_subject}
          />
        </Field>
        <Field label="Message">
          <Textarea
            rows={3}
            value={form.message || ''}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder={form.default_message}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="BCC (your copy)" hint="Optional, comma separated">
            <Input
              value={form.bcc || ''}
              onChange={(e) => setForm({ ...form, bcc: e.target.value })}
              placeholder="orders@yourbusiness.com.au"
            />
          </Field>
          <div className="flex items-center gap-2 pt-6">
            <Switch id="cc_other" checked={form.cc_other} onCheckedChange={(v) => setForm({ ...form, cc_other: v })} />
            <Label htmlFor="cc_other">CC the customer's other emails</Label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-end gap-2">
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Spinner />} Save
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            className="w-56"
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder={me?.email || 'you@example.com'}
          />
          <Button variant="outline" disabled={test.isPending} onClick={() => test.mutate()}>
            {test.isPending ? <Spinner /> : <Send />} Send test
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export function EmailSettings() {
  const email = useQuery({ queryKey: KEY, queryFn: () => api.get<EmailData>('/settings/email') })
  if (email.isLoading) return <LoadingRows rows={4} />
  if (email.isError || !email.data) return <ErrorState error={email.error} />
  return (
    <div className="max-w-3xl space-y-6">
      <SenderCard data={email.data} />
      <OrderEmailCard data={email.data} />
    </div>
  )
}
