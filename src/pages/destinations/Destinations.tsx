import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Code2, FileText, FlaskConical, Pencil, Plus, PlusCircle, Send, Trash2, Webhook, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { AccountingOptions, Destination, DestinationType } from '@/lib/types'
import { DOC_TYPE_LABELS } from '@/lib/providers'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, LoadingRows } from '@/components/common/states'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Separator, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'

const MASK = '••••••••'

const TYPES: { type: DestinationType; label: string; description: string; icon: typeof Send }[] = [
  {
    type: 'accounting',
    label: 'Accounting software',
    description: 'Invoice, quote or sales order in your connected Xero, QuickBooks or MYOB.',
    icon: FileText,
  },
  {
    type: 'internal_invoice',
    label: 'OrderDraft Invoice',
    description: 'We create a tax invoice (PDF) and email it to the customer.',
    icon: Send,
  },
  {
    type: 'custom_api',
    label: 'Custom API',
    description: 'Send to your own ERP / system REST API with field mapping.',
    icon: Code2,
  },
  { type: 'webhook', label: 'Webhook', description: 'POST our standard JSON to Zapier, Make or any URL.', icon: Webhook },
]

const TYPE_ICON: Record<DestinationType, typeof Send> = {
  accounting: FileText,
  internal_invoice: Send,
  custom_api: Code2,
  webhook: Webhook,
}

const DOC_TYPES: Record<string, string> = DOC_TYPE_LABELS

const ORDER_PATHS = [
  'order_id',
  'po_number',
  'delivery_date',
  'notes',
  'total',
  'customer.code',
  'customer.name',
  'customer.email',
  'customer.external_id',
  'source_channel',
  'approved_at',
]
const LINE_PATHS = ['sku', 'product_name', 'quantity', 'unit', 'unit_price', 'line_total', 'taxable', 'original_text']

type Pair = { key: string; value: string }
type Config = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const toPairs = (obj: unknown): Pair[] =>
  obj && typeof obj === 'object'
    ? Object.entries(obj as Record<string, unknown>).map(([key, value]) => ({ key, value: str(value) }))
    : []
const fromPairs = (pairs: Pair[]) =>
  Object.fromEntries(pairs.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p.value.trim()]))

function summary(d: Destination) {
  const c = d.config
  if (d.type === 'accounting') return DOC_TYPES[str(c.document_type)] || 'Draft invoice'
  if (d.type === 'internal_invoice') return c.auto_email ? 'Emails invoice to customer' : 'Creates invoice (no email)'
  return str(c.url)
}

