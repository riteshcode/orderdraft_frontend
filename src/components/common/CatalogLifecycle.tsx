import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArchiveRestore, Trash2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

export type CatalogStatus = 'active' | 'inactive' | 'deleted' | 'all'
type Kind = 'products' | 'customers'
type Item = { id: number; name: string; is_active: boolean; deleted_at: string | null }

const TABS: { key: CatalogStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'all', label: 'All' },
  { key: 'deleted', label: 'Trash' },
]

/** Active / Inactive / All / Trash filter */
export function StatusTabs({ value, onChange }: { value: CatalogStatus; onChange: (s: CatalogStatus) => void }) {
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-sm">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            'flex cursor-pointer items-center gap-1 rounded-md px-3 py-1 font-medium text-muted-foreground transition-all',
            value === t.key && 'bg-card text-foreground shadow-sm',
          )}
        >
          {t.key === 'deleted' && <Trash2 className="size-3.5" />}
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Products / customers ke active, delete, restore, permanent delete actions */
export function useLifecycle(kind: Kind) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const label = kind === 'products' ? 'Product' : 'Customer'
  const refresh = () => {
    qc.invalidateQueries({ queryKey: [kind] })
    qc.invalidateQueries({ queryKey: [kind.slice(0, -1)] }) // detail page ('customer', id)
  }
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn()
      toast.success(msg)
      refresh()
      return true
    } catch (e) {
      toast.error((e as Error).message)
      return false
    }
  }

  return {
    setActive: (item: Item, is_active: boolean) =>
      run(() => api.post(`/${kind}/${item.id}/status`, { is_active }), `${item.name} ${is_active ? 'activated' : 'deactivated'}`),

    softDelete: async (item: Item) => {
      const ok = await confirm({
        title: `Move ${item.name} to Trash?`,
        description:
          kind === 'products'
            ? 'It will no longer be matched on new orders. You can restore it from the Trash tab.'
            : 'Orders from this customer will no longer be recognised. You can restore it from the Trash tab.',
        confirmText: 'Move to Trash',
        destructive: true,
      })
      return ok ? run(() => api.del(`/${kind}/${item.id}`), `${label} moved to Trash`) : false
    },

    restore: (item: Item) => run(() => api.post(`/${kind}/${item.id}/restore`), `${item.name} restored`),

    purge: async (item: Item) => {
      const ok = await confirm({
        title: `Delete ${item.name} permanently?`,
        description:
          'This cannot be undone. Items used on orders or invoices are kept for your records and cannot be deleted permanently.',
        confirmText: 'Delete forever',
        destructive: true,
      })
      return ok ? run(() => api.del(`/${kind}/${item.id}/permanent`), `${label} deleted permanently`) : false
    },
  }
}

/** Table row: Active switch (ya Trash mein Restore / Delete forever) */
export function ActiveSwitch({ item, kind, disabled }: { item: Item; kind: Kind; disabled?: boolean }) {
  const { setActive } = useLifecycle(kind)
  if (item.deleted_at) return <span className="text-xs text-muted-foreground">In Trash</span>
  return (
    <Switch
      checked={item.is_active}
      disabled={disabled}
      aria-label={item.is_active ? 'Active' : 'Inactive'}
      title={item.is_active ? 'Active - click to deactivate' : 'Inactive - click to activate'}
      onCheckedChange={(v) => setActive(item, v)}
    />
  )
}

export function TrashActions({ item, kind }: { item: Item; kind: Kind }) {
  const { restore, purge } = useLifecycle(kind)
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => restore(item)}>
        <ArchiveRestore /> Restore
      </Button>
      <Button variant="ghost" size="sm" onClick={() => purge(item)}>
        <XCircle className="text-destructive" /> Delete forever
      </Button>
    </>
  )
}
