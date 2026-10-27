import { useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portalRequest } from '@/lib/portalApi'
import type { PortalInfo } from '@/lib/types'
import { applyHead } from './pwa'
import { loadFont, themeStyle, useRootTheme } from './theme'
import { useAppChrome } from './PortalMobile'

export function usePortalInfo(slug: string) {
  return useQuery({
    queryKey: ['portal', slug, 'info'],
    queryFn: () => portalRequest<PortalInfo>(slug, 'GET', `/portal/${slug}/info`),
    retry: false,
  })
}

/** Portal ke auth pages (login, password) - client ka logo / rang, OrderDraft branding nahi */
export function PortalShell({
  slug,
  title,
  subtitle,
  children,
}: {
  slug: string
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  const info = usePortalInfo(slug)
  const b = info.data?.branding
  useRootTheme(b)
  useAppChrome(slug, info.data)
  useEffect(() => {
    if (info.data) {
      applyHead(info.data, slug)
      loadFont(info.data.branding.font)
    }
  }, [info.data, slug])
  return (
    <div
      className="pt-safe relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10"
      style={b ? themeStyle(b) : undefined}
    >
      <div className="absolute inset-x-0 top-0 h-48 bg-primary sm:h-64" />
      <div className="relative w-full max-w-sm space-y-5">
        <div className="text-center text-primary-foreground">
          {b?.logo_url ? (
            <img src={b.logo_url} alt={info.data?.name} className="mx-auto h-12 rounded-lg bg-white/95 object-contain p-1.5" />
          ) : (
            <div className="text-xl font-bold">{info.data?.name || (info.isError ? 'Portal not found' : '…')}</div>
          )}
          <div className="mt-1 text-sm opacity-85">{b?.tagline || 'Online ordering'}</div>
        </div>
        <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-xl">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {info.isError ? <p className="text-sm text-red-600">This ordering portal doesn't exist. Check the link.</p> : children}
        </div>
        {(info.data?.email || info.data?.phone) && (
          <p className="text-center text-xs text-muted-foreground">
            Need help? Contact {info.data.name}
            {info.data.phone ? ` on ${info.data.phone}` : ''}
            {info.data.email ? ` · ${info.data.email}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
