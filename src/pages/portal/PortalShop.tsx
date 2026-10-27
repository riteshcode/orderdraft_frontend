import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Image as ImageIcon, Minus, Plus, ShoppingCart } from 'lucide-react'
import { qs } from '@/lib/api'
import type { Paged, PortalBannerItem, PortalCategory, PortalProduct } from '@/lib/types'
import { cn, formatMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/misc'
import { usePortal } from './context'
import { InstallCard } from './PortalApp'
import { MobileActionBar } from './PortalMobile'
import { haptic, isMobileNow } from './native'

/* ---------------- shared bits ---------------- */

/** Price: special ho to normal price kata hua; guest ko price na dikhe to "Log in for prices" */
export function Price({ p, className }: { p: PortalProduct; className?: string }) {
  const { slug } = usePortal()
  if (p.price == null)
    return (
      <Link to={`/portal/${slug}/login`} className="text-xs font-medium text-primary hover:underline">
        Log in for prices
      </Link>
    )
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-1.5', className)}>
      <span className={cn('font-semibold', p.special && 'text-green-700')}>{formatMoney(p.price)}</span>
      {p.unit && <span className="text-xs text-muted-foreground">/ {p.unit}</span>}
      {p.regular_price != null && (
        <span className="text-xs text-muted-foreground line-through">{formatMoney(p.regular_price)}</span>
      )}
    </div>
  )
}

/** - [qty] + : cart mein seedha badlo */
export function QtyStepper({ productId, compact = false }: { productId: number; compact?: boolean }) {
  const { qtyOf, setQty, add } = usePortal()
  const qty = qtyOf(productId)
  const [text, setText] = useState(String(qty || ''))
  useEffect(() => setText(qty ? String(qty) : ''), [qty])
  if (!qty)
    return (
      <Button
        size={compact ? 'sm' : 'default'}
        className="w-full"
        onClick={() => {
          haptic(12)
          add(productId, 1)
          // Phone pe toast header dhak deta hai - wahan vibration + cart badge kaafi (app jaisa)
          if (!isMobileNow()) toast.success('Added to cart')
        }}
      >
        <ShoppingCart /> Add
      </Button>
    )
  return (
    <div className="flex w-full items-center gap-1">
      <Button variant="outline" size="icon" aria-label="Less" onClick={() => (haptic(6), setQty(productId, qty - 1))}>
        <Minus />
      </Button>
      <input
        aria-label="Quantity"
        inputMode="decimal"
        className="h-9 w-full min-w-0 rounded-md border bg-card text-center text-sm font-medium"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => setQty(productId, Number(text) || 0)}
        onKeyDown={(e) => e.key === 'Enter' && setQty(productId, Number(text) || 0)}
      />
      <Button variant="outline" size="icon" aria-label="More" onClick={() => (haptic(6), setQty(productId, qty + 1))}>
        <Plus />
      </Button>
    </div>
  )
}

function Thumb({ url, className }: { url: string | null; className?: string }) {
  return url ? (
    <img src={url} alt="" loading="lazy" className={cn('aspect-square w-full rounded-md object-cover', className)} />
  ) : (
    <div
      className={cn('flex aspect-square w-full items-center justify-center rounded-md bg-muted text-muted-foreground', className)}
    >
      <ImageIcon className="size-6" />
    </div>
  )
}

