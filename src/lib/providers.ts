// Accounting software ke naam / rang ek jagah. Naya software = yahan ek entry.
import type { AccountingDocType, ProviderKey } from '@/lib/types'

export const PROVIDERS: Record<ProviderKey, { label: string; short: string; initials: string; color: string }> = {
  xero: { label: 'Xero', short: 'Xero', initials: 'X', color: 'bg-sky-500' },
  quickbooks: { label: 'QuickBooks Online', short: 'QuickBooks', initials: 'QB', color: 'bg-emerald-600' },
  myob: { label: 'MYOB Business', short: 'MYOB', initials: 'M', color: 'bg-violet-600' },
}

export const PROVIDER_KEYS = Object.keys(PROVIDERS) as ProviderKey[]

export const DOC_TYPE_LABELS: Record<AccountingDocType, string> = {
  invoice_draft: 'Draft invoice',
  invoice_authorised: 'Approved invoice',
  quote: 'Quote',
  sales_order: 'Sales order',
}

export function isProvider(key: string | null | undefined): key is ProviderKey {
  return !!key && key in PROVIDERS
}

/** "xero" -> "Xero", "csv" -> "CSV", "manual" -> "Manual" */
export function sourceLabel(source: string | null | undefined): string {
  if (isProvider(source)) return PROVIDERS[source].short
  if (source === 'csv') return 'CSV'
  if (source === 'internal') return 'OrderDraft'
  return source ? source.charAt(0).toUpperCase() + source.slice(1) : '-'
}
