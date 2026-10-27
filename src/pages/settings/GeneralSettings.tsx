import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, Mail } from 'lucide-react'
import { api } from '@/lib/api'
import type { TenantSettings } from '@/lib/types'
import { usePermission } from '@/hooks/useMe'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Spinner } from '@/components/ui/misc'

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Darwin',
  'Australia/Hobart',
]

type Business = TenantSettings['business']

export function GeneralSettings() {
  const qc = useQueryClient()
  const { isAdmin } = usePermission()
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<TenantSettings>('/settings') })
  const [form, setForm] = useState<Business | null>(null)

  // Data aate hi form bhar do
  useEffect(() => {
    if (settings.data) setForm(settings.data.business)
  }, [settings.data])

  const save = useMutation({
    mutationFn: (body: Business) => api.put<TenantSettings>('/settings/business', body),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Business details saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (settings.isLoading || !form) return <LoadingRows rows={4} />
  if (settings.isError) return <ErrorState error={settings.error} />

  const set = (key: keyof Business) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.name.trim()) return toast.error('Business name is required')
    save.mutate(form)
  }

  const inbound = settings.data!.inbound_email

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <form onSubmit={submit} noValidate>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>Shown on your invoices and emails.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" className="sm:col-span-2">
              <Input value={form.name} onChange={set('name')} disabled={!isAdmin} />
            </Field>
            <Field label="ABN">
              <Input value={form.abn || ''} onChange={set('abn')} placeholder="12 345 678 901" disabled={!isAdmin} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone || ''} onChange={set('phone')} disabled={!isAdmin} />
            </Field>
            <Field label="Email" hint="Customers reply to this address">
              <Input type="email" value={form.email || ''} onChange={set('email')} disabled={!isAdmin} />
            </Field>
            <Field label="Timezone">
              <Select value={form.timezone} onChange={set('timezone')} disabled={!isAdmin}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace('Australia/', '')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea rows={3} value={form.address || ''} onChange={set('address')} disabled={!isAdmin} />
            </Field>
          </CardContent>
          {isAdmin && (
            <CardFooter className="justify-end">
              <Button disabled={save.isPending}>{save.isPending && <Spinner />} Save changes</Button>
            </CardFooter>
          )}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" /> Inbound email
          </CardTitle>
          <CardDescription>Forward customer orders to this address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-2">
            <Input readOnly value={inbound} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(inbound)
                toast.success('Copied')
              }}
            >
              <Copy />
            </Button>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p>
              <b className="text-foreground">Outlook:</b> Settings → Mail → Rules → Add rule → "Forward to" this address (e.g. for
              emails sent to your orders@ inbox).
            </p>
            <p>
              <b className="text-foreground">Gmail:</b> Settings → Forwarding → add this address, then create a filter (e.g.
              "to:orders@yourbusiness.com.au") → Forward it.
            </p>
            <p>PDF purchase orders and voice-note attachments are read automatically.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
