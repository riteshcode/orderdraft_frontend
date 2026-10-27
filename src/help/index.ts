/**
 * Help Center helpers.
 *   articleForPath('/suppliers/12') -> suppliers article (top bar "Help" button isi se khulta hai)
 *   searchArticles('min order')      -> title / summary / keywords / poore text mein search
 * Naya article: help/articles.ts mein add karo (format help/types.ts mein).
 */
import { ARTICLES } from './articles'
import type { HelpArticle, HelpCategory } from './types'

export { ARTICLES }
export type { HelpArticle }

export const CATEGORIES: HelpCategory[] = [
  'Getting started',
  'Orders',
  'Catalog',
  'Stock & purchasing',
  'Invoices',
  'Reports',
  'Integrations',
  'Account & settings',
  'Troubleshooting',
]

const bySlug = new Map(ARTICLES.map((a) => [a.slug, a]))
export const articleBySlug = (slug?: string) => (slug ? bySlug.get(slug) : undefined)

/** Page (URL) -> article. Pehla match jeetta hai, isliye specific upar. */
const ROUTES: [RegExp, string][] = [
  [/^\/orders\/new/, 'how-orders-arrive'],
  [/^\/orders\/\d+/, 'review-approve-order'],
  [/^\/orders/, 'orders-list'],
  [/^\/inbox/, 'inbox-log'],
  [/^\/invoices/, 'invoices'],
  [/^\/products\/labels/, 'barcodes-labels'],
  [/^\/products\/\d+/, 'product-page'],
  [/^\/categories/, 'categories'],
  [/^\/reports/, 'reports'],
  [/^\/products/, 'products'],
  [/^\/stock-receipts/, 'receiving-stock'],
  [/^\/stock/, 'stock'],
  [/^\/customers\/\d+/, 'customers'],
  [/^\/customers/, 'customers'],
  [/^\/suppliers/, 'suppliers'],
  [/^\/purchase-orders\/suggestions/, 'reorder-suggestions'],
  [/^\/purchase-orders/, 'purchase-orders'],
  [/^\/imports/, 'import-data'],
  [/^\/destinations/, 'destinations'],
  [/^\/exports/, 'export-log'],
  [/^\/integrations/, 'integrations'],
  [/^\/settings\/portal/, 'customer-portal'],
  [/^\/settings\/accounting/, 'accounts-tax-rates'],
  [/^\/settings\/email/, 'email-settings'],
  [/^\/settings\/team/, 'team-roles'],
  [/^\/settings\/billing/, 'billing-plans'],
  [/^\/settings/, 'settings'],
  [/^\/activity/, 'activity-log'],
  [/^\/$/, 'dashboard'],
]

export function articleForPath(pathname: string): HelpArticle | undefined {
  const hit = ROUTES.find(([re]) => re.test(pathname))
  return hit ? bySlug.get(hit[1]) : undefined
}

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Search index: title sabse zyada weight, phir keywords/summary, phir field names, phir body text
const index = ARTICLES.map((a) => ({
  a,
  title: norm(a.title),
  meta: norm(`${a.summary} ${a.keywords || ''} ${a.category}`),
  fields: norm((a.fields || []).flatMap((f) => [f.form, ...f.items.map((i) => `${i.name} ${i.description}`)]).join(' ')),
  body: norm(a.sections.map((s) => `${s.heading} ${s.body}`).join(' ')),
}))

export function searchArticles(query: string, limit = 20): HelpArticle[] {
  const words = norm(query)
    .split(/\s+/)
    .filter((w) => w.length > 1)
  if (!words.length) return []
  return index
    .map((x) => {
      let score = 0
      for (const w of words) {
        const s =
          (x.title.includes(w) ? 10 : 0) +
          (x.meta.includes(w) ? 5 : 0) +
          (x.fields.includes(w) ? 3 : 0) +
          (x.body.includes(w) ? 1 : 0)
        if (!s) return { a: x.a, score: 0 } // har word kahin to mile
        score += s
      }
      return { a: x.a, score }
    })
    .filter((r) => r.score > 0)
    .sort((p, q) => q.score - p.score)
    .slice(0, limit)
    .map((r) => r.a)
}
