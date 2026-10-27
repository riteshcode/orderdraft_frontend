import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CornerDownRight, Download, FolderTree, Pencil, Plus, PlusCircle, Trash2, Upload } from 'lucide-react'
import { api, downloadFile } from '@/lib/api'
import type { Category } from '@/lib/types'
import { usePermission } from '@/hooks/useMe'
import { useCategories } from '@/hooks/useCategories'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingRows } from '@/components/common/states'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Switch } from '@/components/ui/switch'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

/**
 * Categories - 2 level: Fruit -> Citrus. Product ki ek category (Products -> Edit -> Category, ya bulk "Set category").
 * Reports (sales by category) aur aage customer portal ka menu isi se banega.
 */
type Editing = { category: Category | null; parentId: string }

export default function Categories() {
  const { isAdmin } = usePermission()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const categories = useCategories()
  const [editing, setEditing] = useState<Editing | null>(null)

  const remove = useMutation({
    mutationFn: (c: Category) => api.del<{ products_uncategorised: number }>(`/categories/${c.id}`),
    onSuccess: (r) => {
      toast.success(r.products_uncategorised ? `Deleted - ${r.products_uncategorised} products now have no category` : 'Deleted')
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function askDelete(c: Category) {
    const ok = await confirm({
      title: `Delete "${c.path}"?`,
      description: c.product_count
        ? `${c.product_count} product${c.product_count === 1 ? '' : 's'} will have no category. The products themselves are not deleted.`
        : 'No products use this category.',
      confirmText: 'Delete',
      destructive: true,
    })
    if (ok) remove.mutate(c)
  }

  const list = categories.data || []

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group your products, e.g. Fruit › Citrus. Used for filtering, sales reports and the menu of your ordering portal."
        actions={
          <>
            {list.length > 0 && (
              <Button
                variant="outline"
                title="Download as CSV - same columns as the import, so you can edit in Excel and import back"
                onClick={() =>
                  downloadFile('/categories/export.csv', 'categories.csv').catch((e: Error) => toast.error(e.message))
                }
              >
                <Download /> Export CSV
              </Button>
            )}
            {isAdmin && (
              <>
                <Button variant="outline" asChild>
                  <Link to="/imports?kind=categories">
                    <Upload /> Import CSV
                  </Link>
                </Button>
                <Button onClick={() => setEditing({ category: null, parentId: '' })}>
                  <PlusCircle /> Add category
                </Button>
              </>
            )}
          </>
        }
      />
      <Card>
        {categories.isLoading ? (
          <LoadingRows />
        ) : categories.isError ? (
          <div className="p-4">
            <ErrorState error={categories.error} />
          </div>
        ) : !list.length ? (
          <EmptyState
            icon={FolderTree}
            title="No categories yet"
            description="Add a few main categories (Fruit, Veg, Dairy) and sub-categories - or import your whole list from a CSV / Excel file."
            action={
              isAdmin && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => setEditing({ category: null, parentId: '' })}>
                    <Plus /> Add category
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/imports?kind=categories">
                      <Upload /> Import from CSV / Excel
                    </Link>
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Category</TH>
                <TH className="text-right">Products</TH>
                <TH>Status</TH>
                {isAdmin && <TH />}
              </TR>
            </THead>
            <TBody>
              {list.map((c) => (
                <TR key={c.id} className={c.is_active ? '' : 'opacity-60'}>
                  <TD>
                    <div className={c.parent_id ? 'flex items-center gap-1.5 pl-6' : 'font-medium'}>
                      {c.parent_id && <CornerDownRight className="size-3.5 text-muted-foreground" />}
                      {c.name}
                    </div>
                    {c.description && (
                      <div className={`text-xs text-muted-foreground ${c.parent_id ? 'pl-11' : ''}`}>{c.description}</div>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">
                    <Link to={`/products?category=${c.id}`} className="text-primary hover:underline">
                      {c.product_count}
                    </Link>
                  </TD>
                  <TD>{c.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Hidden</Badge>}</TD>
                  {isAdmin && (
                    <TD className="whitespace-nowrap text-right">
                      {!c.parent_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Add a sub-category"
                          onClick={() => setEditing({ category: null, parentId: String(c.id) })}
                        >
                          <Plus /> Sub
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing({ category: c, parentId: '' })}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => askDelete(c)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      {editing && <CategoryDialog {...editing} all={list} onClose={() => setEditing(null)} />}
    </div>
  )
}

function CategoryDialog({ category, parentId, all, onClose }: Editing & { all: Category[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(category?.name || '')
  const [parent, setParent] = useState(category ? (category.parent_id ? String(category.parent_id) : '') : parentId)
  const [description, setDescription] = useState(category?.description || '')
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0))
  const [active, setActive] = useState(category?.is_active ?? true)
  const [error, setError] = useState('')
  const hasSubs = !!category && all.some((c) => c.parent_id === category.id)
  // Parent sirf top-level category ho sakti hai (2 level), aur khud nahi
  const parents = all.filter((c) => !c.parent_id && c.id !== category?.id)

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        parent_id: parent ? Number(parent) : null,
        description: description.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_active: active,
      }
      return category ? api.put(`/categories/${category.id}`, body) : api.post('/categories', body)
    },
    onSuccess: () => {
      toast.success(category ? 'Category saved' : 'Category added')
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : parent ? 'Add sub-category' : 'Add category'}</DialogTitle>
        </DialogHeader>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Name *">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Citrus" maxLength={150} />
        </Field>
        <Field
          label="Parent category"
          hint={hasSubs ? 'This category has sub-categories, so it stays a main category' : 'Empty = main category'}
        >
          <Select value={parent} disabled={hasSubs} onChange={(e) => setParent(e.target.value)}>
            <option value="">None (main category)</option>
            {parents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" hint="Optional - shown on your ordering portal">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sort order" hint="Lower numbers show first">
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </Field>
          <Field label="Active" hint="Hidden = can't be picked for new products">
            <div className="flex h-9 items-center">
              <Switch checked={active} onCheckedChange={setActive} aria-label="Active" />
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
