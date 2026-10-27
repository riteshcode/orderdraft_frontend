/**
 * Portal = app (PWA): head tags, service worker, install button, push notifications.
 *   applyHead(info, slug)   manifest + theme colour + iPhone icon + title
 *   registerPortalSW()      /portal-sw.js (offline page + push)
 *   useInstall()            Android/Desktop "Install app" button; iPhone ko "Add to Home Screen" batao
 *   enablePush / disablePush / pushState
 */
import { useEffect, useState } from 'react'
import type { PortalInfo } from '@/lib/types'
import { headerColor } from './native'

const API = import.meta.env.VITE_API_URL || '/api'

function setTag(selector: string, create: () => HTMLElement, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLElement | null
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v))
}

export function applyHead(info: PortalInfo, slug: string) {
  document.title = info.name
  // Status bar ka rang = header ka rang (app jaisa, alag patti na dikhe)
  const color = headerColor(info)
  // Notch / home bar tak layout (safe-area padding hum khud dete hain), pinch-zoom band - app jaisa
  setTag('meta[name="viewport"]', () => document.createElement('meta'), {
    name: 'viewport',
    content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
  })
  // iPhone: rangeen header ho to status bar transparent (header uske peeche tak), warna normal safed
  setTag('meta[name="apple-mobile-web-app-status-bar-style"]', () => document.createElement('meta'), {
    name: 'apple-mobile-web-app-status-bar-style',
    content: info.branding.header_style === 'light' ? 'default' : 'black-translucent',
  })
  setTag('meta[name="mobile-web-app-capable"]', () => document.createElement('meta'), {
    name: 'mobile-web-app-capable',
    content: 'yes',
  })
  setTag('meta[name="format-detection"]', () => document.createElement('meta'), {
    name: 'format-detection',
    content: 'telephone=no',
  })
  setTag('link[rel="manifest"]', () => document.createElement('link'), {
    rel: 'manifest',
    href: `${API}/portal/${slug}/manifest.webmanifest`,
  })
  setTag('meta[name="theme-color"]', () => document.createElement('meta'), { name: 'theme-color', content: color })
  setTag('link[rel="apple-touch-icon"]', () => document.createElement('link'), {
    rel: 'apple-touch-icon',
    href: `${API}/portal/${slug}/icon-180.png`,
  })
  setTag('meta[name="apple-mobile-web-app-capable"]', () => document.createElement('meta'), {
    name: 'apple-mobile-web-app-capable',
    content: 'yes',
  })
  setTag('meta[name="apple-mobile-web-app-title"]', () => document.createElement('meta'), {
    name: 'apple-mobile-web-app-title',
    content: info.name.slice(0, 20),
  })
  setTag('link[rel="icon"]', () => document.createElement('link'), { rel: 'icon', href: `${API}/portal/${slug}/icon-192.png` })
}

export async function registerPortalSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/portal-sw.js', { scope: '/portal/' })
  } catch {
    return null
  }
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true)
export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

/** canInstall = Android / desktop Chrome / Edge; ios = Safari share menu se */
export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return {
    installed: isStandalone(),
    canInstall: !!deferred,
    ios: isIOS() && !isStandalone(),
    install: async () => {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      force((n) => n + 1)
      return outcome === 'accepted'
    },
  }
}

function keyToBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/portal/')
  return reg ? reg.pushManager.getSubscription() : null
}

/** Permission maango, subscribe karo -> server ko bhejne layak JSON */
export async function subscribePush(publicKey: string): Promise<PushSubscriptionJSON> {
  if (!pushSupported()) throw new Error("This browser doesn't support notifications")
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked - allow them in your browser settings')
  const reg = (await navigator.serviceWorker.getRegistration('/portal/')) || (await registerPortalSW())
  if (!reg) throw new Error("Couldn't start notifications on this device")
  await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }))
  return sub.toJSON()
}
