import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AccountCode, TaxRate } from '@/lib/types'

/** Active account codes (dropdowns ke liye). Settings page include_inactive=true use karta hai. */
export function useAccounts(includeInactive = false) {
  return useQuery({
    queryKey: ['accounts', includeInactive],
    queryFn: () => api.get<AccountCode[]>(`/accounting/accounts${includeInactive ? '?include_inactive=true' : ''}`),
    staleTime: 60_000,
  })
}

export function useTaxRates(includeInactive = false) {
  return useQuery({
    queryKey: ['tax-rates', includeInactive],
    queryFn: () => api.get<TaxRate[]>(`/accounting/tax-rates${includeInactive ? '?include_inactive=true' : ''}`),
    staleTime: 60_000,
  })
}

/** Sales pe lagne wale tax rates */
export const salesRates = (rates: TaxRate[] | undefined) => (rates || []).filter((r) => r.applies_to !== 'purchases')
export const purchaseRates = (rates: TaxRate[] | undefined) => (rates || []).filter((r) => r.applies_to !== 'sales')
