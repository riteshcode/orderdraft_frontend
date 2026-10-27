import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, Mail, UserPlus, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Role, TeamData } from '@/lib/types'
import { formatDate, timeAgo } from '@/lib/utils'
import { usePermission } from '@/hooks/useMe'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { ErrorState, LoadingRows } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

const ROLE_INFO: Record<Role, string> = {
  owner: 'Everything, including billing and team',
  admin: 'Everything except billing',
  reviewer: 'Review & approve orders',
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const { isOwner } = usePermission()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('reviewer')
  const [link, setLink] = useState('')

  const invite = useMutation({
    mutationFn: () => api.post<{ ok: boolean; invite_link: string }>('/team/invite', { email, role }),
    onSuccess: (res) => {
      setLink(res.invite_link)
      qc.invalidateQueries({ queryKey: ['team'] })
      toast.success(`Invite sent to ${email}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function close(v: boolean) {
    onOpenChange(v)
    if (!v) {
      setEmail('')
      setRole('reviewer')
      setLink('')
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return toast.error('Valid email daalo')
    invite.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>They'll get an email with a link to join (valid 7 days).</DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-3">
            <Alert tone="success" title="Invite created">
              If emails aren't set up yet, share this link directly:
            </Alert>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(link)
                  toast.success('Copied')
                }}
              >
                <Copy />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            <Field label="Role" hint={ROLE_INFO[role]}>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
                {isOwner && <option value="owner">Owner</option>}
              </Select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button disabled={invite.isPending}>{invite.isPending && <Spinner />} Send invite</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function TeamSettings() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { isOwner } = usePermission()
  const [inviteOpen, setInviteOpen] = useState(false)
  const team = useQuery({ queryKey: ['team'], queryFn: () => api.get<TeamData>('/team') })

  const update = useMutation({
    mutationFn: ({ id, role, is_active }: { id: number; role: Role; is_active: boolean }) =>
      api.put(`/team/members/${id}`, { role, is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] })
      toast.success('Member updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelInvite = useMutation({
    mutationFn: (id: number) => api.del(`/team/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  if (team.isLoading) return <LoadingRows />
  if (team.isError) return <ErrorState error={team.error} />
  const data = team.data!
  const used = data.members.filter((m) => m.is_active).length + data.invites.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Team members</CardTitle>
            <CardDescription>
              {used} of {data.user_limit} seats used
            </CardDescription>
          </div>
          <Button onClick={() => setInviteOpen(true)} disabled={used >= data.user_limit}>
            <UserPlus /> Invite member
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Active</TH>
                <TH>Last login</TH>
              </TR>
            </THead>
            <TBody>
              {data.members.map((m) => {
                // Khud ko ya (non-owner ho to) owner ko change nahi kar sakte
                const locked = m.is_me || (!isOwner && m.role === 'owner')
                return (
                  <TR key={m.id}>
                    <TD className="font-medium">
                      {m.name} {m.is_me && <Badge variant="secondary">You</Badge>}
                    </TD>
                    <TD className="text-muted-foreground">{m.email}</TD>
                    <TD>
                      <Select
                        value={m.role}
                        disabled={locked || update.isPending}
                        className="w-32"
                        onChange={(e) => update.mutate({ id: m.id, role: e.target.value as Role, is_active: m.is_active })}
                      >
                        <option value="reviewer">Reviewer</option>
                        <option value="admin">Admin</option>
                        {(isOwner || m.role === 'owner') && <option value="owner">Owner</option>}
                      </Select>
                    </TD>
                    <TD>
                      <Switch
                        checked={m.is_active}
                        disabled={locked || update.isPending}
                        onCheckedChange={async (v) => {
                          if (
                            !v &&
                            !(await confirm({
                              title: `Disable ${m.name}?`,
                              description: 'They will not be able to log in.',
                              destructive: true,
                              confirmText: 'Disable',
                            }))
                          )
                            return
                          update.mutate({ id: m.id, role: m.role, is_active: v })
                        }}
                      />
                    </TD>
                    <TD className="text-muted-foreground">{timeAgo(m.last_login_at)}</TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {data.invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {data.invites.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <span className="flex-1 font-medium">{i.email}</span>
                <Badge variant="secondary" className="capitalize">
                  {i.role}
                </Badge>
                <span className="text-xs text-muted-foreground">expires {formatDate(i.expires_at)}</span>
                <Button variant="ghost" size="sm" onClick={() => cancelInvite.mutate(i.id)}>
                  <X /> Cancel
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
            <div key={r} className="rounded-lg border p-3">
              <p className="font-medium capitalize">{r}</p>
              <p className="text-muted-foreground">{ROLE_INFO[r]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
