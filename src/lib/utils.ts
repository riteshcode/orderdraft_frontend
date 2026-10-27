import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind classes merge karo: cn('p-2', isActive && 'bg-primary') */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 1234.5 -> "$1,234.50" */
export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)
}

/** Backend UTC bhejta hai (bina "Z") - local time mein dikhao */
function toDate(value: string) {
  if (value.length === 10) return new Date(value + 'T00:00:00')
  return new Date(value.endsWith('Z') ? value : value + 'Z')
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return toDate(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return toDate(value).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

/** "5 min ago", "2 days ago" */
export function timeAgo(value: string | null | undefined) {
  if (!value) return 'never'
  const seconds = Math.round((Date.now() - toDate(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
