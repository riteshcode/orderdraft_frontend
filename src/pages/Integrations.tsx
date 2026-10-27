import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, CheckCircle2, Copy, FileText, Link2, Mail, RefreshCw, Unplug } from 'lucide-react'
import { api } from '@/lib/api'
import type { AccountingConnection, ImportJob, IntegrationsInfo, PendingOrgs, ProviderInfo, ProviderKey } from '@/lib/types'
import { PROVIDERS, isProvider } from '@/lib/providers'
import { cn, formatDate, formatDateTime, timeAgo } from '@/lib/utils'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Skeleton, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'

const BENEFITS: Record<ProviderKey, string> = {
  xero: 'Draft or approved invoices and quotes. Invoice status flows back automatically.',
  quickbooks: 'Invoices and estimates in QuickBooks Online. Payments flow back to OrderDraft.',
  myob: 'Invoices, quotes or sales orders in your MYOB company file.',
}

/** Brand logo nahi - sirf rangeen initials */
function ProviderMark({ provider, className }: { provider: ProviderKey; className?: string }) {
  const p = PROVIDERS[provider]
  return (
    <div
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white',
        p.color,
        className,
      )}
    >
      {p.initials}
    </div>
  )
}

function useRefresh() {
  const qc = useQueryClient()
  return () => {
    for (const key of ['integrations', 'import-jobs', 'me', 'accounts', 'tax-rates', 'onboarding']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }
}

// ---------------- Organisation / company file picker ----------------
function OrgPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const refresh = useRefresh()
  const orgs = useQuery({
    queryKey: ['integration-orgs'],
    queryFn: () => api.get<PendingOrgs>('/integrations/orgs'),
    enabled: open,
    retry: false,
  })
  const [orgId, setOrgId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (orgs.data?.orgs.length && !orgId) setOrgId(orgs.data.orgs[0].id)
  }, [orgs.data, orgId])

  const choose = useMutation({
    mutationFn: () =>
      api.post<AccountingConnection>('/integrations/org', {
        org_id: orgId,
        username: username.trim() || null,
        password: password || null,
      }),
    onSuccess: (c) => {
      toast.success(`${c.label} connected to ${c.org_name} - first sync is running`)
      refresh()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const data = orgs.data
  const needsLogin = !!data?.login_fields.length

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return toast.error('Choose an organisation')
    choose.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose {data?.provider === 'myob' ? 'company file' : 'organisation'}</DialogTitle>
          <DialogDescription>
            {data ? `Your ${data.label} login has access to more than one. Pick the one this account should use.` : ''}
          </DialogDescription>
        </DialogHeader>
        {orgs.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : orgs.isError ? (
          <Alert tone="error">{(orgs.error as Error).message}</Alert>
        ) : data ? (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="space-y-2" role="radiogroup" aria-label="Organisation">
              {data.orgs.map((o) => (
                <label
                  key={o.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                    orgId === o.id ? 'border-primary bg-accent' : 'hover:bg-muted/40',
                  )}
                >
                  <input type="radio" name="org" value={o.id} checked={orgId === o.id} onChange={() => setOrgId(o.id)} />
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{o.name}</span>
                  {o.requires_login && <Badge variant="secondary">Login</Badge>}
                </label>
              ))}
            </div>
            {needsLogin && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Company file login - only if your company file has its own username / password. Stored encrypted.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Username">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Administrator"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Password">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={choose.isPending}>{choose.isPending ? <Spinner /> : <Link2 />} Connect</Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Connected software details ----------------
function ConnectedPanel({ conn, onChooseOrg }: { conn: AccountingConnection; onChooseOrg: () => void }) {
  const refresh = useRefresh()
  const confirm = useConfirm()
  const jobs = useQuery({ queryKey: ['import-jobs'], queryFn: () => api.get<ImportJob[]>('/imports/jobs') })

  const sync = useMutation({
    mutationFn: () => api.post('/integrations/sync?full=true'),
    onSuccess: () => {
      toast.success('Sync started')
      setTimeout(refresh, 4000)
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const saveSettings = useMutation({
    mutationFn: (body: { auto_sync: boolean; include_all_contacts: boolean }) => api.put('/integrations/settings', body),
    onSuccess: () => {
      toast.success('Saved')
      refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function disconnect() {
    const ok = await confirm({
      title: `Disconnect ${conn.label}?`,
      description: 'Orders will stop going to it. Products, customers and invoices already in OrderDraft stay.',
      confirmText: 'Disconnect',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.post('/integrations/disconnect')
      toast.success(`${conn.label} disconnected`)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const recent = (jobs.data || []).filter((j) => j.source === conn.provider).slice(0, 5)

  if (conn.status === 'pending_org') {
    return (
      <div className="space-y-3">
        <Alert tone="warning" title="Almost there">
          You signed in to {conn.label} - now choose which organisation / company file to use.
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onChooseOrg}>
            <Building2 /> Choose organisation
          </Button>
          <Button variant="outline" className="text-destructive" onClick={disconnect}>
            <Unplug /> Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Organisation</p>
          <p className="font-medium">
            {conn.org_name}
            {conn.org_currency && <span className="ml-1 text-xs font-normal text-muted-foreground">({conn.org_currency})</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Connected since</p>
          <p className="font-medium">{formatDate(conn.connected_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last sync</p>
          <p className="font-medium">{timeAgo(conn.last_sync_at)}</p>
        </div>
      </div>
      {conn.org_currency && conn.org_currency !== 'AUD' && (
        <Alert tone="warning">
          This organisation uses {conn.org_currency}
          {conn.org_country ? ` (${conn.org_country})` : ''}, not AUD. Invoices are created in {conn.org_currency} and Australian
          GST codes won't match - for AU testing use an Australian organisation (Xero Demo Company can be reset to Australia).
        </Alert>
      )}
      {conn.last_sync_status && (
        <Alert
          tone={conn.last_sync_status.startsWith('Failed') || conn.last_sync_status.startsWith('Reconnect') ? 'error' : 'success'}
        >
          {conn.last_sync_status}
        </Alert>
      )}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-sync"
            checked={conn.auto_sync}
            onCheckedChange={(v) => saveSettings.mutate({ auto_sync: v, include_all_contacts: conn.include_all_contacts })}
          />
          <Label htmlFor="auto-sync">Nightly auto-sync</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="all-contacts"
            checked={conn.include_all_contacts}
            onCheckedChange={(v) => saveSettings.mutate({ auto_sync: conn.auto_sync, include_all_contacts: v })}
          />
          <Label htmlFor="all-contacts">Include all contacts (not just customers)</Label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
          {sync.isPending ? <Spinner /> : <RefreshCw />} Sync now
        </Button>
        <Button variant="outline" className="text-destructive" onClick={disconnect}>
          <Unplug /> Disconnect
        </Button>
      </div>
      {recent.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Recent syncs</p>
          <div className="divide-y rounded-lg border text-sm">
            {recent.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="capitalize">{j.kind}</span>
                <span className="text-muted-foreground">
                  +{j.created} new · {j.updated} updated{j.skipped ? ` · ${j.skipped} skipped` : ''}
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(j.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- One provider card ----------------
function ProviderCard({
  provider,
  conn,
  onChooseOrg,
}: {
  provider: ProviderInfo
  conn: AccountingConnection | null
  onChooseOrg: () => void
}) {
  const mine = conn?.provider === provider.key
  const other = conn && !mine ? conn : null

  const connect = useMutation({
    mutationFn: () => api.get<{ url: string }>(`/integrations/${provider.key}/connect-url`),
    onSuccess: (r) => (window.location.href = r.url),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card className={cn(mine && 'border-primary ring-1 ring-primary/30', other && 'opacity-70')}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ProviderMark provider={provider.key} />
          <div className="space-y-1">
            <CardTitle>{provider.label}</CardTitle>
            <CardDescription>{BENEFITS[provider.key]}</CardDescription>
          </div>
        </div>
        {mine && conn?.status === 'connected' && <Badge variant="success">Connected</Badge>}
        {mine && conn?.status === 'pending_org' && <Badge variant="warning">Choose organisation</Badge>}
      </CardHeader>
      <CardContent>
        {mine && conn ? (
          <ConnectedPanel conn={conn} onChooseOrg={onChooseOrg} />
        ) : !provider.configured ? (
          <p className="text-sm text-muted-foreground">Not configured on this platform yet.</p>
        ) : other ? (
          <div className="space-y-2">
            <Button variant="outline" disabled>
              <Link2 /> Connect {PROVIDERS[provider.key].short}
            </Button>
            <p className="text-xs text-muted-foreground">Disconnect {other.label} first to switch.</p>
          </div>
        ) : (
          <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
            {connect.isPending ? <Spinner /> : <Link2 />} Connect {PROVIDERS[provider.key].short}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function InboundCard() {
  const { data: me } = useMe()
  const email = me?.tenant.inbound_email || ''
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4" /> Inbound email
        </CardTitle>
        <CardDescription>Orders forwarded to this address become drafts automatically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2">
          <code className="flex-1 truncate text-sm font-medium">{email}</code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(email)
              toast.success('Copied')
            }}
          >
            <Copy /> Copy
          </Button>
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Open your orders inbox (Outlook / Gmail).</li>
          <li>Create a rule: forward every email from customers (or to orders@) to the address above.</li>
          <li>PDF purchase orders and voice-note attachments are read automatically.</li>
          <li>Send a test order - it shows up under Orders in under a minute.</li>
        </ol>
      </CardContent>
    </Card>
  )
}

export default function Integrations() {
  const [params, setParams] = useSearchParams()
  const shown = useRef(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const info = useQuery({ queryKey: ['integrations'], queryFn: () => api.get<IntegrationsInfo>('/integrations') })

  // Software login se wapas aaye - ek baar toast / org picker
  useEffect(() => {
    if (shown.current) return
    const connected = params.get('connected')
    const error = params.get('error')
    const chooseOrg = params.get('choose_org')
    if (!connected && !error && !chooseOrg) return
    shown.current = true
    const name = (key: string | null) => (isProvider(key) ? PROVIDERS[key].short : 'Accounting software')
    if (connected) toast.success(`${name(connected)} connected - first sync is running`)
    if (error) {
      const msg = params.get('message')
      toast.error(
        error === 'state'
          ? 'Login link expired - please try again.'
          : msg || `${name(error)} connection failed. Please try again.`,
      )
    }
    if (chooseOrg) setPickerOpen(true)
    setParams({}, { replace: true })
  }, [params, setParams])

  const data = info.data
  const conn = data?.connection || null

  return (
    <div>
      <PageHeader title="Integrations" description="Connect your accounting software and order inbox." />

      <section className="mb-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Accounting software</h2>
          <p className="text-sm text-muted-foreground">
            One accounting software per account - products, customers and invoices sync with it. To switch, disconnect the current
            one first. Each organisation can only be linked to one OrderDraft account.
          </p>
        </div>
        {info.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        ) : info.isError ? (
          <Alert tone="error">{(info.error as Error).message}</Alert>
        ) : data ? (
          <>
            {conn && (
              <div className="grid gap-4">
                {data.providers
                  .filter((p) => p.key === conn.provider)
                  .map((p) => (
                    <ProviderCard key={p.key} provider={p} conn={conn} onChooseOrg={() => setPickerOpen(true)} />
                  ))}
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-3">
              {data.providers
                .filter((p) => p.key !== conn?.provider)
                .map((p) => (
                  <ProviderCard key={p.key} provider={p} conn={conn} onChooseOrg={() => setPickerOpen(true)} />
                ))}
            </div>
            {!conn && (
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {[
                  'Import items as products and contacts as customers',
                  'Nightly sync keeps prices and new customers up to date',
                  'Approved orders become invoices, quotes or sales orders',
                  'Chart of accounts and tax rates come across too',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 text-green-600" /> {t}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <InboundCard />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" /> Coming soon
            </CardTitle>
            <CardDescription>Use Custom API or CSV export until these are ready.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {['Unleashed', 'Cin7', 'Reckon'].map((n) => (
              <Button key={n} variant="outline" disabled>
                {n}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <OrgPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  )
}
