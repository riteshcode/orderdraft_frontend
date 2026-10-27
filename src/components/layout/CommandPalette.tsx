import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  BookOpen,
  ClipboardList,
  CornerDownLeft,
  FileText,
  Package,
  Search,
  ShoppingCart,
  Truck,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { api, qs } from '@/lib/api'
import type { Customer, OrderSummary, Paged, Product, Supplier } from '@/lib/types'
import { searchArticles } from '@/help'
import { useMe } from '@/hooks/useMe'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'

/**
 * Ctrl+K / Cmd+K - "kuch bhi dhundo": pages, actions (New order, New PO...), records (product / customer /
 * supplier / order) aur help articles. Non-tech user ko menu yaad nahi rakhna padta - bas type karo.
 */
type Item = { key: string; group: string; label: string; hint?: string; icon: LucideIcon; to: string }

type Page = { label: string; to: string; keywords: string; manager?: boolean; icon?: LucideIcon }

const PAGES: Page[] = [
  { label: 'Dashboard', to: '/', keywords: 'home overview stats' },
  { label: 'Orders', to: '/orders', keywords: 'review approve draft' },
  { label: 'Inbox log', to: '/inbox', keywords: 'email messages failed received' },
  { label: 'Invoices', to: '/invoices', keywords: 'bill payment' },
  { label: 'Products', to: '/products', keywords: 'items catalog sku price' },
  { label: 'Categories', to: '/categories', keywords: 'groups category sub-category department' },
  { label: 'Reports', to: '/reports', keywords: 'sales by category customer order revenue csv' },
  { label: 'Print barcode labels', to: '/products/labels', keywords: 'barcode qr label print' },
  { label: 'Stock', to: '/stock', keywords: 'inventory on hand adjust count' },
  { label: 'Customers', to: '/customers', keywords: 'clients accounts' },
  { label: 'Suppliers', to: '/suppliers', keywords: 'vendors buy' },
  { label: 'Purchase orders', to: '/purchase-orders', keywords: 'po buy order supplier' },
  { label: 'Reorder suggestions', to: '/purchase-orders/suggestions', keywords: 'low stock reorder' },
  { label: 'Import data', to: '/imports', keywords: 'csv excel upload', manager: true },
  { label: 'Destinations', to: '/destinations', keywords: 'export where orders go', manager: true },
  { label: 'Export log', to: '/exports', keywords: 'failed exports', manager: true },
  { label: 'Integrations', to: '/integrations', keywords: 'xero quickbooks myob connect sync', manager: true },
  { label: 'Activity log', to: '/activity', keywords: 'history audit who changed', manager: true },
  { label: 'Settings', to: '/settings/general', keywords: 'business address timezone' },
  { label: 'Invoice settings', to: '/settings/invoice', keywords: 'invoice number terms gst', manager: true },
  {
    label: 'Customer portal settings',
    to: '/settings/portal',
    keywords: 'online shop ordering portal banners cod',
    manager: true,
  },
  { label: 'Stock settings', to: '/settings/stock', keywords: 'reduce stock approve po number', manager: true },
  { label: 'Accounts & tax rates', to: '/settings/accounting', keywords: 'chart of accounts gst', manager: true },
  { label: 'Email settings', to: '/settings/email', keywords: 'sender domain confirmation', manager: true },
  { label: 'Team', to: '/settings/team', keywords: 'users invite roles', manager: true },
  { label: 'Billing', to: '/settings/billing', keywords: 'plan subscription card', manager: true },
  { label: 'Help Center', to: '/help', keywords: 'help support guide how', icon: BookOpen },
]

