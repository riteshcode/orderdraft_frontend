import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Activity, ExternalLink, RotateCw } from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { ExportJob } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { ExportStatusBadge } from '@/components/common/badges'
import { EmptyState, ErrorState, LoadingRows } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

/** Future time ko "in 5 min" jaisa dikhao */
function inTime(value: string | null) {
  if (!value) return '-'
  const ms = new Date(value.endsWith('Z') ? value : value + 'Z').getTime() - Date.now()
  if (ms <= 0) return 'due now'
  const min = Math.round(ms / 60000)
  return min < 60 ? `in ${min} min` : `in ${Math.round(min / 60)} hr`
}

export default function ExportLog() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('all')

  const jobs = useQuery({
    queryKey: ['exports', status],
    queryFn: () => api.get<ExportJob[]>('/exports' + qs({ status: status === 'all' ? '' : status, limit: 200 })),
    refetchInterval: 10_000,
  })

  const retry = useMutation({
    mutationFn: (id: number) => api.post(`/exports/${id}/retry`),
    onSuccess: () => {
      toast.success('Retry started')
      qc.invalidateQueries({ queryKey: ['exports'] })
      qc.invalidateQueries({ queryKey: ['order-stats'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Export log" description="Every attempt to send an approved order to a destination." />

      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="success">Success</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        {jobs.isLoading ? (
          <LoadingRows />
        ) : jobs.isError ? (
          <div className="p-4">
            <ErrorState error={jobs.error} />
          </div>
        ) : !jobs.data?.length ? (
          <EmptyState icon={Activity} title="No exports here" description="Exports appear when orders are approved." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Job</TH>
                <TH>Order</TH>
                <TH>Destination</TH>
                <TH>Status</TH>
                <TH>Attempts</TH>
                <TH>Next retry</TH>
                <TH>Message</TH>
                <TH>When</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {jobs.data.map((j) => {
                const message = j.status === 'failed' ? j.last_error : j.response_summary
                return (
                  <TR key={j.id}>
                    <TD className="text-muted-foreground">#{j.id}</TD>
                    <TD>
                      <Link to={`/orders/${j.order_id}`} className="font-medium text-primary">
                        #{j.order_id}
                      </Link>
                    </TD>
                    <TD>{j.destination_name || '-'}</TD>
                    <TD>
                      <ExportStatusBadge status={j.status} />
                    </TD>
                    <TD>
                      {j.attempts}/{j.max_attempts}
                    </TD>
                    <TD className="whitespace-nowrap">{j.status === 'failed' ? inTime(j.next_retry_at) : '-'}</TD>
                    <TD
                      className={`max-w-xs truncate text-xs ${j.status === 'failed' ? 'text-red-700' : 'text-muted-foreground'}`}
                      title={message || ''}
                    >
                      {message || '-'}
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{formatDateTime(j.created_at)}</TD>
                    <TD className="whitespace-nowrap text-right">
                      {j.external_url && (
                        <Button asChild variant="ghost" size="icon" title="Open">
                          <a href={j.external_url} target="_blank" rel="noreferrer">
                            <ExternalLink />
                          </a>
                        </Button>
                      )}
                      {j.status === 'failed' && (
                        <Button variant="outline" size="sm" disabled={retry.isPending} onClick={() => retry.mutate(j.id)}>
                          <RotateCw /> Retry
                        </Button>
                      )}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
