import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, Plus, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'
import type { Customer, PortalLogin } from '@/lib/types'
import { formatDateTime, timeAgo } from '@/lib/utils'
import { usePermission } from '@/hooks/useMe'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { PortalLoginActions } from '@/components/common/PortalLoginActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

/**
 * Customer page -> Portal access. Login banao = welcome email (temp password + "Set your password" link).
 * Customer ka staff isi se aapke ordering portal pe login karega. Staff: Login as (bina password) / Set password.
 */
export function PortalAccess({ customer }: { customer: Customer }) {
  const { isAdmin } = usePermission()
  const qc = useQueryClient()
  const key = ['customers', 'portal-logins', customer.id]
  const logins = useQuery({
    queryKey: key,
    queryFn: () => api.get<{ portal_url: string; items: PortalLogin[] }>(`/customers/${customer.id}/portal-logins`),
  })
  const [email, setEmail] = useState(customer.email || '')
  const [name, setName] = useState('')
  const [sendWelcome, setSendWelcome] = useState(true)
  const [shown, setShown] = useState<{ email: string; password: string; reason: string } | null>(null)

  const afterSave = (r: PortalLogin, verb: string) => {
    qc.invalidateQueries({ queryKey: key })
    if (r.temp_password)
      setShown({
        email: r.email,
        password: r.temp_password,
        reason: r.email_error ? `The email couldn't be sent (${r.email_error}).` : 'No email was sent.',
      })
    else toast.success(`${verb} - welcome email sent to ${r.email}`)
  }
  const add = useMutation({
    mutationFn: () =>
      api.post<PortalLogin>(`/customers/${customer.id}/portal-logins`, {
        email: email.trim(),
        name: name.trim() || null,
        send_welcome: sendWelcome,
      }),
    onSuccess: (r) => {
      setEmail('')
      setName('')
      afterSave(r, 'Login created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  if (logins.isLoading) return <LoadingRows rows={3} />
  if (logins.isError) return <ErrorState error={logins.error} />
  const items = logins.data?.items || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="size-4" /> Portal access
        </CardTitle>
        <CardDescription>
          Give {customer.name}'s staff a login to your online ordering portal. They get a welcome email with a temporary password
          and a link to set their own. Portal address:{' '}
          <span className="font-mono text-foreground">{logins.data?.portal_url}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {shown && (
          <Alert tone="warning">
            <div className="space-y-1">
              <div>{shown.reason} Give these details to the customer yourself - this password is shown only once:</div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
                {shown.email} · <b>{shown.password}</b>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${logins.data?.portal_url}\n${shown.email}\n${shown.password}`)
                    toast.success('Copied')
                  }}
                >
                  <Copy /> Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShown(null)}>
                  Done
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {isAdmin && (
          <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Email *">
              <Input
                aria-label="Login email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@customer.com"
              />
            </Field>
            <Field label="Person's name" hint="Optional - used in the email greeting">
              <Input aria-label="Login name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button disabled={!email.trim() || add.isPending} onClick={() => add.mutate()}>
              {add.isPending ? <Spinner /> : <Plus />} Give access
            </Button>
            <label className="flex items-center gap-2 text-sm sm:col-span-3">
              <Switch checked={sendWelcome} onCheckedChange={setSendWelcome} aria-label="Send welcome email" />
              Send the welcome email now (turn off to give them the password yourself)
            </label>
          </div>
        )}

        {!items.length ? (
          <p className="text-sm text-muted-foreground">No portal logins yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH>Login</TH>
                  <TH>Status</TH>
                  <TH>Welcome email</TH>
                  <TH>Last login</TH>
                  {isAdmin && <TH />}
                </TR>
              </THead>
              <TBody>
                {items.map((l) => (
                  <TR key={l.id} className={l.is_active ? '' : 'opacity-60'}>
                    <TD>
                      <div className="font-medium">{l.email}</div>
                      {l.name && <div className="text-xs text-muted-foreground">{l.name}</div>}
                    </TD>
                    <TD>
                      {!l.is_active ? (
                        <Badge variant="secondary">Disabled</Badge>
                      ) : l.must_change_password ? (
                        <Badge variant="warning" title="Hasn't set their own password yet">
                          Invited
                        </Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TD>
                    <TD className="text-xs">{l.welcome_sent_at ? formatDateTime(l.welcome_sent_at) : 'Not sent'}</TD>
                    <TD className="text-xs">{l.last_login_at ? timeAgo(l.last_login_at) : 'Never'}</TD>
                    {isAdmin && (
                      <TD className="whitespace-nowrap text-right">
                        <PortalLoginActions login={l} onChanged={() => qc.invalidateQueries({ queryKey: key })} />
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
