import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { BookOpen, CircleHelp, X } from 'lucide-react'
import { articleBySlug, articleForPath } from '@/help'
import { Button } from '@/components/ui/button'
import { HelpArticleView } from './HelpArticleView'

/**
 * "Help" button - jis page pe ho uska article side mein khulta hai (form chhodna nahi padta).
 *   <HelpButton />                 top bar mein (page URL se article)
 *   <HelpButton slug="suppliers" /> kisi bhi jagah specific article
 */
export function HelpButton({ slug, label = 'Help', compact = false }: { slug?: string; label?: string; compact?: boolean }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const article = slug ? articleBySlug(slug) : articleForPath(location.pathname)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="sm" title="Help for this page" aria-label="Help for this page">
          <CircleHelp />
          {!compact && <span className="hidden sm:inline">{label}</span>}
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/30" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l bg-card shadow-xl"
        >
          <div className="flex items-center gap-2 border-b px-5 py-3">
            <DialogPrimitive.Title className="flex flex-1 items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4 text-primary" /> Help
            </DialogPrimitive.Title>
            <Link to="/help" onClick={() => setOpen(false)} className="text-sm text-primary hover:underline">
              All help articles
            </Link>
            <DialogPrimitive.Close className="cursor-pointer rounded-sm p-1 opacity-60 hover:opacity-100">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {article ? (
              <HelpArticleView article={article} onNavigate={() => setOpen(false)} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No article for this page yet.{' '}
                <Link to="/help" onClick={() => setOpen(false)} className="text-primary hover:underline">
                  Browse the Help Center
                </Link>
                .
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
