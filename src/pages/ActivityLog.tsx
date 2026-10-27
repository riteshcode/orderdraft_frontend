import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qs } from '@/lib/api'
import type { ActivityPage } from '@/lib/types'
import { ENTITY_LABELS } from '@/lib/activity'
import { useDebounce } from '@/hooks/useDebounce'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingRows, Pagination, SearchInput } from '@/components/common/states'
import { ActivityList } from '@/components/common/ActivityList'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'

/**
 * Activity log - kisne kya badla. Customer khud check kare ("price kisne change kiya?"),
 * aur super admin isi component se kisi bhi client ka log dekhta hai (basePath = /admin/tenants/{id}/activity).
 */
export function ActivityBrowser({ basePath = '/activity/search' }: { basePath?: string }) {
  const [entity, setEntity] = useState('')
  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search, 300)

  const params = { entity, user_id: userId, q, date_from: from, date_to: to, page, page_size: 50 }
  const data = useQuery({
    queryKey: ['activity', basePath, params],
    queryFn: () => api.get<ActivityPage>(basePath + qs(params)),
  })
  const reset = (fn: () => void) => {
    fn()
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Type" className="w-44" value={entity} onChange={(e) => reset(() => setEntity(e.target.value))}>
          <option value="">Everything</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select aria-label="User" className="w-44" value={userId} onChange={(e) => reset(() => setUserId(e.target.value))}>
          <option value="">All users</option>
          <option value="0">System (automatic)</option>
          {(data.data?.users || []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Input
          aria-label="From date"
          type="date"
          className="w-40"
          value={from}
          onChange={(e) => reset(() => setFrom(e.target.value))}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          aria-label="To date"
          type="date"
          className="w-40"
          value={to}
          onChange={(e) => reset(() => setTo(e.target.value))}
        />
        <SearchInput value={search} onChange={(v) => reset(() => setSearch(v))} placeholder="Action, e.g. price, deleted" />
      </div>
      <Card>
        <CardContent className="pt-2">
          {data.isLoading ? (
            <LoadingRows />
          ) : data.isError ? (
            <ErrorState error={data.error} />
          ) : (
            <>
              <ActivityList items={data.data!.items} />
              <Pagination page={page} pageSize={50} total={data.data!.total} onChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ActivityLog() {
  return (
    <div>
      <PageHeader title="Activity log" description="Who changed what, and when. Click a row to see the old and new values." />
      <ActivityBrowser />
    </div>
  )
}
