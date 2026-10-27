import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Calendar date picker jisme sirf allowed dates chun sakte hain (baaki din dikhte hi nahi).
 * Portal checkout: delivery days / cut-off / chhutti ke hisaab se server jo dates bhejta hai.
 *   <AllowedDatePicker value="2030-01-07" dates={["2030-01-07", ...]} onChange={...} />
 * Dates "YYYY-MM-DD" (local, bina timezone).
 */
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const parse = (s: string) => new Date(`${s}T00:00:00`)

export function AllowedDatePicker({
  value,
  dates,
  onChange,
  'aria-label': ariaLabel = 'Choose a date',
}: {
  value: string
  dates: string[]
  onChange: (value: string) => void
  'aria-label'?: string
}) {
  const allowed = useMemo(() => new Set(dates), [dates])
  const first = dates[0] ? parse(dates[0]) : new Date()
  const last = dates.length ? parse(dates[dates.length - 1]) : first
  const start = value ? parse(value) : first
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState({ y: start.getFullYear(), m: start.getMonth() })

  const minKey = first.getFullYear() * 12 + first.getMonth()
  const maxKey = last.getFullYear() * 12 + last.getMonth()
  const key = month.y * 12 + month.m
  const move = (n: number) => setMonth(({ y, m }) => ({ y: Math.floor((y * 12 + m + n) / 12), m: (y * 12 + m + n) % 12 }))

  // Mon se shuru grid: pehle din se pehle khali cells
  const offset = (new Date(month.y, month.m, 1).getDay() + 6) % 7
  const days = new Date(month.y, month.m + 1, 0).getDate()
  const all: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  // Sirf wo hafte (rows) dikhao jinme koi delivery date hai - khali hafte chhupa do
  const cells: (number | null)[] = []
  for (let i = 0; i < all.length; i += 7) {
    const week = all.slice(i, i + 7)
    if (week.some((d) => d && allowed.has(iso(month.y, month.m, d)))) cells.push(...week)
  }

  const label = value
    ? parse(value).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Choose a date'

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setMonth({ y: start.getFullYear(), m: start.getMonth() })
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-2.5 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className={cn('flex-1 truncate', !value && 'text-muted-foreground')}>{label}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[60] w-72 rounded-lg border bg-card p-3 text-card-foreground shadow-lg"
          role="dialog"
          aria-label="Delivery calendar"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={key <= minKey}
              onClick={() => move(-1)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-muted disabled:cursor-default disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="text-sm font-semibold">
              {new Date(month.y, month.m, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              aria-label="Next month"
              disabled={key >= maxKey}
              onClick={() => move(1)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-muted disabled:cursor-default disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK.map((d) => (
              <div key={d} className="pb-1 text-[11px] font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />
              const k = iso(month.y, month.m, d)
              // Delivery nahi hoti us din -> date dikhti hi nahi (sirf khali jagah)
              if (!allowed.has(k)) return <div key={k} className="h-8" aria-hidden />
              return (
                <button
                  key={k}
                  type="button"
                  aria-label={parse(k).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  aria-pressed={k === value}
                  onClick={() => {
                    onChange(k)
                    setOpen(false)
                  }}
                  className={cn(
                    'h-8 cursor-pointer rounded-md text-sm font-medium hover:bg-primary/10',
                    k === value && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Only days we deliver are shown.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
