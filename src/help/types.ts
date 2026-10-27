/**
 * Help Center (knowledge base) article format.
 *
 * Body text mini-format (renderer: components/help/HelpText.tsx):
 *   - Blank line = new paragraph
 *   - Line starting with "- " = bullet,  "1. " = numbered step
 *   - **bold**, `code`
 *   - [Link text](/route)  -> app ke andar link
 *   - Line starting with "> " = tip box
 */
export type HelpCategory =
  | 'Getting started'
  | 'Orders'
  | 'Catalog'
  | 'Stock & purchasing'
  | 'Invoices'
  | 'Reports'
  | 'Integrations'
  | 'Account & settings'
  | 'Troubleshooting'

export interface HelpField {
  name: string // exactly as the label on screen, e.g. "Payment terms (days)"
  description: string // what it does, when to fill it, example
}

export interface HelpSection {
  heading: string
  body: string
}

export interface HelpArticle {
  slug: string // url: /help/<slug>
  title: string
  category: HelpCategory
  summary: string // one line, shown in search results
  keywords?: string // extra search words (synonyms, Hindi/Hinglish not needed)
  path?: string // app page this article is about, e.g. "/suppliers" ("Open page" button)
  sections: HelpSection[]
  fields?: { form: string; items: HelpField[] }[] // field glossary per form/dialog on that page
  related?: string[] // other slugs
}