const ACTIONS: Page[] = [
  { label: 'New order', to: '/orders/new', keywords: 'create add paste' },
  { label: 'Enter an order manually', to: '/orders/new?mode=manual', keywords: 'create manual type' },
  { label: 'New invoice', to: '/invoices/new', keywords: 'create bill', manager: true },
  { label: 'New purchase order', to: '/purchase-orders/new', keywords: 'create po buy' },
  { label: 'Receive stock (no PO)', to: '/stock-receipts/new', keywords: 'goods received delivery' },
  { label: 'Import suppliers', to: '/imports?kind=suppliers', keywords: 'csv upload vendors', manager: true },
  { label: 'Import products', to: '/imports?kind=products', keywords: 'csv upload items', manager: true },
  { label: 'Add a category', to: '/categories', keywords: 'new category group', manager: true },
  { label: 'Import customers', to: '/imports?kind=customers', keywords: 'csv upload clients', manager: true },
]

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
const matches = (q: string, text: string) =>
  norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => norm(text).includes(w))

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const isManager = me?.role === 'owner' || me?.role === 'admin'
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const q = useDebounce(query.trim(), 250)
  const searching = q.length >= 2 && open

  // Records - server search (5 each)
  const p = useQuery({
    queryKey: ['palette', 'products', q],
    queryFn: () => api.get<Paged<Product>>('/products' + qs({ q, page_size: 5 })),
    enabled: searching,
  })
  const c = useQuery({
    queryKey: ['palette', 'customers', q],
    queryFn: () => api.get<Paged<Customer>>('/customers' + qs({ q, page_size: 5 })),
    enabled: searching,
  })
  const s = useQuery({
    queryKey: ['palette', 'suppliers', q],
    queryFn: () => api.get<Paged<Supplier>>('/suppliers' + qs({ q, page_size: 5, status: 'all' })),
    enabled: searching,
  })
  const o = useQuery({
    queryKey: ['palette', 'orders', q],
    queryFn: () => api.get<Paged<OrderSummary>>('/orders' + qs({ q, page_size: 5 })),
    enabled: searching,
  })

  const items: Item[] = useMemo(() => {
    const allowed = (x: Page) => !x.manager || isManager
    const text = query.trim()
    const out: Item[] = []
    const pageHits = PAGES.filter(allowed).filter((x) => !text || matches(text, `${x.label} ${x.keywords}`))
    const actionHits = ACTIONS.filter(allowed).filter((x) => !text || matches(text, `${x.label} ${x.keywords}`))
    actionHits
      .slice(0, text ? 5 : 4)
      .forEach((x) => out.push({ key: `a${x.to}`, group: 'Actions', label: x.label, icon: Zap, to: x.to }))
    pageHits
      .slice(0, text ? 6 : 8)
      .forEach((x) => out.push({ key: `p${x.to}`, group: 'Go to', label: x.label, icon: x.icon || CornerDownLeft, to: x.to }))
    if (searching) {
      ;(o.data?.items || []).forEach((r) =>
        out.push({
          key: `o${r.id}`,
          group: 'Orders',
          label: `Order #${r.id}${r.customer_name ? ` - ${r.customer_name}` : ''}`,
          hint: r.status.replace(/_/g, ' '),
          icon: ShoppingCart,
          to: `/orders/${r.id}`,
        }),
      )
      ;(p.data?.items || []).forEach((r) =>
        out.push({
          key: `pr${r.id}`,
          group: 'Products',
          label: r.name,
          hint: r.sku,
          icon: Package,
          to: `/products/${r.id}`,
        }),
      )
      ;(c.data?.items || []).forEach((r) =>
        out.push({
          key: `c${r.id}`,
          group: 'Customers',
          label: r.name,
          hint: r.code || r.email || '',
          icon: Users,
          to: `/customers/${r.id}`,
        }),
      )
      ;(s.data?.items || []).forEach((r) =>
        out.push({
          key: `s${r.id}`,
          group: 'Suppliers',
          label: r.name,
          hint: r.code || '',
          icon: Truck,
          to: `/suppliers/${r.id}`,
        }),
      )
    }
    if (text.length >= 2)
      searchArticles(text, 4).forEach((a) =>
        out.push({ key: `h${a.slug}`, group: 'Help', label: a.title, hint: a.category, icon: BookOpen, to: `/help/${a.slug}` }),
      )
    return out
  }, [query, searching, isManager, o.data, p.data, c.data, s.data])

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  function go(item?: Item) {
    if (!item) return
    onOpenChange(false)
    navigate(item.to)
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(items[active])
    }
  }
  useEffect(() => {
    document.querySelector(`[data-palette-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const loading = searching && (p.isFetching || c.isFetching || s.isFetching || o.isFetching)
  let lastGroup = ''

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-card shadow-2xl"
        >
          <DialogPrimitive.Title className="sr-only">Search OrderDraft</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              aria-label="Search everything"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search pages, actions, orders, products, customers, suppliers, help..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
            />
            {loading && <span className="text-xs text-muted-foreground">...</span>}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {items.map((it, i) => {
              const header = it.group !== lastGroup ? it.group : null
              lastGroup = it.group
              return (
                <div key={it.key}>
                  {header && (
                    <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {header}
                    </div>
                  )}
                  <button
                    type="button"
                    data-palette-index={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(it)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm',
                      i === active && 'bg-muted',
                    )}
                  >
                    <it.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.hint && <span className="shrink-0 text-xs capitalize text-muted-foreground">{it.hint}</span>}
                  </button>
                </div>
              )
            })}
            {!items.length && !loading && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results. Try fewer words.</p>
            )}
          </div>
          <div className="flex gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑↓ move</span>
            <span>Enter open</span>
            <span>Esc close</span>
            <span className="ml-auto flex items-center gap-1">
              <FileText className="size-3" /> <ClipboardList className="size-3" /> Records match name, SKU, code or email
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
