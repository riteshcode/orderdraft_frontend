import { useRef, useState, type DragEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, FileSpreadsheet, History, Link2, Trash2, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import type { ImportJob, ImportKind, ImportRunResult, MappingTemplate, UploadResult } from '@/lib/types'
import { cn, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, LoadingRows } from '@/components/common/states'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { sourceLabel } from '@/lib/providers'

const KINDS: { key: ImportKind; label: string; description: string }[] = [
  { key: 'categories', label: 'Categories', description: 'Product groups - main and sub-categories (Fruit › Citrus).' },
  { key: 'products', label: 'Products', description: 'Your catalog - SKU, name, price, unit.' },
  { key: 'customers', label: 'Customers', description: 'Who orders from you - name, email, phone.' },
  { key: 'history', label: 'Order history', description: 'Past orders (customer + SKU) - makes AI matching smarter.' },
  { key: 'suppliers', label: 'Suppliers', description: 'Who you buy from - name, email, ABN, payment terms.' },
]

const KIND_LABEL: Record<string, string> = {
  categories: 'Categories',
  products: 'Products',
  customers: 'Customers',
  history: 'Order history',
  suppliers: 'Suppliers',
}

function Steps({ step }: { step: number }) {
  const names = ['Upload file', 'Match columns', 'Review & import']
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
      {names.map((n, i) => (
        <div key={n} className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
              step > i + 1
                ? 'bg-green-600 text-white'
                : step === i + 1
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {step > i + 1 ? '✓' : i + 1}
          </span>
          <span className={step === i + 1 ? 'font-medium' : 'text-muted-foreground'}>{n}</span>
          {i < names.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  )
}

function Wizard() {
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const initialKind = (params.get('kind') as ImportKind) || 'products'
  const [kind, setKind] = useState<ImportKind>(KINDS.some((k) => k.key === initialKind) ? initialKind : 'products')
  const [step, setStep] = useState(1)
  const [upload, setUpload] = useState<UploadResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [saveTemplate, setSaveTemplate] = useState(true)
  const [templateName, setTemplateName] = useState('')
  const [preview, setPreview] = useState<ImportRunResult | null>(null)
  const [done, setDone] = useState<ImportRunResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep(1)
    setUpload(null)
    setMapping({})
    setPreview(null)
    setDone(null)
    setTemplateName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const uploadFile = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.upload<UploadResult>(`/imports/${kind}/upload`, form)
    },
    onSuccess: (res) => {
      setUpload(res)
      setMapping(res.mapping)
      setTemplateName(res.template_name || '')
      setStep(2)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const run = useMutation({
    mutationFn: (dryRun: boolean) =>
      api.post<ImportRunResult>(`/imports/${kind}/run`, {
        upload_id: upload!.upload_id,
        mapping,
        dry_run: dryRun,
        save_template: saveTemplate,
        template_name: templateName || null,
      }),
    onSuccess: (res) => {
      if (res.dry_run) {
        setPreview(res)
        setStep(3)
        return
      }
      setDone(res)
      toast.success(`Imported: ${res.created} new, ${res.updated} updated`)
      for (const key of [
        'products',
        'categories',
        'customers',
        'suppliers',
        'import-jobs',
        'import-templates',
        'me',
        'onboarding',
      ]) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function pickFile(file: File | undefined) {
    if (!file) return
    if (!/\.(csv|xlsx|xlsm)$/i.test(file.name)) return toast.error('Sirf .csv ya .xlsx file')
    uploadFile.mutate(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files[0])
  }

  const fields = upload?.fields || []
  const used = new Set(Object.values(mapping).filter(Boolean))
  const missing = fields.filter((f) => f.required && !used.has(f.key))

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Import data</CardTitle>
        <CardDescription>CSV or Excel - any column names. You match them once, we remember.</CardDescription>
      </CardHeader>
      <CardContent>
        <Steps step={done ? 4 : step} />

        {/* ---------- Step 1 ---------- */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setKind(k.key)}
                  className={cn(
                    'cursor-pointer rounded-lg border p-4 text-left transition-colors',
                    kind === k.key ? 'border-primary bg-accent ring-1 ring-primary' : 'hover:bg-muted/50',
                  )}
                >
                  <p className="font-medium">{k.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{k.description}</p>
                </button>
              ))}
            </div>
            {kind === 'categories' && (
              <Alert tone="info">
                One row per category. For a sub-category, put its main category in a <b>Parent</b> column (e.g. Citrus, parent
                Fruit) - or write both in the name like <b>Fruit &gt; Citrus</b>. Missing main categories are created for you, and
                importing the same file again updates instead of duplicating. Then import products with a <b>Category</b> column
                to put them in.
              </Alert>
            )}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                dragging ? 'border-primary bg-accent' : 'hover:bg-muted/40',
              )}
            >
              {uploadFile.isPending ? (
                <Spinner className="size-6 text-primary" />
              ) : (
                <Upload className="size-6 text-muted-foreground" />
              )}
              <p className="font-medium">Drop your {KIND_LABEL[kind].toLowerCase()} file here, or click to browse</p>
              <p className="text-xs text-muted-foreground">.csv or .xlsx, up to 20MB</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsm" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            </div>
          </div>
        )}

        {/* ---------- Step 2 ---------- */}
        {step === 2 && upload && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <FileSpreadsheet className="mr-1 inline size-4" />
              {upload.filename} · {upload.total_rows} rows · importing {KIND_LABEL[kind]}
            </p>
            {upload.template_name && <Alert tone="success">Using saved mapping: {upload.template_name}</Alert>}
            {missing.length > 0 && (
              <Alert tone="warning" title="Required fields not matched">
                {missing.map((f) => f.label).join(', ')}
              </Alert>
            )}
            <div className="rounded-lg border">
              <Table>
                <THead>
                  <TR>
                    <TH>Column in your file</TH>
                    <TH>Sample values</TH>
                    <TH className="w-72">Import as</TH>
                  </TR>
                </THead>
                <TBody>
                  {upload.headers.map((h) => (
                    <TR key={h}>
                      <TD className="font-medium">{h}</TD>
                      <TD className="max-w-xs truncate text-xs text-muted-foreground">
                        {upload.preview
                          .slice(0, 2)
                          .map((r) => r[h])
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </TD>
                      <TD>
                        <Select
                          value={mapping[h] || ''}
                          onChange={(e) => setMapping({ ...mapping, [h]: e.target.value || null })}
                          className={mapping[h] ? 'border-primary/50' : ''}
                        >
                          <option value="">— Ignore —</option>
                          {fields.map((f) => (
                            <option key={f.key} value={f.key} disabled={used.has(f.key) && mapping[h] !== f.key}>
                              {f.label}
                              {f.required ? ' *' : ''}
                            </option>
                          ))}
                        </Select>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Switch id="save-tpl" checked={saveTemplate} onCheckedChange={setSaveTemplate} />
                <Label htmlFor="save-tpl">Save this mapping</Label>
              </div>
              {saveTemplate && (
                <Field label="Mapping name (optional)" className="w-64">
                  <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. MYOB export" />
                </Field>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                <ArrowLeft /> Back
              </Button>
              <Button disabled={missing.length > 0 || run.isPending} onClick={() => run.mutate(true)}>
                {run.isPending && <Spinner />} Preview import
              </Button>
            </div>
          </div>
        )}

        {/* ---------- Step 3 ---------- */}
        {step === 3 && preview && !done && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-semibold text-green-700">{preview.created}</p>
                <p className="text-sm text-muted-foreground">will be created</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-semibold text-primary">{preview.updated}</p>
                <p className="text-sm text-muted-foreground">will be updated</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-2xl font-semibold text-amber-700">{preview.skipped}</p>
                <p className="text-sm text-muted-foreground">will be skipped</p>
              </div>
            </div>
            {preview.errors.length > 0 && (
              <Alert tone="warning" title="Rows with problems (skipped)">
                <ul className="mt-1 list-disc pl-4">
                  {preview.errors.slice(0, 10).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                {preview.errors.length > 10 && <p className="mt-1">...and {preview.errors.length - 10} more</p>}
              </Alert>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft /> Back
              </Button>
              <Button disabled={run.isPending || preview.created + preview.updated === 0} onClick={() => run.mutate(false)}>
                {run.isPending && <Spinner />} Import now
              </Button>
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-4">
            <Alert tone="success" title="Import complete">
              {done.created} created, {done.updated} updated, {done.skipped} skipped.
            </Alert>
            <Button variant="outline" onClick={reset}>
              <CheckCircle2 /> Import another file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function JobErrors({ errors }: { errors: string[] }) {
  const [open, setOpen] = useState(false)
  if (!errors.length) return <span className="text-muted-foreground">0</span>
  return (
    <div>
      <button className="cursor-pointer text-amber-700 underline" onClick={() => setOpen(!open)}>
        {errors.length}
      </button>
      {open && (
        <ul className="mt-1 max-w-xs list-disc pl-4 text-xs text-muted-foreground">
          {errors.slice(0, 10).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Imports() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const jobs = useQuery({ queryKey: ['import-jobs'], queryFn: () => api.get<ImportJob[]>('/imports/jobs') })
  const templates = useQuery({ queryKey: ['import-templates'], queryFn: () => api.get<MappingTemplate[]>('/imports/templates') })

  async function deleteTemplate(t: MappingTemplate) {
    if (!(await confirm({ title: `Delete mapping “${t.name}”?`, confirmText: 'Delete', destructive: true }))) return
    try {
      await api.del(`/imports/templates/${t.id}`)
      qc.invalidateQueries({ queryKey: ['import-templates'] })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Import data"
        description="Bring in categories, products, customers, suppliers and past orders from any system."
      />

      <Alert
        tone="info"
        className="mb-6"
        title="Using Xero, QuickBooks or MYOB?"
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/integrations">
              <Link2 /> Connect
            </Link>
          </Button>
        }
      >
        Sync products, customers & suppliers automatically - no CSV needed.
      </Alert>

      <Wizard />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" /> Import history
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {jobs.isLoading ? (
              <LoadingRows rows={3} />
            ) : !jobs.data?.length ? (
              <EmptyState title="No imports yet" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Type</TH>
                    <TH>Source</TH>
                    <TH>File</TH>
                    <TH className="text-right">New</TH>
                    <TH className="text-right">Updated</TH>
                    <TH className="text-right">Skipped</TH>
                    <TH>Errors</TH>
                    <TH>When</TH>
                  </TR>
                </THead>
                <TBody>
                  {jobs.data.map((j) => (
                    <TR key={j.id}>
                      <TD>{KIND_LABEL[j.kind] || j.kind}</TD>
                      <TD>
                        {j.source === 'csv' ? (
                          <Badge variant="secondary">CSV</Badge>
                        ) : (
                          <Badge variant="info">{sourceLabel(j.source)}</Badge>
                        )}
                      </TD>
                      <TD className="max-w-[160px] truncate text-xs" title={j.filename || ''}>
                        {j.filename || '-'}
                      </TD>
                      <TD className="text-right">{j.created}</TD>
                      <TD className="text-right">{j.updated}</TD>
                      <TD className="text-right">{j.skipped}</TD>
                      <TD>
                        <JobErrors errors={j.errors} />
                      </TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatDateTime(j.created_at)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved mappings</CardTitle>
            <CardDescription>Applied automatically when the same columns appear again.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!templates.data?.length && <p className="text-sm text-muted-foreground">None yet.</p>}
            {templates.data?.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABEL[t.kind]} · {Object.values(t.mapping).filter(Boolean).length} columns
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t)} title="Delete">
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