/** Key/value rows editor (headers, field maps) */
function PairsEditor({
  pairs,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  listId,
}: {
  pairs: Pair[]
  onChange: (p: Pair[]) => void
  keyPlaceholder: string
  valuePlaceholder: string
  listId?: string
}) {
  return (
    <div className="space-y-2">
      {pairs.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={p.key}
            placeholder={keyPlaceholder}
            onChange={(e) => onChange(pairs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
          />
          <span className="text-muted-foreground">←</span>
          <Input
            value={p.value}
            placeholder={valuePlaceholder}
            list={listId}
            onChange={(e) => onChange(pairs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
          />
          <Button variant="ghost" size="icon" onClick={() => onChange(pairs.filter((_, j) => j !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...pairs, { key: '', value: '' }])}>
        <Plus /> Add row
      </Button>
    </div>
  )
}

/** Accounting software destination - software connection se aata hai (Xero / QuickBooks / MYOB) */
function AccountingFields({ config, set }: { config: Config; set: (k: string, v: unknown) => void }) {
  const options = useQuery({
    queryKey: ['integration-options'],
    queryFn: () => api.get<AccountingOptions>('/integrations/options'),
  })
  const o = options.data
  const connected = !!o?.provider
  const docTypes: Record<string, string> =
    connected && Object.keys(o.doc_types).length ? (o.doc_types as Record<string, string>) : DOC_TYPES
  const docType = str(config.document_type) || Object.keys(docTypes)[0] || 'invoice_draft'
  const label = o?.label || 'your accounting software'
  const accountCode = str(config.default_account_code)
  const taxCode = str(config.default_tax_type)

  return (
    <div className="space-y-4">
      {options.isLoading ? (
        <Spinner />
      ) : connected ? (
        <Alert tone="info">
          Orders go to <b>{o.label}</b>. Switch software on the{' '}
          <Link to="/integrations" className="underline">
            Integrations
          </Link>{' '}
          page - this destination keeps working.
        </Alert>
      ) : (
        <Alert tone="warning" title="No accounting software connected">
          <Link to="/integrations" className="underline">
            Connect Xero, QuickBooks or MYOB
          </Link>{' '}
          before orders can be sent.
        </Alert>
      )}
      <Field label={`Create in ${connected ? o.label : 'software'} as`}>
        <Select value={docType} onChange={(e) => set('document_type', e.target.value)}>
          {Object.entries(docTypes).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
          {!(docType in docTypes) && <option value={docType}>{DOC_TYPES[docType] || docType}</option>}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default sales account" hint="Used when a product has no account code">
          {o?.accounts.length ? (
            <Select value={accountCode} onChange={(e) => set('default_account_code', e.target.value)}>
              <option value="">Software default</option>
              {o.accounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} - {a.name}
                </option>
              ))}
              {accountCode && !o.accounts.some((a) => a.code === accountCode) && (
                <option value={accountCode}>{accountCode}</option>
              )}
            </Select>
          ) : (
            <Input value={accountCode} placeholder="200" onChange={(e) => set('default_account_code', e.target.value)} />
          )}
        </Field>
        <Field label="Default tax rate" hint="Used when a product has no tax rate">
          {o?.tax_rates.length ? (
            <Select value={taxCode} onChange={(e) => set('default_tax_type', e.target.value)}>
              <option value="">Software default</option>
              {o.tax_rates.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.rate}%)
                </option>
              ))}
              {taxCode && !o.tax_rates.some((t) => t.code === taxCode) && <option value={taxCode}>{taxCode}</option>}
            </Select>
          ) : (
            <Input value={taxCode} placeholder="Software default" onChange={(e) => set('default_tax_type', e.target.value)} />
          )}
        </Field>
      </div>
      {docType.startsWith('invoice') && (
        <div className="flex items-center gap-2">
          <Switch id="acc-email" checked={!!config.send_email} onCheckedChange={(v) => set('send_email', v)} />
          <Label htmlFor="acc-email">Email the invoice to the customer from {label}</Label>
        </div>
      )}
    </div>
  )
}

