import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, KeyRound, LogIn, Mail, MoreHorizontal, RefreshCw, Trash2, UserX, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'
import type { PortalLogin } from '@/lib/types'
import { usePermission } from '@/hooks/useMe'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Ek portal login ke saare actions (Customer -> Portal access, aur Settings -> Customer portal -> Customer logins):
 *   Login as customer (bina password, naye tab mein)  ·  Set password (email optional)  ·  Email new temporary password
 *   Disable / enable  ·  Remove
 */
export function PortalLoginActions({ login, onChanged }: { login: PortalLogin; onChanged: () => void }) {
  const { isAdmin } = usePermission()
  const confirm = useConfirm()
  const [pwOpen, setPwOpen] = useState(false)
  const base = `/customers/${login.customer_id}/portal-logins/${login.id}`

  const loginAs = useMutation({
    mutationFn: () => api.post<{ url: string }>(`${base}/login-as`),
    onSuccess: (r) => window.open(r.url, '_blank', 'noopener'),
    onError: (e: Error) => toast.error(e.message),
  })
  const resend = useMutation({
    mutationFn: () => api.post<PortalLogin>(`${base}/resend`),
    onSuccess: (r) => {
      if (r.email_error)
        toast.error(`Email failed: ${r.email_error}. Temporary password: ${r.temp_password}`, { duration: 20000 })
      else toast.success(`New temporary password emailed to ${r.email}`)
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const toggle = useMutation({
    mutationFn: () => api.put(base, { name: login.name, is_active: !login.is_active }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: () => api.del(base),
    onSuccess: () => {
      toast.success('Login removed')
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!isAdmin) return null
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="outline"
        size="sm"
        title="Open the portal as this customer - no password needed"
        disabled={!login.is_active || loginAs.isPending}
        onClick={() => loginAs.mutate()}
      >
        {loginAs.isPending ? <Spinner /> : <LogIn />} Login as
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More actions for ${login.email}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPwOpen(true)}>
            <KeyRound /> Set password…
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!login.is_active}
            onClick={async () => {
              if (
                await confirm({
                  title: `Email a new temporary password to ${login.email}?`,
                  description: 'Their current password stops working. The email has a link to set their own.',
                  confirmText: 'Send',
                })
              )
                resend.mutate()
            }}
          >
            {login.welcome_sent_at ? <RefreshCw /> : <Mail />}{' '}
            {login.welcome_sent_at ? 'Email new temporary password' : 'Send welcome email'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toggle.mutate()}>
            {login.is_active ? <UserX /> : <UserCheck />} {login.is_active ? 'Disable login' : 'Enable login'}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={async () => {
              if (
                await confirm({
                  title: `Remove ${login.email}?`,
                  description: "They won't be able to log in any more. You can add them again later.",
                  confirmText: 'Remove',
                  destructive: true,
                })
              )
                remove.mutate()
            }}
          >
            <Trash2 /> Remove login
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {pwOpen && <SetPasswordDialog login={login} onClose={() => setPwOpen(false)} onSaved={onChanged} />}
    </div>
  )
}

/** Padhne / bolne mein aasaan password (0/O, 1/l nahi) */
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const arr = new Uint32Array(10)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join('')
}

function SetPasswordDialog({ login, onClose, onSaved }: { login: PortalLogin; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState(generatePassword)
  const [mustChange, setMustChange] = useState(true)
  const [sendEmail, setSendEmail] = useState(false)
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: () =>
      api.post<PortalLogin>(`/customers/${login.customer_id}/portal-logins/${login.id}/password`, {
        password,
        must_change: mustChange,
        send_email: sendEmail,
      }),
    onSuccess: (r) => {
      if (r.email_error) toast.error(`Password saved, but the email failed: ${r.email_error}`)
      else toast.success(sendEmail ? `Password saved and emailed to ${login.email}` : 'Password saved')
      onSaved()
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set password for {login.email}</DialogTitle>
          <DialogDescription>
            Use this to give a customer a password over the phone. Their old password stops working.
          </DialogDescription>
        </DialogHeader>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Password" hint="At least 8 characters">
          <div className="flex gap-2">
            <Input
              aria-label="New password"
              className="font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())} title="Generate a new one">
              <RefreshCw />
            </Button>
            <Button
              type="button"
              variant="outline"
              title="Copy"
              onClick={() => {
                navigator.clipboard?.writeText(password)
                toast.success('Copied')
              }}
            >
              <Copy />
            </Button>
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={mustChange} onCheckedChange={setMustChange} aria-label="Must change password" /> Ask them to choose
          their own password when they log in
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={sendEmail} onCheckedChange={setSendEmail} aria-label="Email the password" /> Email this password to{' '}
          {login.email}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={password.length < 8 || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} Save password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
