import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Category } from '@/lib/types'
import type { SearchOption } from '@/components/ui/search-select'

/** Saari categories (tree order: Fruit, Fruit › Citrus, Veg ...) - dropdowns / filters ke liye */
export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories'), staleTime: 60_000 })
}

/** SearchSelect options: "Fruit", "Fruit › Citrus" (inactive bhi dikhte hain par chun nahi sakte) */
export function categoryOptions(cats: Category[] | undefined, current?: number | null): SearchOption[] {
  return (cats || []).map((c) => ({
    value: String(c.id),
    label: c.path,
    hint: c.is_active ? undefined : 'inactive',
    disabled: !c.is_active && c.id !== current,
  }))
}
