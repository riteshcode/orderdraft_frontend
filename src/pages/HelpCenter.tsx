import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, ChevronLeft, Keyboard, Search } from 'lucide-react'
import { ARTICLES, articleBySlug, CATEGORIES, searchArticles } from '@/help'
import { PageHeader } from '@/components/common/PageHeader'
import { HelpArticleView, SupportCard } from '@/components/help/HelpArticleView'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * Help Center (knowledge base)  /help  aur  /help/:slug
 * Har module, har field ka matlab. Na mile to neeche "Contact support".
 */
export default function HelpCenter() {
  const { slug } = useParams()
  const article = articleBySlug(slug)
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchArticles(query), [query])

  if (slug && article)
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/help" className="mb-3 inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" /> Help Center
        </Link>
        <Card>
          <CardContent className="pt-5">
            <HelpArticleView article={article} />
          </CardContent>
        </Card>
      </div>
    )

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={
          <>
            <BookOpen className="size-5 text-primary" /> Help Center
          </>
        }
        description="How every page and field works. Search, or pick a topic."
      />
      <div className="relative mb-5 max-w-xl">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          autoFocus
          aria-label="Search help"
          className="h-10 pl-9"
          placeholder="e.g. min order, special price, barcode, sync, reference number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim().length > 1 ? (
        <Card>
          <CardContent className="divide-y pt-2">
            {results.map((a) => (
              <Link key={a.slug} to={`/help/${a.slug}`} className="block py-2.5 hover:bg-muted/40">
                <div className="text-sm font-medium text-primary">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.category} · {a.summary}
                </div>
              </Link>
            ))}
            {!results.length && (
              <p className="py-4 text-sm text-muted-foreground">Nothing found. Try another word, or contact support below.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const list = ARTICLES.filter((a) => a.category === cat)
            if (!list.length) return null
            return (
              <Card key={cat}>
                <CardContent className="space-y-1.5 pt-4">
                  <h2 className="text-sm font-semibold">{cat}</h2>
                  <ul className="space-y-1 text-sm">
                    {list.map((a) => (
                      <li key={a.slug}>
                        <Link to={`/help/${a.slug}`} className="text-primary hover:underline">
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Keyboard className="size-4" /> Tip: press <kbd className="rounded border bg-muted px-1.5 text-xs">Ctrl</kbd> +{' '}
        <kbd className="rounded border bg-muted px-1.5 text-xs">K</kbd> anywhere to jump to a page, record or help article.
      </div>
      <div className="mt-4">
        <SupportCard />
      </div>
    </div>
  )
}