export function ProductCard({ p }: { p: PortalProduct }) {
  const { slug } = usePortal()
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/portal/${slug}/p/${p.id}`} className="relative block overflow-hidden bg-muted/40">
        <Thumb url={p.image_url} className="rounded-none transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {p.special && (
            <span className="rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">Your price</span>
          )}
          {p.in_stock === false && (
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-amber-700 shadow">
              Out of stock
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {p.category && (
          <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{p.category}</div>
        )}
        <Link to={`/portal/${slug}/p/${p.id}`} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">
          {p.name}
        </Link>
        <div className="mt-auto space-y-2.5 pt-1">
          <Price p={p} />
          <QtyStepper productId={p.id} compact />
        </div>
      </div>
    </div>
  )
}

function Grid({ items }: { items: PortalProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  )
}

/* ---------------- Home ---------------- */

function bannerLink(slug: string, b: PortalBannerItem): string | null {
  if (b.link_type === 'product' && b.product_id) return `/portal/${slug}/p/${b.product_id}`
  if (b.link_type === 'category' && b.category_id) return `/portal/${slug}/shop?category=${b.category_id}`
  if (b.link_type === 'url' && b.url) return b.url
  return null
}

function Banners({ items }: { items: PortalBannerItem[] }) {
  const { slug } = usePortal()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (items.length < 2) return
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 6000)
    return () => clearInterval(t)
  }, [items.length])
  if (!items.length) return null
  const b = items[i % items.length]
  const link = bannerLink(slug, b)
  const external = !!link && /^https?:/.test(link)
  const content = (
    <div className="relative overflow-hidden rounded-2xl bg-primary/10 shadow-lg">
      {b.image_url ? (
        <img src={b.image_url} alt={b.title || ''} className="aspect-[16/7] w-full object-cover sm:aspect-[16/5]" />
      ) : (
        <div className="aspect-[16/7] w-full sm:aspect-[16/5]" />
      )}
      {(b.title || b.subtitle || b.button_text) && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-4 text-white sm:p-6">
          {b.title && <div className="text-lg font-semibold sm:text-2xl">{b.title}</div>}
          {b.subtitle && <div className="text-sm opacity-90 sm:text-base">{b.subtitle}</div>}
          {link && (
            <span className="mt-2 w-fit rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-900">
              {b.button_text || 'Shop now'}
            </span>
          )}
        </div>
      )}
    </div>
  )
  return (
    <div className="relative">
      {link ? (
        external ? (
          <a href={link} target="_blank" rel="noreferrer">
            {content}
          </a>
        ) : (
          <Link to={link}>{content}</Link>
        )
      ) : (
        content
      )}
      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow"
            onClick={() => setI((x) => (x - 1 + items.length) % items.length)}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next banner"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow"
            onClick={() => setI((x) => (x + 1) % items.length)}
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-2 right-3 flex gap-1">
            {items.map((x, n) => (
              <span key={x.id} className={cn('size-1.5 rounded-full', n === i % items.length ? 'bg-white' : 'bg-white/50')} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function PortalHome() {
  const { slug, info, me, get } = usePortal()
  const home = useQuery({
    queryKey: ['portal', slug, 'home', me?.id],
    queryFn: () => get<{ banners: PortalBannerItem[]; categories: PortalCategory[]; usual: PortalProduct[] }>('/catalog/home'),
  })
  if (home.isLoading) return <Spinner />
  const d = home.data
  const title = info?.welcome_title || (me ? `Welcome back, ${me.name.split(' ')[0]}` : `Welcome to ${info?.name}`)
  return (
    <div className="space-y-10">
      {d?.banners.length ? (
        <Banners items={d.banners} />
      ) : (
        /* Banner nahi hai to brand colour wala hero */
        <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-10 text-primary-foreground shadow-lg sm:px-10 sm:py-14">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 right-24 size-48 rounded-full bg-white/10" />
          <div className="relative max-w-xl space-y-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            {(info?.welcome_text || info?.branding.tagline) && (
              <p className="whitespace-pre-line text-sm opacity-90 sm:text-base">{info.welcome_text || info.branding.tagline}</p>
            )}
            <Button asChild className="mt-2 bg-white text-slate-900 hover:bg-white/90">
              <Link to={`/portal/${slug}/shop`}>Start shopping</Link>
            </Button>
          </div>
        </section>
      )}
      {!!d?.banners.length && (info?.welcome_title || info?.welcome_text) && (
        <div className="space-y-1">
          {info.welcome_title && <h1 className="text-2xl font-bold tracking-tight">{info.welcome_title}</h1>}
          {info.welcome_text && <p className="whitespace-pre-line text-muted-foreground">{info.welcome_text}</p>}
        </div>
      )}
      <InstallCard />
      {!!d?.usual.length && (
        <section className="space-y-4">
          <SectionTitle title="Your usual products" link={`/portal/${slug}/shop`} linkText="See all products" />
          <Grid items={d.usual} />
        </section>
      )}
      {!!d?.categories.length && (
        <section className="space-y-4">
          <SectionTitle title="Shop by category" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {d.categories.map((c) => (
              <Link
                key={c.id}
                to={`/portal/${slug}/shop?category=${c.id}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border bg-accent shadow-sm transition hover:shadow-lg"
              >
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
                <div
                  className={cn(
                    'absolute inset-0',
                    c.image_url ? 'bg-gradient-to-t from-black/70 via-black/10 to-transparent' : '',
                  )}
                />
                <div className={cn('absolute inset-x-0 bottom-0 p-3', c.image_url ? 'text-white' : 'text-foreground')}>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs opacity-80">
                    {c.product_count} product{c.product_count === 1 ? '' : 's'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {!d?.usual.length && !d?.categories.length && (
        <Button asChild variant="outline">
          <Link to={`/portal/${slug}/shop`}>Browse all products</Link>
        </Button>
      )}
    </div>
  )
}

