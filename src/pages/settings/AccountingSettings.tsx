import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CloudDownload, Pencil, PlusCircle } from 'lucide-react'
import { api } from '@/lib/api'
import type { AccountClass, AccountCode, TaxRate } from '@/lib/types'
import { useMe, usePermission } from '@/hooks/useMe'
import { useAccounts, useTaxRates } from '@/hooks/useAccounting'
import { isProvider, PROVIDERS, sourceLabel } from '@/lib/providers'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

const CLASSES: AccountClass[] = ['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY']
const APPLIES = { sales: 'Sales', purchases: 'Purchases', both: 'Sales & purchases' } as const

function SourceBadge({ source }: { source: AccountCode['source'] }) {
  return source === 'manual' ? <Badge variant="secondary">Manual</Badge> : <Badge variant="info">{sourceLabel(source)}</Badge>
}

// ---------------- Account dialog ----------------
type AccForm = { code: string; name: string; account_class: AccountClass; is_active: boolean }

function AccountDialog({ account, open, onClose }: { account: AccountCode | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<AccForm>({ code: '', name: '', account_class: 'REVENUE', is_active: true })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(
      account
        ? { code: account.code, name: account.name, account_class: account.account_class, is_active: account.is_active }
        : { code: '', name: '', account_class: 'REVENUE', is_active: true },
    )
  }, [open, account])

  const save = useMutation({
    mutationFn: (body: AccForm) =>
      account
        ? api.put<AccountCode>(`/accounting/accounts/${account.id}`, body)
        : api.post<AccountCode>('/accounting/accounts', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success(account ? 'Account updated' : 'Account added')
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) return setError('Enter both a code and a name')
    save.mutate({ ...form, code: form.code.trim(), name: form.name.trim() })
  }

  const fromSoftware = !!account && account.source !== 'manual'
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit account' : 'Add account code'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          {fromSoftware && (
            <Alert tone="info">
              Imported from {sourceLabel(account?.source)} - the code can only be changed there, and the next sync overwrites
              other changes.
            </Alert>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={fromSoftware}
                placeholder="200"
                autoFocus
              />
            </Field>
            <Field label="Name" className="col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sales" />
            </Field>
          </div>
          <Field label="Type">
            <Select
              value={form.account_class}
              onChange={(e) => setForm({ ...form, account_class: e.target.value as AccountClass })}
            >
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-2">
            <Switch id="acc-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label htmlFor="acc-active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={save.isPending}>{save.isPending && <Spinner />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Tax rate dialog ----------------
type TaxForm = { code: string; name: string; rate: string; applies_to: TaxRate['applies_to']; is_active: boolean }

function TaxDialog({ tax, open, onClose }: { tax: TaxRate | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<TaxForm>({ code: '', name: '', rate: '10', applies_to: 'sales', is_active: true })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(
      tax
        ? { code: tax.code, name: tax.name, rate: String(tax.rate), applies_to: tax.applies_to, is_active: tax.is_active }
        : { code: '', name: '', rate: '10', applies_to: 'sales', is_active: true },
    )
  }, [open, tax])

  const save = useMutation({
    mutationFn: (body: Omit<TaxForm, 'rate'> & { rate: number }) =>
      tax ? api.put<TaxRate>(`/accounting/tax-rates/${tax.id}`, body) : api.post<TaxRate>('/accounting/tax-rates', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-rates'] })
      toast.success(tax ? 'Tax rate updated' : 'Tax rate added')
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const rate = Number(form.rate)
    if (!form.code.trim() || !form.name.trim()) return setError('Enter both a code and a name')
    if (form.rate === '' || Number.isNaN(rate) || rate < 0 || rate > 100) return setError('Rate 0 se 100 ke beech ho')
    save.mutate({ ...form, code: form.code.trim().toUpperCase(), name: form.name.trim(), rate })
  }

  const fromSoftware = !!tax && tax.source !== 'manual'
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tax ? 'Edit tax rate' : 'Add tax rate'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          {fromSoftware && (
            <Alert tone="info">Imported from {sourceLabel(tax?.source)} - the code can only be changed there.</Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tax code" hint="Your software's tax code, e.g. OUTPUT / GST">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={fromSoftware}
                placeholder="OUTPUT"
                autoFocus
              />
            </Field>
            <Field label="Rate (%)">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GST on Income" />
          </Field>
          <Field label="Applies to">
            <Select
              value={form.applies_to}
              onChange={(e) => setForm({ ...form, applies_to: e.target.value as TaxRate['applies_to'] })}
            >
              {Object.entries(APPLIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-2">
            <Switch id="tax-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label htmlFor="tax-active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={save.isPending}>{save.isPending && <Spinner />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Page ----------------
export function AccountingSettings() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const { isAdmin } = usePermission()
  const accounts = useAccounts(true)
  const taxes = useTaxRates(true)
  const [accDialog, setAccDialog] = useState<{ open: boolean; item: AccountCode | null }>({ open: false, item: null })
  const [taxDialog, setTaxDialog] = useState<{ open: boolean; item: TaxRate | null }>({ open: false, item: null })

  const importChart = useMutation({
    mutationFn: () =>
      api.post<{ accounts: { created: number; updated: number }; tax_rates: { created: number; updated: number } }>(
        '/accounting/import',
      ),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['tax-rates'] })
      toast.success(
        `Imported from ${softwareLabel}: ${r.accounts.created} new / ${r.accounts.updated} updated accounts, ` +
          `${r.tax_rates.created} new / ${r.tax_rates.updated} updated tax rates`,
      )
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const softwareConnected = !!me?.accounting.connected
  const softwareLabel = isProvider(me?.accounting.provider) ? PROVIDERS[me.accounting.provider].short : 'accounting software'

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium">Chart of accounts & tax rates</p>
            <p className="text-muted-foreground">
              Used on products and invoice lines.{' '}
              {softwareConnected
                ? `Connected to ${softwareLabel}${me?.accounting.org_name ? ` (${me.accounting.org_name})` : ''} - imported codes are refreshed on every sync.`
                : 'Connect Xero, QuickBooks or MYOB to import your real chart of accounts, or add your own codes below.'}
            </p>
          </div>
          {isAdmin && softwareConnected && (
            <Button variant="outline" onClick={() => importChart.mutate()} disabled={importChart.isPending}>
              {importChart.isPending ? <Spinner /> : <CloudDownload />} Import from {softwareLabel}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Account codes</CardTitle>
            <CardDescription>Revenue account each sale is posted to (e.g. 200 Sales).</CardDescription>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setAccDialog({ open: true, item: null })}>
              <PlusCircle /> Add account
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {accounts.isLoading ? (
            <LoadingRows rows={3} />
          ) : accounts.isError ? (
            <ErrorState error={accounts.error} />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-24">Code</TH>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>Source</TH>
                  <TH>Status</TH>
                  {isAdmin && <TH className="w-12" />}
                </TR>
              </THead>
              <TBody>
                {accounts.data!.map((a) => (
                  <TR key={a.id} className={a.is_active ? '' : 'opacity-60'}>
                    <TD className="font-mono font-medium">{a.code}</TD>
                    <TD>{a.name}</TD>
                    <TD className="capitalize text-muted-foreground">{a.account_class.toLowerCase()}</TD>
                    <TD>
                      <SourceBadge source={a.source} />
                    </TD>
                    <TD>{a.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TD>
                    {isAdmin && (
                      <TD>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => setAccDialog({ open: true, item: a })}>
                          <Pencil />
                        </Button>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Tax rates</CardTitle>
            <CardDescription>
              Codes match your accounting software so exports line up. "No tax" is always available on invoices.
            </CardDescription>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setTaxDialog({ open: true, item: null })}>
              <PlusCircle /> Add tax rate
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {taxes.isLoading ? (
            <LoadingRows rows={3} />
          ) : taxes.isError ? (
            <ErrorState error={taxes.error} />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH className="text-right">Rate</TH>
                  <TH>Applies to</TH>
                  <TH>Source</TH>
                  <TH>Status</TH>
                  {isAdmin && <TH className="w-12" />}
                </TR>
              </THead>
              <TBody>
                {taxes.data!.map((t) => (
                  <TR key={t.id} className={t.is_active ? '' : 'opacity-60'}>
                    <TD className="font-mono font-medium">{t.code}</TD>
                    <TD>{t.name}</TD>
                    <TD className="text-right tabular-nums">{t.rate}%</TD>
                    <TD className="text-muted-foreground">{APPLIES[t.applies_to]}</TD>
                    <TD>
                      <SourceBadge source={t.source} />
                    </TD>
                    <TD>{t.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TD>
                    {isAdmin && (
                      <TD>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => setTaxDialog({ open: true, item: t })}>
                          <Pencil />
                        </Button>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AccountDialog account={accDialog.item} open={accDialog.open} onClose={() => setAccDialog({ open: false, item: null })} />
      <TaxDialog tax={taxDialog.item} open={taxDialog.open} onClose={() => setTaxDialog({ open: false, item: null })} />
    </div>
  )
}
