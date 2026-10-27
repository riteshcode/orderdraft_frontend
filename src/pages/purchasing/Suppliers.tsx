import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileSpreadsheet, Pencil, PlusCircle, RefreshCw, RotateCcw, Trash2, Truck, Upload } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { Paged, Supplier } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useMe, usePermission } from '@/hooks/useMe'
import { isProvider, PROVIDERS } from '@/lib/providers'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingRows, Pagination, SearchInput } from '@/components/common/states'
import { SortTH, useSort } from '@/components/common/SortableTH'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type ImportResult = { label: string; created: number; updated: number; skipped: number }

/** Import: CSV / Excel file, ya connected Xero / QuickBooks / MYOB se saare suppliers */
function ImportSuppliersMenu() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const acc = me?.accounting
  const providerName = isProvider(acc?.provider) ? PROVIDERS[acc.provider].short : null
  const fromAccounting = useMutation({
    mutationFn: () => api.post<ImportResult>('/suppliers/import-from-accounting'),
    onSuccess: (r) => {
      toast.success(`${r.label}: ${r.created} new, ${r.updated} updated${r.skipped ? `, ${r.skipped} skipped` : ''}`)
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={fromAccounting.isPending}>
          {fromAccounting.isPending ? <Spinner /> : <Upload />} Import
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/imports?kind=suppliers">
            <FileSpreadsheet /> From CSV / Excel file
          </Link>
        </DropdownMenuItem>
        {acc?.connected && providerName ? (
          <DropdownMenuItem onClick={() => fromAccounting.mutate()}>
            <RefreshCw /> From {providerName}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/integrations">
              <RefreshCw /> Connect Xero / QuickBooks / MYOB
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const FIELDS = [
  'name',
  'code',
  'email',
  'cc_emails',
  'contact_name',
  'phone',
  'address',
  'abn',
  'currency',
  'account_number',
  'notes',
] as const
type Key = (typeof FIELDS)[number]
type Form = Record<Key, string> & { payment_terms_days: string; is_active: boolean }

function toForm(s: Supplier | null): Form {
  const f = {} as Form
  for (const k of FIELDS) f[k] = (s?.[k] as string | null) || ''
  f.payment_terms_days = s?.payment_terms_days != null ? String(s.payment_terms_days) : ''
  f.is_active = s?.is_active ?? true
  return f
}

export function SupplierDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Form>(() => toForm(supplier))
  const [error, setError] = useState('')
  const set = (k: Key | 'payment_terms_days') => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string | number | boolean | null> = { is_active: form.is_active }
      for (const k of FIELDS) body[k] = form[k].trim() || null
      body.name = form.name.trim()
      body.payment_terms_days = form.payment_terms_days === '' ? null : Number(form.payment_terms_days)
      return supplier ? api.put<Supplier>(`/suppliers/${supplier.id}`, body) : api.post<Supplier>('/suppliers', body)
    },
    onSuccess: () => {
      toast.success(supplier ? 'Supplier updated' : 'Supplier added')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
        </DialogHeader>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Supplier name *" className="sm:col-span-2">
            <Input value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Code">
            <Input value={form.code} onChange={set('code')} />
          </Field>
          <Field label="Contact person">
            <Input value={form.contact_name} onChange={set('contact_name')} />
          </Field>
          <Field label="Orders email" hint="Purchase orders are emailed here">
            <Input type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="CC emails" hint="Comma separated, e.g. accounts">
            <Input value={form.cc_emails} onChange={set('cc_emails')} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="ABN">
            <Input value={form.abn} onChange={set('abn')} />
          </Field>
          <Field label="Payment terms (days)">
            <Input type="number" min={0} value={form.payment_terms_days} onChange={set('payment_terms_days')} />
          </Field>
          <Field label="Our account number" hint="Your account with this supplier, printed on POs">
            <Input value={form.account_number} onChange={set('account_number')} />
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={set('currency')} maxLength={3} placeholder="AUD" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Textarea rows={2} value={form.address} onChange={set('address')} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Delivery days, cut-off times..." />
          </Field>
          <div className="flex items-center gap-2">
            <Switch id="sup-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label htmlFor="sup-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => (form.name.trim() ? save.mutate() : setError('Supplier name is required'))}
          >
            {save.isPending && <Spinner />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type Status = 'active' | 'inactive' | 'all' | 'deleted'
const STATUS_LABEL: Record<Status, string> = { active: 'Active', inactive: 'Inactive', all: 'All', deleted: 'Trash' }

export default function Suppliers() {
  const { isAdmin } = usePermission()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status>('active')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const { sort, sortProps } = useSort('', () => setPage(1))
  const q = useDebounce(search)

  const suppliers = useQuery({
    queryKey: ['suppliers', q, status, page, sort],
    queryFn: () => api.get<Paged<Supplier>>('/suppliers' + qs({ q, status, page, page_size: 25, sort })),
  })

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Who you buy from. Link products to set supplier codes, costs and the preferred supplier for reordering."
        actions={
          isAdmin && (
            <>
              <ImportSuppliersMenu />
              <Button onClick={() => setEditing('new')}>
                <PlusCircle /> Add supplier
              </Button>
            </>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Name, code or email"
        />
        <div className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-sm">
          {(['active', 'inactive', 'all', 'deleted'] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s)
                setPage(1)
              }}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1 font-medium text-muted-foreground',
                status === s && 'bg-card text-foreground shadow-sm',
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <Card>
        {suppliers.isLoading ? (
          <LoadingRows />
        ) : suppliers.isError ? (
          <div className="p-4">
            <ErrorState error={suppliers.error} />
          </div>
        ) : !suppliers.data?.items.length ? (
          status === 'deleted' ? (
            <EmptyState icon={Trash2} title="Trash is empty" description="Deleted suppliers show here and can be restored." />
          ) : (
            <EmptyState icon={Truck} title="No suppliers yet" description="Add the businesses you buy stock from." />
          )
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <SortTH {...sortProps('name')}>Name</SortTH>
                  <SortTH {...sortProps('code')}>Code</SortTH>
                  <SortTH {...sortProps('email')}>Email</SortTH>
                  <SortTH {...sortProps('phone')}>Phone</SortTH>
                  <SortTH {...sortProps('payment_terms_days')}>Terms</SortTH>
                  <TH className="text-right">Products</TH>
                  <TH className="text-right">Open POs</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {suppliers.data.items.map((s) => (
                  <TR key={s.id} className={s.is_active ? '' : 'opacity-60'}>
                    <TD>
                      <Link to={`/suppliers/${s.id}`} className="font-medium text-primary hover:underline">
                        {s.name}
                      </Link>
                      {s.contact_name && <div className="text-xs text-muted-foreground">{s.contact_name}</div>}
                    </TD>
                    <TD className="font-mono text-xs">{s.code || '-'}</TD>
                    <TD>{s.email || '-'}</TD>
                    <TD>{s.phone || '-'}</TD>
                    <TD>{s.payment_terms_days != null ? `${s.payment_terms_days} days` : '-'}</TD>
                    <TD className="text-right tabular-nums">{s.product_count ?? 0}</TD>
                    <TD className="text-right">
                      {s.open_pos ? <Badge variant="info">{s.open_pos}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TD>
                    <TD className="text-right">
                      {isAdmin && s.deleted_at ? (
                        <TrashActions supplier={s} />
                      ) : (
                        isAdmin && (
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(s)}>
                            <Pencil />
                          </Button>
                        )
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={25} total={suppliers.data.total} onChange={setPage} />
          </>
        )}
      </Card>
      {editing && <SupplierDialog supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

/** Trash mein: Restore / Delete permanently (sirf jab koi purchase order / receipt nahi) */
function TrashActions({ supplier }: { supplier: Supplier }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const done = (msg: string) => {
    toast.success(msg)
    qc.invalidateQueries({ queryKey: ['suppliers'] })
  }
  const restore = useMutation({
    mutationFn: () => api.post(`/suppliers/${supplier.id}/restore`),
    onSuccess: () => done(`${supplier.name} restored`),
    onError: (e: Error) => toast.error(e.message),
  })
  const purge = useMutation({
    mutationFn: () => api.del(`/suppliers/${supplier.id}/permanent`),
    onSuccess: () => done('Supplier deleted permanently'),
    onError: (e: Error) => toast.error(e.message),
  })
  return (
    <div className="flex justify-end gap-1 whitespace-nowrap">
      <Button variant="outline" size="sm" disabled={restore.isPending} onClick={() => restore.mutate()}>
        <RotateCcw /> Restore
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={purge.isPending}
        onClick={async () => {
          if (
            await confirm({
              title: `Delete ${supplier.name} permanently?`,
              description: "This can't be undone. Suppliers with purchase orders or receipts can't be deleted permanently.",
              confirmText: 'Delete permanently',
              destructive: true,
            })
          )
            purge.mutate()
        }}
      >
        Delete permanently
      </Button>
    </div>
  )
}