function SectionTitle({ title, link, linkText }: { title: string; link?: string; linkText?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {link && (
        <Link to={link} className="text-sm font-medium text-primary hover:underline">
          {linkText} →
        </Link>
      )}
    </div>
  )
}

/* ---------------- Shop (list) ---------------- */

type ProductsPage = Paged<PortalProduct> & {
  category: { id: number; name: string; path: string; description: string | null; parent_id: number | null } | null
}

export function PortalShopList() {
  const { slug, me, get } = usePortal()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const page = Number(params.get('page') || 1)
  const cats = useQuery({ queryKey: ['portal', slug, 'categories'], queryFn: () => get<PortalCategory[]>('/catalog/categories') })
  const data = useQuery({
    queryKey: ['portal', slug, 'products', q, category, page, me?.id],
    queryFn: () => get<ProductsPage>('/catalog/products' + qs({ q, category_id: category, page, page_size: 24 })),
  })
  const parentId = data.data?.category?.parent_id || (category ? Number(category) : null)
  const parent = cats.data?.find((c) => c.id === parentId)
  const pages = data.data ? Math.ceil(data.data.total / data.data.page_size) : 1
  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{q ? `Results for "${q}"` : data.data?.category?.path || 'All products'}</h1>
        {data.data?.category?.description && <p className="text-sm text-muted-foreground">{data.data.category.description}</p>}
      </div>
      {parent && !!parent.children.length && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => go({ category: String(parent.id), page: '' })}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              category === String(parent.id) ? 'border-primary text-primary' : 'bg-card',
            )}
          >
            All {parent.name}
          </button>
          {parent.children.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go({ category: String(s.id), page: '' })}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                category === String(s.id) ? 'border-primary text-primary' : 'bg-card',
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {data.isLoading ? (
        <Spinner />
      ) : data.isError ? (
        <p className="text-sm text-red-600">{(data.error as Error).message}</p>
      ) : !data.data?.items.length ? (
        <p className="text-sm text-muted-foreground">No products found.</p>
      ) : (
        <>
          <Grid items={data.data.items} />
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}>
                Previous
              </Button>
              <span>
                Page {page} of {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => go({ page: String(page + 1) })}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ---------------- Product page ---------------- */

export function PortalProductPage() {
  const { id } = useParams()
  const { slug, me, get } = usePortal()
  const p = useQuery({
    queryKey: ['portal', slug, 'product', id, me?.id],
    queryFn: () => get<PortalProduct>(`/catalog/products/${id}`),
  })
  const [img, setImg] = useState(0)
  if (p.isLoading) return <Spinner />
  if (p.isError || !p.data) return <p className="text-sm text-red-600">{(p.error as Error)?.message || 'Not found'}</p>
  const x = p.data
  const images = x.images || []
  return (
    <div className="space-y-4">
      <Link
        to={x.category_id ? `/portal/${slug}/shop?category=${x.category_id}` : `/portal/${slug}/shop`}
        className="hidden items-center text-xs text-muted-foreground hover:text-foreground md:inline-flex"
      >
        <ChevronLeft className="size-3.5" /> {x.category || 'All products'}
      </Link>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          {/* Phone: photo kinare se kinare tak (app jaisa) */}
          <Thumb
            url={images[img]?.url || x.image_url}
            className="rounded-xl border bg-card max-md:-mx-4 max-md:-mt-3 max-md:w-[calc(100%+2rem)] max-md:max-w-none max-md:rounded-none max-md:border-0"
          />
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((im, n) => (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => setImg(n)}
                  className={cn(
                    'size-16 shrink-0 overflow-hidden rounded-md border-2',
                    n === img ? 'border-primary' : 'border-transparent',
                  )}
                >
                  <img src={im.thumb_url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold leading-tight">{x.name}</h1>
          <div className="text-xs text-muted-foreground">Code {x.sku}</div>
          <Price p={x} className="text-xl" />
          <div className="flex flex-wrap gap-1.5 text-xs">
            {x.special && (
              <span className="rounded bg-green-50 px-1.5 py-0.5 font-medium text-green-700">Your special price</span>
            )}
            {x.in_stock === false && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                Out of stock - you can still order
              </span>
            )}
            {x.price != null && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                {x.taxable ? 'GST applies' : 'GST free'}
              </span>
            )}
          </div>
          <div className="hidden max-w-xs md:block">
            <QtyStepper productId={x.id} />
          </div>
          <MobileActionBar>
            <div className="flex items-center gap-3">
              <Price p={x} className="shrink-0 text-lg" />
              <div className="ml-auto w-44">
                <QtyStepper productId={x.id} />
              </div>
            </div>
          </MobileActionBar>
          {x.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{x.description}</p>}
        </div>
      </div>
    </div>
  )
}
