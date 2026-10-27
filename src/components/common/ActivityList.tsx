import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, History, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import type { Activity, ActivityPage } from '@/lib/types'
import { changesOf, describeAction, entityLink, fieldLabel, formatValue, recordName } from '@/lib/activity'
import { cn, formatDateTime } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingRows } from '@/components/common/states'

/**
 * Activity rows - kisne, kab, kya. "updated" row pe click = purana -> naya value.
 *   <ActivityList items={page.items} />
 *   <HistoryPanel entity="supplier" id={4} />     (record page pe History card)
 */
export function ActivityList({ items, showLinks = true }: { items: Activity[]; showLinks?: boolean }) {
  if (!items.length) return <p className="px-1 py-3 text-sm text-muted-foreground">No activity found.</p>
  return (
    <ul className="divide-y">
      {items.map((a) => (
        <ActivityRow key={a.id} a={a} showLinks={showLinks} />
      ))}
    </ul>
  )
}

function ActivityRow({ a, showLinks }: { a: Activity; showLinks: boolean }) {
  const changes = changesOf(a)
  const [open, setOpen] = useState(false)
  const link = showLinks ? entityLink(a.entity, a.entity_id) : null
  const name = recordName(a)
  const d = (a.detail || {}) as Record<string, unknown>
  const failed = a.action.endsWith('failed')

  return (
    <li className="py-2 text-sm">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={cn('mt-0.5 shrink-0 text-muted-foreground', !changes.length && 'invisible')}
          aria-label={open ? 'Hide changes' : 'Show changes'}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <span className="font-medium">{a.user_name}</span>{' '}
          <span className={cn(failed && 'text-red-600')}>{describeAction(a.action)}</span>
          {name &&
            (link ? (
              <Link to={link} className="text-primary hover:underline">
                {' '}
                {name}
              </Link>
            ) : (
              <span className="font-medium"> {name}</span>
            ))}
          {!name && link && (
            <Link to={link} className="text-primary hover:underline">
              {' '}
              #{a.entity_id}
            </Link>
          )}
          {changes.length > 0 && !open && (
            <button type="button" className="ml-1 text-xs text-muted-foreground hover:underline" onClick={() => setOpen(true)}>
              ({changes.map(([k]) => fieldLabel(k)).join(', ')})
            </button>
          )}
          {a.impersonated_by_name && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-[11px] text-amber-800">
              <Shield className="size-3" /> by support ({a.impersonated_by_name})
            </span>
          )}
          <ExtraDetail action={a.action} d={d} />
          {open && (
            <table className="mt-1.5 w-full max-w-xl text-xs">
              <tbody>
                {changes.map(([k, o, n]) => (
                  <tr key={k} className="border-t">
                    <td className="py-1 pr-3 text-muted-foreground">{fieldLabel(k)}</td>
                    <td className="py-1 pr-2 text-red-700 line-through decoration-red-300">{formatValue(o)}</td>
                    <td className="py-1 text-green-700">{formatValue(n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <time className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.created_at)}</time>
      </div>
    </li>
  )
}

/** Chhoti extra info: import counts, login IP, stock qty ... */
function ExtraDetail({ action, d }: { action: string; d: Record<string, unknown> }) {
  let text = ''
  if (action.startsWith('import.') && d.created !== undefined)
    text = `${d.created} new, ${d.updated ?? 0} updated${d.skipped ? `, ${d.skipped} skipped` : ''}`
  else if (action.startsWith('auth.') && d.ip) text = `from ${d.ip}`
  else if (action === 'customer.price_added' || action === 'customer.price_changed' || action === 'supplier.product_linked')
    text = ''
  else if (d.error) text = String(d.error)
  else if (d.reason) text = String(d.reason)
  if (!text) return null
  return <div className="text-xs text-muted-foreground">{text}</div>
}

/** Record page ka "History" card */
export function HistoryPanel({ entity, id, title = 'History' }: { entity: string; id: number; title?: string }) {
  const q = useQuery({
    queryKey: ['activity', 'entity', entity, id],
    queryFn: () => api.get<ActivityPage>(`/activity/entity/${entity}/${id}`),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" /> {title}
        </CardTitle>
        <CardDescription>
          Every change to this record - who made it and when. Click a row to see old → new values.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <LoadingRows rows={3} />
        ) : q.isError ? (
          <ErrorState error={q.error} />
        ) : (
          <ActivityList items={q.data!.items} showLinks={false} />
        )}
      </CardContent>
    </Card>
  )
}
