import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, auth } from '@/lib/api'
import type { LoginResponse } from '@/lib/types'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const invite = useQuery({
    queryKey: ['invite', token],
    queryFn: () => api.get<{ email: string; tenant_name: string; role: string }>(`/auth/invite/${token}`),
    retry: false,
  })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Apna naam daalo')
    if (password.length < 8) return setError('Password kam se kam 8 characters ka ho')
    setBusy(true)
    try {
      const res = await api.post<LoginResponse>('/auth/accept-invite', { token, name, password })
      auth.setToken(res.token)
      qc.setQueryData(['me'], res.user)
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (invite.isError) {
    return (
      <AuthLayout title="Invite not valid">
        <Alert tone="error">{(invite.error as Error).message}</Alert>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={invite.data ? `Join ${invite.data.tenant_name}` : 'Loading invite...'}
      subtitle={invite.data && `You've been invited as ${invite.data.role} (${invite.data.email}).`}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Your name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button className="w-full" disabled={busy || !invite.data}>
          {busy && <Spinner />} Accept & continue
        </Button>
      </form>
    </AuthLayout>
  )
}
