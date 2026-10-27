import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, auth } from '@/lib/api'
import type { LoginResponse } from '@/lib/types'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'

export default function Login() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) return setError('Email aur password dono daalo')
    setBusy(true)
    setError('')
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password })
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
    <AuthLayout title="Welcome back" subtitle="Log in to review today's orders.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field
          label={
            <span className="flex w-full justify-between">
              Password
              <Link to="/forgot-password" className="text-xs font-normal text-primary hover:underline">
                Forgot password?
              </Link>
            </span>
          }
        >
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button className="w-full" disabled={busy}>
          {busy && <Spinner />} Log in
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to OrderDraft?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Start free trial
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
