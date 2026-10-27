import { useRef, useState, type DragEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { ProductImage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/misc'

const MAX_FILES = 8
const MAX_MB = 5
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Product photos - aage customer portal / PWA mein dikhenge.
 * Pehli image = primary (list aur portal mein yahi dikhti hai).
 */
export function ProductImages({ productId }: { productId: number }) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const key = ['product-images', productId]
  const images = useQuery({ queryKey: key, queryFn: () => api.get<ProductImage[]>(`/products/${productId}/images`) })
  const list = images.data || []

  const done = (data: ProductImage[]) => {
    qc.setQueryData(key, data)
    qc.invalidateQueries({ queryKey: ['products'] })
  }
  const onError = (e: Error) => toast.error(e.message)

  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData()
      files.forEach((f) => form.append('files', f))
      return api.upload<ProductImage[]>(`/products/${productId}/images`, form)
    },
    onSuccess: (data) => {
      done(data)
      toast.success('Images uploaded')
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.del<ProductImage[]>(`/products/${productId}/images/${id}`),
    onSuccess: done,
    onError,
  })
  const primary = useMutation({
    mutationFn: (id: number) => api.post<ProductImage[]>(`/products/${productId}/images/${id}/primary`),
    onSuccess: done,
    onError,
  })
  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.put<ProductImage[]>(`/products/${productId}/images/order`, { ids }),
    onSuccess: done,
    onError,
  })
  const saveAlt = useMutation({
    mutationFn: ({ id, alt_text }: { id: number; alt_text: string }) =>
      api.patch(`/products/${productId}/images/${id}`, { alt_text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError,
  })

  function pick(files: FileList | null) {
    if (!files?.length) return
    const chosen = Array.from(files)
    const bad = chosen.find((f) => !TYPES.includes(f.type))
    if (bad) return toast.error(`${bad.name}: only JPG, PNG or WEBP`)
    const big = chosen.find((f) => f.size > MAX_MB * 1024 * 1024)
    if (big) return toast.error(`${big.name}: max ${MAX_MB} MB`)
    if (list.length + chosen.length > MAX_FILES) return toast.error(`Max ${MAX_FILES} images per product`)
    upload.mutate(chosen)
  }

  function move(index: number, dir: -1 | 1) {
    const ids = list.map((i) => i.id)
    const to = index + dir
    if (to < 0 || to >= ids.length) return
    ;[ids[index], ids[to]] = [ids[to], ids[index]]
    reorder.mutate(ids)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    pick(e.dataTransfer.files)
  }

  const busy = upload.isPending || remove.isPending || primary.isPending || reorder.isPending

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-5 text-center text-sm text-muted-foreground transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
        )}
      >
        {upload.isPending ? <Spinner /> : <ImagePlus className="size-6" />}
        <span className="font-medium text-foreground">Drop photos here or click to upload</span>
        <span className="text-xs">
          JPG, PNG or WEBP · up to {MAX_MB} MB · max {MAX_FILES} photos ({list.length}/{MAX_FILES})
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            pick(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {images.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : (
        list.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((img, i) => (
              <div key={img.id} className={cn('overflow-hidden rounded-lg border', img.is_primary && 'ring-2 ring-primary')}>
                <a href={img.url} target="_blank" rel="noreferrer" className="block aspect-square bg-muted">
                  <img src={img.thumb_url} alt={img.alt_text || ''} className="size-full object-cover" loading="lazy" />
                </a>
                <div className="flex items-center justify-between gap-1 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={img.is_primary ? 'Main photo' : 'Make main photo'}
                    disabled={busy || img.is_primary}
                    onClick={() => primary.mutate(img.id)}
                  >
                    <Star className={cn(img.is_primary && 'fill-amber-400 text-amber-500')} />
                  </Button>
                  <div className="flex">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Move left"
                      disabled={busy || i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Move right"
                      disabled={busy || i === list.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    disabled={busy}
                    onClick={() => remove.mutate(img.id)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
                <div className="px-2 pb-2">
                  <Input
                    aria-label="Alt text"
                    placeholder="Describe the photo"
                    defaultValue={img.alt_text || ''}
                    className="h-7 text-xs"
                    onBlur={(e) =>
                      e.target.value !== (img.alt_text || '') && saveAlt.mutate({ id: img.id, alt_text: e.target.value })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )
      )}
      <p className="text-xs text-muted-foreground">
        The starred photo is shown in your product list and, later, in your customer ordering portal.
      </p>
    </div>
  )
}
