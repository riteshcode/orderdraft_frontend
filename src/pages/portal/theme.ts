/**
 * Portal ka look admin ki settings se (Settings -> Customer portal -> Look & feel).
 * CSS variables root div pe lagte hain - Tailwind ke bg-primary, rounded-xl sab apne aap badal jaate hain.
 */
import { useEffect, type CSSProperties } from 'react'
import type { PortalBranding } from '@/lib/types'

export const FONTS: Record<PortalBranding['font'], { label: string; family: string; google?: string }> = {
  modern: { label: 'Modern (Inter)', family: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  classic: {
    label: 'Classic (Lora)',
    family: "'Lora', Georgia, 'Times New Roman', serif",
    google: 'Lora:wght@400;500;600;700',
  },
  rounded: {
    label: 'Friendly (Nunito)',
    family: "'Nunito', ui-rounded, system-ui, sans-serif",
    google: 'Nunito:wght@400;600;700;800',
  },
}

export const CORNERS: Record<PortalBranding['corners'], { label: string; radius: string }> = {
  rounded: { label: 'Rounded', radius: '0.9rem' },
  soft: { label: 'Soft', radius: '0.5rem' },
  sharp: { label: 'Sharp', radius: '0.15rem' },
}

export const COLOR_PRESETS = ['#2563eb', '#16a34a', '#0f766e', '#ea580c', '#dc2626', '#9333ea', '#db2777', '#0f172a']

/** Rang par text safed ho ya kaala - padhne layak */
export function readableOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#0f172a' : '#ffffff'
}

/** #16a34a -> halka tint (accent background) */
export function tint(hex: string, amount = 0.9) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

export function themeStyle(b: PortalBranding): CSSProperties {
  const color = b.brand_color || '#2563eb'
  return {
    ['--primary' as string]: color,
    ['--primary-foreground' as string]: readableOn(color),
    ['--ring' as string]: tint(color, 0.55),
    ['--accent' as string]: tint(color, 0.92),
    ['--radius' as string]: CORNERS[b.corners]?.radius || CORNERS.rounded.radius,
    fontFamily: FONTS[b.font]?.family || FONTS.modern.family,
  }
}

/** Classic / Friendly font chuna ho to Google Fonts se load karo (ek baar) */
export function loadFont(font: PortalBranding['font']) {
  const g = FONTS[font]?.google
  if (!g || document.getElementById(`font-${font}`)) return
  const link = document.createElement('link')
  link.id = `font-${font}`
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${g}&display=swap`
  document.head.appendChild(link)
}

export function headerClasses(style: PortalBranding['header_style']) {
  if (style === 'brand') return 'bg-primary text-primary-foreground border-transparent'
  if (style === 'dark') return 'bg-slate-900 text-white border-slate-800'
  return 'bg-card/90 text-foreground backdrop-blur'
}

/**
 * Popups (bell, account menu, dialogs) body mein render hote hain - root div ke bahar.
 * Isliye theme variables <html> pe bhi lagao jab tak portal khula hai (staff app pe wapas aate hi hata do).
 */
export function useRootTheme(b: PortalBranding | undefined) {
  useEffect(() => {
    if (!b) return
    const root = document.documentElement
    const style = themeStyle(b) as Record<string, string>
    const keys = Object.keys(style).filter((k) => k.startsWith('--'))
    keys.forEach((k) => root.style.setProperty(k, style[k]))
    document.body.style.fontFamily = style.fontFamily
    return () => {
      keys.forEach((k) => root.style.removeProperty(k))
      document.body.style.fontFamily = ''
    }
  }, [b])
}
