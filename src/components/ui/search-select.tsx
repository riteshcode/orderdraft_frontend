import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Searchable dropdown - 5000 products mein bhi type karke turant mil jaaye.
 *
 *   <SearchSelect
 *     value={productId}                      // string ('' = kuch select nahi)
 *     onChange={setProductId}
 *     options={products.map(productOption)}  // {value, label, hint, keywords, group}
 *     placeholder="Select product"
 *   />
 *
 * Search: label + hint + keywords (SKU, barcode, code, email) - har word match hona chahiye ("roma 10" -> "Roma Tomatoes 10kg").
 * Keyboard: type karo, Up/Down, Enter = select, Esc = band.
 */
export type SearchOption = {
  value: string
  label: string
  hint?: string // chhota grey text (SKU, email ...)
  keywords?: string // search mein extra (barcode, code) - dikhta nahi
  group?: string // "Suggestions", "Supplier's products" ...
  prefix?: ReactNode // label se pehle (★ etc.)
  disabled?: boolean
}

const MAX_SHOWN = 100 // zyada ho to "type to narrow" - browser slow na ho

/** Accents bhi match: "jalapeno" -> "Jalapeño" */
function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  clearable = false,
  disabled = false,
  invalid = false,
  className,
  'aria-label': ariaLabel,
  emptyText = 'No match',
  footer,
}: {
  value: string
  onChange: (value: string) => void
  options: SearchOption[]
  placeholder?: string
  searchPlaceholder?: string
  clearable?: boolean
  disabled?: boolean
  invalid?: boolean
  className?: string
  'aria-label'?: string
  emptyText?: string
  footer?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  // Search index ek baar (har keystroke pe normalize nahi)
  const indexed = useMemo(
    () => options.map((o) => ({ o, text: norm(`${o.label} ${o.hint || ''} ${o.keywords || ''}`) })),
    [options],
  )
  const matches = useMemo(() => {
    const words = norm(query).split(/\s+/).filter(Boolean)
    const hits = words.length ? indexed.filter((x) => words.every((w) => x.text.includes(w))) : indexed
    return hits.map((x) => x.o)
  }, [indexed, query])
  const shown = matches.slice(0, MAX_SHOWN)

  useEffect(() => {
    if (open) {
      setQuery('')
      const i = options.findIndex((o) => o.value === value)
      setActive(i >= 0 && i < MAX_SHOWN ? i : 0)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [query])

  // Active row dikhta rahe (keyboard scroll)
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function pick(o?: SearchOption) {
    if (!o || o.disabled) return
    onChange(o.value)
    setOpen(false)
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, shown.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(shown[active])
    }
  }

  let lastGroup: string | undefined

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            'flex h-9 w-full min-w-0 cursor-pointer items-center gap-1 rounded-md border border-input bg-card px-2.5 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
            invalid && 'border-red-400 bg-red-50',
            className,
          )}
        >
          <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
            {selected ? (
              <>
                {selected.prefix}
                {selected.label}
                {selected.hint && <span className="ml-1 text-xs text-muted-foreground">{selected.hint}</span>}
              </>
            ) : (
              placeholder
            )}
          </span>
          {clearable && selected && !disabled ? (
            <span
              role="button"
              aria-label="Clear"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-72 max-w-[calc(100vw-2rem)] rounded-md border bg-card shadow-lg"
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).querySelector('input')?.focus()
          }}
        >
          <div className="flex items-center gap-2 border-b px-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              aria-label="Search"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
            />
          </div>
          <div ref={listRef} role="listbox" className="max-h-72 overflow-y-auto p-1">
            {shown.map((o, i) => {
              const header = o.group && o.group !== lastGroup ? o.group : null
              lastGroup = o.group
              return (
                <div key={o.value}>
                  {header && (
                    <div className="px-2 pb-0.5 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {header}
                    </div>
                  )}
                  <div
                    role="option"
                    aria-selected={o.value === value}
                    data-index={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                      i === active && 'bg-muted',
                      o.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Check className={cn('size-3.5 shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">
                      {o.prefix}
                      {o.label}
                    </span>
                    {o.hint && <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>}
                  </div>
                </div>
              )
            })}
            {!shown.length && <div className="px-2 py-3 text-center text-sm text-muted-foreground">{emptyText}</div>}
            {matches.length > MAX_SHOWN && (
              <div className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                Showing {MAX_SHOWN} of {matches.length} - type more to narrow
              </div>
            )}
          </div>
          {footer && <div className="border-t p-1">{footer}</div>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ---- Ready-made option builders (har page pe same search) ---- */

type ProductLike = { id: number; name: string; sku: string; barcode?: string | null; unit?: string | null }
type CustomerLike = { id: number; name: string; code?: string | null; email?: string | null; phone?: string | null }
type SupplierLike = { id: number; name: string; code?: string | null; email?: string | null }

export const productOption = (p: ProductLike, extra?: Partial<SearchOption>): SearchOption => ({
  value: String(p.id),
  label: p.name,
  hint: p.sku,
  keywords: `${p.barcode || ''} ${p.unit || ''}`,
  ...extra,
})

export const customerOption = (c: CustomerLike, extra?: Partial<SearchOption>): SearchOption => ({
  value: String(c.id),
  label: c.name,
  hint: c.code || undefined,
  keywords: `${c.email || ''} ${c.phone || ''}`,
  ...extra,
})

export const supplierOption = (s: SupplierLike, extra?: Partial<SearchOption>): SearchOption => ({
  value: String(s.id),
  label: s.name,
  hint: s.code || undefined,
  keywords: s.email || '',
  ...extra,
})