function CustomApiFields({
  config,
  set,
  editingId,
}: {
  config: Config
  set: (k: string, v: unknown) => void
  editingId: number | null
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const authType = str(config.auth_type) || 'none'
  const bodyMode = str(config.body_mode) || 'standard'

  async function loadPreview() {
    try {
      setPreview(JSON.stringify(await api.get(`/destinations/${editingId}/preview`), null, 2))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="API URL *">
          <Input
            value={str(config.url)}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://erp.example.com/api/orders"
          />
        </Field>
        <Field label="Method">
          <Select value={str(config.method) || 'POST'} onChange={(e) => set('method', e.target.value)}>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Authentication">
          <Select value={authType} onChange={(e) => set('auth_type', e.target.value)}>
            <option value="none">None</option>
            <option value="bearer">Bearer token</option>
            <option value="api_key">API key header</option>
            <option value="basic">Basic (user:pass)</option>
          </Select>
        </Field>
        {authType !== 'none' && (
          <Field
            label={authType === 'basic' ? 'user:password' : authType === 'api_key' ? 'API key' : 'Token'}
            hint="Stored encrypted"
          >
            <Input
              type="password"
              value={str(config.auth_value)}
              onFocus={(e) => e.target.value === MASK && set('auth_value', '')}
              onBlur={(e) => !e.target.value && editingId && set('auth_value', MASK)}
              onChange={(e) => set('auth_value', e.target.value)}
            />
          </Field>
        )}
        {authType === 'api_key' && (
          <Field label="Header name">
            <Input value={str(config.api_key_header) || 'X-API-Key'} onChange={(e) => set('api_key_header', e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Extra headers">
        <PairsEditor
          pairs={(config._headers as Pair[]) || []}
          onChange={(p) => set('_headers', p)}
          keyPlaceholder="Header"
          valuePlaceholder="Value"
        />
      </Field>
      <Separator />
      <Field label="Request body">
        <Select value={bodyMode} onChange={(e) => set('body_mode', e.target.value)}>
          <option value="standard">Standard OrderDraft JSON</option>
          <option value="mapped">Map to my API's fields</option>
        </Select>
      </Field>
      {bodyMode === 'mapped' && (
        <div className="space-y-4 rounded-lg bg-muted/40 p-3">
          <datalist id="order-paths">
            {ORDER_PATHS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <datalist id="line-paths">
            {LINE_PATHS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <Field label="Order fields" hint="Your API field ← our field (dot paths like customer.code)">
            <PairsEditor
              pairs={(config._field_map as Pair[]) || []}
              onChange={(p) => set('_field_map', p)}
              keyPlaceholder="their_field"
              valuePlaceholder="our field"
              listId="order-paths"
            />
          </Field>
          <Field label="Lines array key">
            <Input value={str(config.lines_key) || 'lines'} onChange={(e) => set('lines_key', e.target.value)} />
          </Field>
          <Field label="Line fields">
            <PairsEditor
              pairs={(config._line_field_map as Pair[]) || []}
              onChange={(p) => set('_line_field_map', p)}
              keyPlaceholder="their_field"
              valuePlaceholder="our field"
              listId="line-paths"
            />
          </Field>
        </div>
      )}
      <Field label="Order id in response (optional)" hint="Dot path to save their order number, e.g. data.order_number">
        <Input value={str(config.response_id_path)} onChange={(e) => set('response_id_path', e.target.value)} />
      </Field>
      {editingId && (
        <div className="space-y-2">
          <Button variant="outline" size="sm" onClick={loadPreview}>
            Preview body (saved settings)
          </Button>
          {preview && <pre className="max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{preview}</pre>}
        </div>
      )}
    </div>
  )
}

function DestinationDialog({ destination, onClose }: { destination: Destination | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [type, setType] = useState<DestinationType | null>(destination?.type || null)
  const [name, setName] = useState(destination?.name || '')
  const [autoSend, setAutoSend] = useState(destination?.auto_send ?? true)
  const [isActive, setIsActive] = useState(destination?.is_active ?? true)
  // Editor-friendly config: maps ko rows mein badal ke rakhte hain (_headers etc.)
  const [config, setConfig] = useState<Config>(() => {
    const c = destination?.config || {}
    return {
      ...c,
      _headers: toPairs(c.headers),
      _field_map: toPairs(c.field_map),
      _line_field_map: toPairs(c.line_field_map),
    }
  })
  const [error, setError] = useState('')
  const set = (k: string, v: unknown) => setConfig((c) => ({ ...c, [k]: v }))

  function chooseType(t: DestinationType) {
    setType(t)
    if (!name) setName(TYPES.find((x) => x.type === t)!.label)
    if (t === 'internal_invoice' && config.auto_email === undefined) set('auto_email', true)
  }

  const save = useMutation({
    mutationFn: () => {
      const { _headers, _field_map, _line_field_map, ...rest } = config
      const finalConfig: Config = { ...rest }
      if (type === 'custom_api') {
        finalConfig.headers = fromPairs((_headers as Pair[]) || [])
        finalConfig.field_map = fromPairs((_field_map as Pair[]) || [])
        finalConfig.line_field_map = fromPairs((_line_field_map as Pair[]) || [])
      }
      const body = { name: name.trim(), type, config: finalConfig, auto_send: autoSend, is_active: isActive }
      return destination ? api.put(`/destinations/${destination.id}`, body) : api.post('/destinations', body)
    },
    onSuccess: () => {
      toast.success('Destination saved')
      qc.invalidateQueries({ queryKey: ['destinations'] })
      qc.invalidateQueries({ queryKey: ['onboarding'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit() {
    if (!name.trim()) return setError('Name is required')
    if ((type === 'webhook' || type === 'custom_api') && !/^https?:\/\//.test(str(config.url)))
      return setError('URL http:// ya https:// se start ho')
    setError('')
    save.mutate()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{destination ? 'Edit destination' : 'Add destination'}</DialogTitle>
          <DialogDescription>
            {type ? TYPES.find((t) => t.type === type)?.description : 'Where should approved orders go?'}
          </DialogDescription>
        </DialogHeader>

        {!type ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => chooseType(t.type)}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-accent"
              >
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <t.icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium">{t.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            {type === 'accounting' && <AccountingFields config={config} set={set} />}

            {type === 'internal_invoice' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch id="ae" checked={!!config.auto_email} onCheckedChange={(v) => set('auto_email', v)} />
                  <Label htmlFor="ae">Email the invoice PDF to the customer automatically</Label>
                </div>
                <Alert tone="info">
                  Invoice number, GST and bank details are set in{' '}
                  <Link to="/settings/invoice" className="underline">
                    Settings → Invoices
                  </Link>
                  .
                </Alert>
              </div>
            )}

            {type === 'custom_api' && <CustomApiFields config={config} set={set} editingId={destination?.id || null} />}

            {type === 'webhook' && (
              <div className="space-y-4">
                <Field label="Webhook URL *">
                  <Input
                    value={str(config.url)}
                    onChange={(e) => set('url', e.target.value)}
                    placeholder="https://hooks.zapier.com/..."
                  />
                </Field>
                <Field label="Signing secret" hint="Leave empty to auto-generate. Stored encrypted.">
                  <Input
                    type="password"
                    value={str(config.secret)}
                    onFocus={(e) => e.target.value === MASK && set('secret', '')}
                    onBlur={(e) => !e.target.value && destination && set('secret', MASK)}
                    onChange={(e) => set('secret', e.target.value)}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Every request has header <code className="rounded bg-muted px-1">X-OrderDraft-Signature</code> = HMAC-SHA256 of
                  the raw body with this secret (hex). Verify it on your server.
                </p>
              </div>
            )}

            <Separator />
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch id="as" checked={autoSend} onCheckedChange={setAutoSend} />
                <Label htmlFor="as">Send automatically on approve</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ia" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="ia">Active</Label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {type && !destination && (
            <Button variant="ghost" className="mr-auto" onClick={() => setType(null)}>
              Change type
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {type && (
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending && <Spinner />} Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Destinations() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Destination | null | 'new'>(null)
  const [testing, setTesting] = useState<number | null>(null)
  const list = useQuery({ queryKey: ['destinations'], queryFn: () => api.get<Destination[]>('/destinations') })

  async function test(d: Destination) {
    setTesting(d.id)
    try {
      const r = await api.post<{ ok: boolean; message: string }>(`/destinations/${d.id}/test`)
      if (r.ok) toast.success(r.message)
      else toast.error(r.message)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTesting(null)
    }
  }

  async function remove(d: Destination) {
    const ok = await confirm({
      title: `Delete ${d.name}?`,
      description: 'Orders will no longer be sent here. If it has export history it will be deactivated instead.',
      confirmText: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.del(`/destinations/${d.id}`)
      qc.invalidateQueries({ queryKey: ['destinations'] })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Destinations"
        description="Approved orders are sent to every destination with auto-send on."
        actions={
          <Button onClick={() => setEditing('new')}>
            <PlusCircle /> Add destination
          </Button>
        }
      />

      {list.isLoading ? (
        <LoadingRows rows={3} />
      ) : !list.data?.length ? (
        <Card>
          <EmptyState
            icon={Send}
            title="No destinations yet"
            description="Add your accounting software (Xero, QuickBooks, MYOB), OrderDraft invoices, your API or a webhook. Without one, approved orders stay here (CSV export still works)."
            action={<Button onClick={() => setEditing('new')}>Add destination</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.data.map((d) => {
            const Icon = TYPE_ICON[d.type] || Send
            return (
              <Card key={d.id} className={cn(!d.is_active && 'opacity-60')}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.type_label}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant={d.is_active ? 'success' : 'secondary'}>{d.is_active ? 'Active' : 'Inactive'}</Badge>
                      <Badge variant={d.auto_send ? 'info' : 'outline'}>{d.auto_send ? 'Auto-send' : 'Manual only'}</Badge>
                    </div>
                  </div>
                  <p className="truncate rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground" title={summary(d)}>
                    {summary(d)}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => test(d)} disabled={testing === d.id}>
                      {testing === d.id ? <Spinner className="size-3.5" /> : <FlaskConical />} Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(d)}>
                      <Pencil /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => remove(d)}>
                      <Trash2 /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {editing && (
        <DestinationDialog
          key={editing === 'new' ? 'new' : editing.id}
          destination={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
