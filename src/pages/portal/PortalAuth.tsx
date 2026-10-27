import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { portalAuth, portalRequest } from '@/lib/portalApi'
import type { PortalMe } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { PortalShell } from './PortalLayout'

/** /portal/:slug - customer login */
export function PortalLogin() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  // Sirf apne portal ke andar redirect (open redirect se bachao)
  const nextRaw = params.get('next') || ''
  const next = nextRaw.startsWith(`/portal/${slug}`) ? nextRaw : `/portal/${slug}`
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const r = await portalRequest<{ token: string; login: PortalMe }>(slug, 'POST', `/portal/${slug}/login`, {
        email,
        password,
      })
      portalAuth.setToken(slug, r.token)
      await qc.invalidateQueries({ queryKey: ['portal', slug] })
      navigate(r.login.must_change_password ? `/portal/${slug}/change-password` : next, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <PortalShell slug={slug} title="Log in" subtitle="Use the email and password from your welcome email.">
      <form className="space-y-3" onSubmit={submit}>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button className="w-full" disabled={busy}>
          {busy && <Spinner />} Log in
        </Button>
        <Link to={`/portal/${slug}/forgot-password`} className="block text-center text-sm text-primary hover:underline">
          Forgot your password?
        </Link>
      </form>
    </PortalShell>
  )
}

/** /portal/:slug/forgot-password */
export function PortalForgot() {
  const { slug = '' } = useParams()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await portalRequest(slug, 'POST', `/portal/${slug}/forgot-password`, { email })
      setDone(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <PortalShell slug={slug} title="Reset your password" subtitle="We'll email you a link to choose a new password.">
      {done ? (
        <Alert tone="success">If that email has an account, a reset link is on its way. It works for 1 hour.</Alert>
      ) : (
        <form className="space-y-3" onSubmit={submit}>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button className="w-full" disabled={busy}>
            {busy && <Spinner />} Send reset link
          </Button>
        </form>
      )}
      <Link to={`/portal/${slug}/login`} className="block text-center text-sm text-primary hover:underline">
        Back to log in
      </Link>
    </PortalShell>
  )
}

/** /portal/:slug/reset-password?token= - welcome email ka "Set your password" bhi yahi */
export function PortalReset() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [doneEmail, setDoneEmail] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters')
    if (password !== confirm) return setError("The two passwords don't match")
    setBusy(true)
    setError('')
    try {
      const r = await portalRequest<{ email: string }>(slug, 'POST', `/portal/${slug}/reset-password`, {
        token: params.get('token') || '',
        password,
      })
      setDoneEmail(r.email)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <PortalShell slug={slug} title="Set your password" subtitle="At least 8 characters.">
      {doneEmail ? (
        <div className="space-y-3">
          <Alert tone="success">Password saved for {doneEmail}. You can log in now.</Alert>
          <Button asChild className="w-full">
            <Link to={`/portal/${slug}/login`}>Log in</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={submit}>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="New password">
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm password">
            <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button className="w-full" disabled={busy}>
            {busy && <Spinner />} Save password
          </Button>
        </form>
      )}
    </PortalShell>
  )
}
