import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Inbox as InboxIcon, Paperclip, RefreshCw } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { InboundMessage, Paged } from '@/lib/types'
import { timeAgo } from '@/lib/utils'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { ChannelBadge, MessageStatusBadge } from '@/components/common/badges'
import { EmptyState, ErrorState, LoadingRows, Pagination } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/misc'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'received,processing', label: 'Processing' },
  { key: 'failed', label: 'Failed' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'not_order', label: 'Not an order' },
  { key: 'done', label: 'Done' },
]

const RETRYABLE = ['failed', 'not_order', 'blocked']

export default function Inbox() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<number | null>(null)

  const messages = useQuery({
    queryKey: ['messages', status, page],
    queryFn: () =>
      api.get<Paged<InboundMessage>>('/inbound/messages' + qs({ status: status === 'all' ? '' : status, page, page_size: 25 })),
    refetchInterval: 8000,
  })
  // Blocked messages hain? (banner ke liye)
  const blocked = useQuery({
    queryKey: ['messages', 'blocked-count'],
    queryFn: () => api.get<Paged<InboundMessage>>('/inbound/messages?status=blocked&page_size=1'),
    refetchInterval: 30_000,
  })

  const retry = useMutation({
    mutationFn: (id: number) => api.post(`/inbound/messages/${id}/retry`),
    onSuccess: () => {
      toast.success('Retrying - check back in a few seconds')
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['order-stats'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader
        title="Inbox log"
        description="Every email, voice note, PDF and message that came in - and what happened to it."
      />

      {!!blocked.data?.total && me?.role === 'owner' && (
        <Alert
          tone="warning"
          className="mb-4"
          title={`${blocked.data.total} message${blocked.data.total > 1 ? 's are' : ' is'} waiting`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/settings/billing">Upgrade plan</Link>
            </Button>
          }
        >
          Your plan limit was reached or your trial ended. Upgrade, then retry these messages.
        </Alert>
      )}

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v)
          setPage(1)
        }}
        className="mb-4"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        {messages.isLoading ? (
          <LoadingRows />
        ) : messages.isError ? (
          <div className="p-4">
            <ErrorState error={messages.error} />
          </div>
        ) : !messages.data?.items.length ? (
          <EmptyState icon={InboxIcon} title="No messages" description="Forwarded emails and uploads will be listed here." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH className="w-8" />
                  <TH>#</TH>
                  <TH>Source</TH>
                  <TH>From</TH>
                  <TH>Subject</TH>
                  <TH>Status</TH>
                  <TH>Received</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {messages.data.items.map((m) => (
                  <Fragment key={m.id}>
                    <TR className="cursor-pointer" onClick={() => setOpen(open === m.id ? null : m.id)}>
                      <TD>{open === m.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</TD>
                      <TD className="text-muted-foreground">{m.id}</TD>
                      <TD>
                        <ChannelBadge channel={m.channel} />
                      </TD>
                      <TD>{m.sender_name || m.sender_email || '-'}</TD>
                      <TD className="max-w-64 truncate">{m.subject || '-'}</TD>
                      <TD>
                        <MessageStatusBadge status={m.status} />
                      </TD>
                      <TD className="text-muted-foreground">{timeAgo(m.created_at)}</TD>
                      <TD className="text-right">
                        {RETRYABLE.includes(m.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retry.isPending}
                            onClick={(e) => {
                              e.stopPropagation()
                              retry.mutate(m.id)
                            }}
                          >
                            <RefreshCw /> Retry
                          </Button>
                        )}
                      </TD>
                    </TR>
                    {open === m.id && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={8} className="space-y-3 px-6 py-4">
                          {m.error && <Alert tone="error">{m.error}</Alert>}
                          {m.attachments.map((a, i) => (
                            <div key={i} className="rounded-md border bg-card p-2.5 text-sm">
                              <div className="flex items-center gap-2 text-xs font-medium">
                                <Paperclip className="size-3.5" />
                                <span className="uppercase text-muted-foreground">{a.kind}</span> {a.name}
                              </div>
                              {a.transcript && <p className="mt-1.5 italic text-muted-foreground">“{a.transcript}”</p>}
                            </div>
                          ))}
                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-card p-3 font-sans text-[13px]">
                            {m.combined_text || m.body_text || '(empty)'}
                          </pre>
                          {m.processing_ms != null && (
                            <p className="text-xs text-muted-foreground">Processed in {(m.processing_ms / 1000).toFixed(1)}s</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} pageSize={25} total={messages.data.total} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
