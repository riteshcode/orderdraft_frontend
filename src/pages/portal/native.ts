/**
 * Phone par portal ko native app jaisa banane ke chhote helpers (koi React component nahi - cycle-free import).
 *   useIsMobile()        < 768px = phone layout (bottom tabs, app header, sheets)
 *   haptic()             halka vibration (Android; iPhone browser support nahi karta - chupchap kuch nahi)
 *   screenFor()          URL -> kaunsa screen: title, back kahan, tab bar dikhe ya nahi
 *   cacheInfo / cachedInfo   portal ka naam/logo/rang yaad - agli baar app khulte hi splash mein
 */
import { useEffect, useState } from 'react'
import type { PortalInfo } from '@/lib/types'

export const MOBILE_QUERY = '(max-width: 767px)'

export const isMobileNow = () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches

export function useIsMobile() {
  const [mobile, setMobile] = useState(isMobileNow)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

export function haptic(ms = 10) {
  try {
    if (isMobileNow()) navigator.vibrate?.(ms)
  } catch {
    /* kuch browsers mein vibrate block hai */
  }
}

export type TabKey = 'home' | 'shop' | 'cart' | 'orders' | 'account'

export type Screen = {
  tab: TabKey | null // bottom tab jo highlight ho (null = koi nahi)
  title: string
  back: string | null // back button - history na ho to yahan jao
  tabs: boolean // bottom tab bar dikhe?
  search?: boolean // header mein search box
  chips?: boolean // header mein category chips
  cart?: boolean // header mein cart icon (product page)
}

export function screenFor(slug: string, pathname: string): Screen {
  const base = `/portal/${slug}`
  const [a = '', b] = pathname
    .slice(base.length)
    .replace(/^\/+|\/+$/g, '')
    .split('/')
  switch (a) {
    case '':
      return { tab: 'home', title: '', back: null, tabs: true, search: true }
    case 'shop':
      return { tab: 'shop', title: 'Shop', back: null, tabs: true, search: true, chips: true }
    case 'cart':
      return { tab: 'cart', title: 'Cart', back: null, tabs: true }
    case 'orders':
      return b
        ? { tab: null, title: `Order #${b}`, back: `${base}/orders`, tabs: false }
        : { tab: 'orders', title: 'My orders', back: null, tabs: true }
    case 'account':
      return { tab: 'account', title: 'Account', back: null, tabs: true }
    case 'p':
      return { tab: null, title: '', back: `${base}/shop`, tabs: false, cart: true }
    case 'checkout':
      return { tab: null, title: 'Checkout', back: `${base}/cart`, tabs: false }
    case 'order-placed':
      return { tab: null, title: 'Order placed', back: null, tabs: true }
    case 'profile':
      return { tab: null, title: 'Profile & address', back: `${base}/account`, tabs: false }
    case 'notifications':
      return { tab: null, title: 'Notifications', back: `${base}/account`, tabs: false }
    case 'standing':
      return { tab: null, title: 'Standing orders', back: `${base}/account`, tabs: false }
    default:
      return { tab: null, title: '', back: base, tabs: false }
  }
}

/** React Router har history entry mein idx rakhta hai - 0 = app isi page se khula (back = parent page) */
export const canGoBack = () => (window.history.state?.idx ?? 0) > 0

const infoKey = (slug: string) => `od_portal_info_${slug}`

export function cacheInfo(slug: string, info: PortalInfo) {
  try {
    localStorage.setItem(
      infoKey(slug),
      JSON.stringify({ name: info.name, branding: { logo_url: info.branding.logo_url, brand_color: info.branding.brand_color } }),
    )
  } catch {
    /* private mode */
  }
}

export function cachedInfo(
  slug: string,
): { name: string; branding: { logo_url: string | null; brand_color: string | null } } | null {
  try {
    return JSON.parse(localStorage.getItem(infoKey(slug)) || 'null')
  } catch {
    return null
  }
}

/** Header ka background rang - phone ka status bar bhi yahi rang le (seamless app look) */
export function headerColor(info: PortalInfo) {
  const style = info.branding.header_style
  if (style === 'brand') return info.branding.brand_color || '#2563eb'
  if (style === 'dark') return '#0f172a'
  return '#ffffff'
}
