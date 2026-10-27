import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, auth } from '@/lib/api'
import type { LoginResponse } from '@/lib/types'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'

export default function Register() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({ business_name: '', name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (Object.values(form).some((v) => !v.trim())) return setError('Saare fields bharo')
    if (form.password.length < 8) return setError('Password kam se kam 8 characters ka ho')
    setBusy(true)
    setError('')
    try {
      const res = await api.post<LoginResponse>('/auth/register', form)
      auth.setToken(res.token)
      qc.setQueryData(['me'], res.user)
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Start your free trial" subtitle="14 days free. No credit card needed.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Business name">
          <Input value={form.business_name} onChange={set('business_name')} placeholder="Fresh Farms Pty Ltd" autoFocus />
        </Field>
        <Field label="Your name">
          <Input value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Work email">
          <Input type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <Input type="password" value={form.password} onChange={set('password')} />
        </Field>
        <Button className="w-full" disabled={busy}>
          {busy && <Spinner />} Create account
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
