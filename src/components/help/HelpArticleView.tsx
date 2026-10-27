import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, ExternalLink, LifeBuoy, Mail, MessageCircle, Phone } from 'lucide-react'
import { articleBySlug, type HelpArticle } from '@/help'
import { SUPPORT, supportMailto } from '@/lib/support'
import { useMe } from '@/hooks/useMe'
import { Button } from '@/components/ui/button'
import { HelpText } from './HelpText'

/** Ek article: sections, field glossary (har form ke fields), related, support. Help page aur drawer dono mein. */
export function HelpArticleView({ article, onNavigate }: { article: HelpArticle; onNavigate?: () => void }) {
  return (
    <article className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{article.category}</p>
        <h2 className="text-xl font-semibold tracking-tight">{article.title}</h2>
        <p className="text-sm text-muted-foreground">{article.summary}</p>
        {article.path && (
          <Link
            to={article.path}
            onClick={onNavigate}
            className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary hover:underline"
          >
            Open this page <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>

      {article.sections.map((s) => (
        <section key={s.heading} className="space-y-1.5">
          <h3 className="font-semibold">{s.heading}</h3>
          <HelpText text={s.body} onNavigate={onNavigate} />
        </section>
      ))}

      {!!article.fields?.length && (
        <section className="space-y-2">
          <h3 className="font-semibold">Fields explained</h3>
          {article.fields.map((f, i) => (
            <FieldGroup key={f.form} form={f.form} items={f.items} defaultOpen={i === 0} />
          ))}
        </section>
      )}

      {!!article.related?.length && (
        <section className="space-y-1.5">
          <h3 className="font-semibold">Related</h3>
          <ul className="space-y-1 text-sm">
            {article.related.map((slug) => {
              const r = articleBySlug(slug)
              return r ? (
                <li key={slug}>
                  <Link to={`/help/${slug}`} onClick={onNavigate} className="text-primary hover:underline">
                    {r.title}
                  </Link>
                </li>
              ) : null
            })}
          </ul>
        </section>
      )}

      <SupportCard topic={article.title} />
    </article>
  )
}

function FieldGroup({
  form,
  items,
  defaultOpen,
}: {
  form: string
  items: { name: string; description: string }[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-medium"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {form}
        <span className="ml-auto text-xs font-normal text-muted-foreground">{items.length} fields</span>
      </button>
      {open && (
        <dl className="divide-y border-t text-sm">
          {items.map((it) => (
            <div key={it.name} className="grid gap-0.5 px-3 py-2 sm:grid-cols-[11rem_1fr] sm:gap-3">
              <dt className="font-medium">{it.name}</dt>
              <dd className="text-muted-foreground">
                <HelpText text={it.description} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

/** "Still stuck?" - email (page link ke saath), chat, phone */
export function SupportCard({ topic = 'Help' }: { topic?: string }) {
  const { data: me } = useMe()
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <div className="flex items-center gap-2 font-medium">
        <LifeBuoy className="size-4 text-primary" /> Still stuck? We're here to help.
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        If you saw an error with a <b>reference number</b>, include it - we can see exactly what happened.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUPPORT.chatUrl && (
          <Button size="sm" asChild>
            <a href={SUPPORT.chatUrl} target="_blank" rel="noreferrer">
              <MessageCircle /> Chat with support
            </a>
          </Button>
        )}
        <Button size="sm" variant={SUPPORT.chatUrl ? 'outline' : 'default'} asChild>
          <a href={supportMailto(`Help: ${topic}`, me?.tenant.name)}>
            <Mail /> Email {SUPPORT.email}
          </a>
        </Button>
        {SUPPORT.phone && (
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${SUPPORT.phone.replace(/\s/g, '')}`}>
              <Phone /> {SUPPORT.phone}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
