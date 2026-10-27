import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TH } from '@/components/ui/table'

/**
 * Column sorting. Server ko ?sort=name ya ?sort=-name (desc) jaata hai.
 *
 *   const { sort, sortProps } = useSort()            // '' = server ka default order
 *   <SortTH {...sortProps('name')}>Name</SortTH>
 *
 * Click: A-Z -> Z-A -> default (sort hata do).
 */
export function useSort(initial = '', onChange?: () => void) {
  const [sort, setSort] = useState(initial)

  function toggle(field: string, firstDesc = false) {
    const asc = field
    const desc = `-${field}`
    const [first, second] = firstDesc ? [desc, asc] : [asc, desc]
    setSort((s) => (s === first ? second : s === second ? '' : first))
    onChange?.() // e.g. page 1 pe wapas
  }

  const sortProps = (field: string, firstDesc = false) => ({
    active: sort === field ? ('asc' as const) : sort === `-${field}` ? ('desc' as const) : null,
    onSort: () => toggle(field, firstDesc),
  })

  return { sort, setSort, sortProps }
}

export function SortTH({
  active,
  onSort,
  children,
  className,
  align = 'left',
}: {
  active: 'asc' | 'desc' | null
  onSort: () => void
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  const Icon = active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <TH className={className} aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}>
      <button
        type="button"
        onClick={onSort}
        className={cn(
          'group inline-flex cursor-pointer items-center gap-1 uppercase tracking-wide hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
          active && 'text-foreground',
        )}
      >
        {children}
        <Icon className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-30 group-hover:opacity-70')} />
      </button>
    </TH>
  )
}
