import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { TenantSettings } from '@/lib/types'
import { usePermission } from '@/hooks/useMe'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'

type InvoiceForm = TenantSettings['invoice']

export function InvoiceSettings() {
  const qc = useQueryClient()
  const { isAdmin } = usePermission()
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<TenantSettings>('/settings') })
  const [form, setForm] = useState<InvoiceForm | null>(null)

  useEffect(() => {
    if (settings.data) setForm(settings.data.invoice)
  }, [settings.data])

  const save = useMutation({
    mutationFn: (body: InvoiceForm) => api.put<TenantSettings>('/settings/invoice', body),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      toast.success('Invoice settings saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (settings.isLoading || !form) return <LoadingRows rows={4} />
  if (settings.isError) return <ErrorState error={settings.error} />

  const setText = (key: keyof InvoiceForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  const setNumber = (key: keyof InvoiceForm) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value === '' ? 0 : Number(e.target.value) })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    if (form.invoice_next_number < 1) return toast.error('Next number 1 ya usse zyada ho')
    if (form.gst_rate < 0 || form.gst_rate > 100) return toast.error('GST rate 0-100 ke beech ho')
    save.mutate(form)
  }

  // Example: $110 ka item - GST kaise calculate hoga
  const rate = form.gst_rate || 0
  const gstExample = form.prices_include_gst
    ? `A $110.00 line includes $${((110 * rate) / (100 + rate)).toFixed(2)} GST.`
    : `A $100.00 line gets $${((100 * rate) / 100).toFixed(2)} GST added = $${(100 + rate).toFixed(2)} total.`

  return (
    <Card className="max-w-3xl">
      <form onSubmit={submit} noValidate>
        <CardHeader>
          <CardTitle>Invoice settings</CardTitle>
          <CardDescription>
            Used for invoices created by OrderDraft (and the tax-inclusive setting sent to your accounting software).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert tone="info">
            Next invoice:{' '}
            <b>
              {form.invoice_prefix}
              {form.invoice_next_number}
            </b>{' '}
            · due in {form.payment_terms_days} days
          </Alert>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Number prefix">
              <Input value={form.invoice_prefix} onChange={setText('invoice_prefix')} disabled={!isAdmin} />
            </Field>
            <Field label="Next number">
              <Input
                type="number"
                min={1}
                value={form.invoice_next_number}
                onChange={setNumber('invoice_next_number')}
                disabled={!isAdmin}
              />
            </Field>
            <Field label="Payment terms (days)">
              <Input
                type="number"
                min={0}
                value={form.payment_terms_days}
                onChange={setNumber('payment_terms_days')}
                disabled={!isAdmin}
              />
            </Field>
            <Field label="GST rate (%)">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={form.gst_rate}
                onChange={setNumber('gst_rate')}
                disabled={!isAdmin}
              />
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <Label>Prices include GST</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.prices_include_gst}
                  onCheckedChange={(v) => setForm({ ...form, prices_include_gst: v })}
                  disabled={!isAdmin}
                />
                <span className="text-sm text-muted-foreground">{gstExample}</span>
              </div>
            </div>
          </div>

          <Field label="Bank / payment details" hint="Printed on the invoice PDF, e.g. BSB, account number, PayID">
            <Textarea rows={3} value={form.bank_details || ''} onChange={setText('bank_details')} disabled={!isAdmin} />
          </Field>
          <Field label="Invoice footer" hint="Terms, thank-you note etc.">
            <Textarea rows={2} value={form.invoice_footer || ''} onChange={setText('invoice_footer')} disabled={!isAdmin} />
          </Field>
        </CardContent>
        {isAdmin && (
          <CardFooter className="justify-end">
            <Button disabled={save.isPending}>{save.isPending && <Spinner />} Save changes</Button>
          </CardFooter>
        )}
      </form>
    </Card>
  )
}
