import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Brain,
  Check,
  ChevronDown,
  Clock,
  Code2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Mic,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Webhook,
  X,
  Zap,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// =====================================================================
// Public homepage (logged-out). Sections: hero, channels, problem,
// how it works, features, integrations, ROI calculator, pricing, FAQ.
// Copy English mein hai (Australian market).
// =====================================================================

// Sales contact - apna email yahan daalo
const CONTACT_EMAIL = 'hello@orderdraft.com.au'

type PublicPlan = {
  code: string
  name: string
  price_aud_month: number
  order_limit: number
  user_limit: number
  features: string[]
}

// API band ho to bhi pricing dikhe
const FALLBACK_PLANS: PublicPlan[] = [
  {
    code: 'starter',
    name: 'Starter',
    price_aud_month: 149,
    order_limit: 300,
    user_limit: 2,
    features: ['300 orders / month', 'Email, voice & PDF orders', 'Xero, QuickBooks, MYOB or CSV export', '2 users'],
  },
  {
    code: 'growth',
    name: 'Growth',
    price_aud_month: 349,
    order_limit: 1000,
    user_limit: 5,
    features: ['1,000 orders / month', 'Everything in Starter', 'Custom API & webhooks', 'OrderDraft invoices', '5 users'],
  },
  {
    code: 'pro',
    name: 'Pro',
    price_aud_month: 799,
    order_limit: 3000,
    user_limit: 15,
    features: ['3,000 orders / month', 'Everything in Growth', 'Priority support', '15 users'],
  },
]

function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30">
        OD
      </div>
      <span className={cn('text-[17px] font-semibold tracking-tight', light ? 'text-white' : 'text-slate-900')}>OrderDraft</span>
    </Link>
  )
}

function Section({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn('px-5 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={cn('mb-3 text-xs font-semibold uppercase tracking-[0.18em]', dark ? 'text-blue-300' : 'text-blue-600')}>
      {children}
    </p>
  )
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
  dark,
  center = true,
}: {
  eyebrow: string
  title: ReactNode
  subtitle?: ReactNode
  dark?: boolean
  center?: boolean
}) {
  return (
    <div className={cn('mb-14 max-w-2xl', center && 'mx-auto text-center')}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2 className={cn('text-3xl font-bold tracking-tight sm:text-4xl', dark ? 'text-white' : 'text-slate-900')}>{title}</h2>
      {subtitle && <p className={cn('mt-4 text-base leading-relaxed', dark ? 'text-slate-400' : 'text-slate-600')}>{subtitle}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    ['Features', '#features'],
    ['How it works', '#how'],
    ['Pricing', '#pricing'],
    ['FAQ', '#faq'],
  ]

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all',
        scrolled ? 'border-b border-white/10 bg-slate-950/80 backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo light />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="text-sm text-slate-300 transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-blue-50"
          >
            Start free trial
          </Link>
        </div>
        <button className="text-white md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-slate-950 px-5 py-4 md:hidden">
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="block py-2 text-slate-300">
              {label}
            </a>
          ))}
          <div className="mt-3 flex gap-3">
            <Link to="/login" className="flex-1 rounded-lg border border-white/20 py-2 text-center text-white">
              Log in
            </Link>
            <Link to="/register" className="flex-1 rounded-lg bg-white py-2 text-center font-semibold text-slate-900">
              Free trial
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ---------------------------------------------------------------------
// Hero mock - email in, draft order out (sirf UI, real data nahi)
// ---------------------------------------------------------------------
const MOCK_LINES = [
  { said: '2 box romas', product: 'Roma Tomatoes 10kg', sku: 'TOM-ROMA-10KG', qty: 2, conf: 98, tag: 'learned' },
  { said: '6 cos', product: 'Cos Lettuce', sku: 'LET-COS-EA', qty: 6, conf: 95, tag: 'exact' },
  { said: '1 tray avos', product: 'Hass Avocados Tray (20)', sku: 'AVO-HASS-TRAY', qty: 1, conf: 96, tag: 'alias' },
  { said: 'the usual reds', product: 'Red Capsicum 5kg', sku: 'CAP-RED-5KG', qty: 1, conf: 98, tag: 'learned' },
]

function ConfPill({ value }: { value: number }) {
  const tone =
    value >= 85 ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30' : 'bg-amber-500/15 text-amber-300 ring-amber-400/30'
  return <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1', tone)}>{value}%</span>
}

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* glow */}
      <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-tr from-blue-600/30 via-violet-600/20 to-transparent blur-3xl" />

      <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
        {/* Incoming email */}
        <div className="od-float-slow rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
            <Mail className="size-3.5 text-blue-400" /> Fwd: Order for tomorrow
            <span className="ml-auto">9:42 pm</span>
          </div>
          <p className="text-[11px] text-slate-500">From: Joe &lt;orders@joescafe.com.au&gt;</p>
          <div className="mt-3 space-y-1 font-mono text-[12px] leading-relaxed text-slate-300">
            <p>Hi team, for tomorrow pls:</p>
            <p>2 box romas</p>
            <p>6 cos</p>
            <p>1 tray avos</p>
            <p>+ the usual reds</p>
            <p className="pt-1 text-slate-500">Leave at back door. Cheers, Joe</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400">
              <Mic className="size-3" /> voicemail.m4a
            </span>
            <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400">
              <FileText className="size-3" /> PO-7781.pdf
            </span>
          </div>
        </div>

        {/* Draft order */}
        <div className="od-float rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-blue-950/50 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Draft order #1042</p>
              <p className="text-sm font-semibold text-white">Joe's Cafe Bondi</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-medium text-blue-300 ring-1 ring-blue-400/30">
              <Sparkles className="size-3" /> AI draft · 4s
            </span>
          </div>
          <div className="space-y-1.5">
            {MOCK_LINES.map((l, i) => (
              <div
                key={l.sku}
                className="od-pop flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2"
                style={{ animationDelay: `${0.3 + i * 0.15}s` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-slate-500">“{l.said}”</p>
                  <p className="truncate text-[12px] font-medium text-slate-200">{l.product}</p>
                </div>
                <span className="text-[12px] text-slate-400">×{l.qty}</span>
                <ConfPill value={l.conf} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-[11px] text-slate-500">Delivery: Tomorrow · Back door</span>
            <span className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white">
              <Check className="size-3" /> Approve
            </span>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="od-float absolute -bottom-6 left-4 hidden items-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 shadow-xl backdrop-blur sm:flex">
        <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/20">
          <RefreshCw className="size-3.5 text-emerald-400" />
        </div>
        Draft invoice created in Xero
      </div>
      <div className="od-float-slow absolute -top-5 right-6 hidden items-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 shadow-xl backdrop-blur sm:flex">
        <Brain className="size-4 text-violet-400" /> Learned: “the usual reds” → CAP-RED-5KG
      </div>
    </div>
  )
}

function Hero({ trialDays }: { trialDays: number }) {
  return (
    <section className="od-grid-bg relative overflow-hidden bg-slate-950 px-5 pb-24 pt-32 sm:pt-40">
      <div className="absolute left-1/2 top-0 -z-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="od-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <span className="size-1.5 rounded-full bg-emerald-400" /> Built for Australian wholesalers & distributors
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            Orders in.{' '}
            <span className="whitespace-nowrap bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Drafts out.
            </span>
            <br />
            No more retyping.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
            OrderDraft reads your customers' order emails, voicemails, PDF purchase orders and texts, matches every line to your
            SKUs, and hands your team a ready-to-approve order. One click sends it to Xero, QuickBooks or MYOB.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition hover:bg-blue-50"
            >
              Start {trialDays}-day free trial <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              See how it works
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            {['No credit card needed', 'Works with Xero, QuickBooks & MYOB', 'Set up in an afternoon'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" /> {t}
              </span>
            ))}
          </div>
        </div>
        <div className="od-fade-up" style={{ animationDelay: '0.15s' }}>
          <HeroMock />
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------
function Channels() {
  const items = [
    { icon: Mail, title: 'Email', text: 'Forward or auto-forward from any inbox' },
    { icon: Mic, title: 'Voicemail', text: 'Australian accents, transcribed' },
    { icon: FileText, title: 'PDF POs', text: 'Typed or scanned purchase orders' },
    { icon: MessageSquare, title: 'SMS & chat', text: 'Paste a text or WhatsApp message' },
    { icon: ImageIcon, title: 'Photos', text: 'Even a handwritten order sheet' },
  ]
  return (
    <section className="border-b bg-white px-5 py-14">
      <div className="mx-auto max-w-6xl">
        <p className="mb-8 text-center text-sm font-medium text-slate-500">
          Your customers order however they like. OrderDraft understands all of it.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((c) => (
            <div key={c.title} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
                <c.icon className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                <p className="text-xs leading-snug text-slate-500">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Problem -> solution
// ---------------------------------------------------------------------
function Problem() {
  const before = [
    'Orders arrive overnight across email, voicemail and texts',
    'Someone re-types every line into the accounting system before the trucks leave',
    '"2 box romas" - which SKU was that again?',
    'Typos, missed lines and wrong customers slip through',
  ]
  const after = [
    'Every order lands in one inbox, already drafted',
    'Lines are matched to your SKUs with a confidence score',
    'Your team only checks the amber lines, then clicks approve',
    'It goes straight to Xero, QuickBooks, MYOB, your ERP or an invoice, with no retyping',
  ]
  return (
    <Section className="bg-white">
      <SectionTitle
        eyebrow="Why OrderDraft"
        title="The 5am order scramble, solved"
        subtitle="Manual order entry is slow, error-prone and the first job of the day. OrderDraft takes it off your team's plate."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <p className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-400">Today</p>
          <ul className="space-y-4">
            {before.map((t) => (
              <li key={t} className="flex gap-3 text-slate-600">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <X className="size-3 text-red-600" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-violet-50 p-8">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-blue-400/20 blur-3xl" />
          <p className="mb-5 text-sm font-semibold uppercase tracking-wide text-blue-600">With OrderDraft</p>
          <ul className="relative space-y-4">
            {after.map((t) => (
              <li key={t} className="flex gap-3 text-slate-800">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600">
                  <Check className="size-3 text-white" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Bring your catalog',
      text: 'Connect Xero, QuickBooks or MYOB, or upload any CSV/Excel file. Match the columns once and we remember them.',
    },
    {
      icon: Mail,
      title: 'Forward your orders',
      text: 'You get a unique order address. Point your inbox rules at it, or drop in voicemails and PDFs.',
    },
    {
      icon: Bot,
      title: 'AI drafts the order',
      text: 'Customer, products, quantities, PO number and delivery date are extracted and matched in seconds.',
    },
    {
      icon: Send,
      title: 'Review & send',
      text: 'Check the amber lines, approve, and it goes to your accounting software, your ERP, a webhook or a tax invoice.',
    },
  ]
  return (
    <Section id="how" className="bg-slate-50">
      <SectionTitle eyebrow="How it works" title="From inbox to your books in four steps" />
      <div className="relative grid gap-6 md:grid-cols-4">
        <div className="od-flow-line absolute left-[12%] right-[12%] top-8 hidden h-px md:block" />
        {steps.map((s, i) => (
          <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-600/25">
              <s.icon className="size-7 text-white" />
              <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white ring-4 ring-slate-50">
                {i + 1}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------
// Features (bento grid)
// ---------------------------------------------------------------------
function FeatureCard({
  icon: Icon,
  title,
  text,
  className,
  children,
}: {
  icon: typeof Mail
  title: string
  text: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]',
        className,
      )}
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-400/20">
        <Icon className="size-5 text-blue-400" />
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
      {children}
    </div>
  )
}

function Features() {
  return (
    <Section id="features" className="od-grid-bg bg-slate-950">
      <SectionTitle
        dark
        eyebrow="Features"
        title="Everything between “order received” and “order invoiced”"
        subtitle="Not just an email parser. OrderDraft is the whole order desk: catalog, matching, review, delivery and invoicing."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {/* Big: learning */}
        <FeatureCard
          icon={Brain}
          title="Matching that learns your customers"
          text="Fix a line once and OrderDraft remembers it for that customer. It also learns from order history, so “the usual” means the right SKU."
          className="md:col-span-2"
        >
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {[
              ['“the usual reds”', 'Red Capsicum 5kg', 'learned · 98%'],
              ['“romas”', 'Roma Tomatoes 10kg', 'alias · 96%'],
              ['“lettuce”', 'Cos Lettuce', 'history · 91%'],
            ].map(([a, b, c]) => (
              <div key={a} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <p className="text-xs text-slate-500">{a}</p>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-200">
                  <ArrowRight className="size-3 text-blue-400" /> {b}
                </p>
                <p className="mt-1 text-[11px] text-emerald-400">{c}</p>
              </div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard
          icon={RefreshCw}
          title="Two-way accounting sync"
          text="Xero, QuickBooks Online or MYOB: sync products and customers with one click (or nightly). Approved orders become invoices, quotes or sales orders, and paid status flows back."
        >
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded-md bg-white/5 px-2 py-1">Items</span>
            <span className="rounded-md bg-white/5 px-2 py-1">Contacts</span>
            <span className="rounded-md bg-white/5 px-2 py-1">Invoices</span>
          </div>
        </FeatureCard>

        <FeatureCard
          icon={FileSpreadsheet}
          title="Import any spreadsheet"
          text="Any CSV or Excel layout works. We suggest the column mapping, show a preview, and remember it for next time."
        />

        <FeatureCard
          icon={Mic}
          title="Voice & PDF ready"
          text="Voicemails are transcribed with Australian-English models. Scanned and typed PDFs and photos are read too."
        />

        <FeatureCard
          icon={Code2}
          title="Send it anywhere"
          text="Xero, QuickBooks, MYOB, our built-in invoices, your own ERP's REST API with field mapping, or signed webhooks for Zapier and Make."
        />

        <FeatureCard
          icon={FileText}
          title="Tax invoices built in"
          text="No accounting software? OrderDraft creates GST-compliant tax invoices, emails the PDF and tracks payments and overdue balances."
        />

        <FeatureCard
          icon={BarChart3}
          title="Know your numbers"
          text="Orders, value, AI accuracy, time saved, invoices outstanding and your top customers on one dashboard."
        />

        <FeatureCard
          icon={Users}
          title="Built for teams"
          text="Owners, admins and reviewers each get the right access. Every approval and export is logged."
        />
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------
// Review screen spotlight
// ---------------------------------------------------------------------
function Spotlight() {
  const points = [
    {
      icon: Zap,
      title: 'Side-by-side review',
      text: 'The original email, voicemail transcript or PDF sits next to the AI draft, so checking takes seconds.',
    },
    {
      icon: BadgeCheck,
      title: 'Confidence on every line',
      text: 'Green lines are safe. Amber lines show the top suggestions, including what that customer usually orders.',
    },
    {
      icon: Clock,
      title: 'Retries you never think about',
      text: 'If your accounting software or API is down, OrderDraft retries automatically and logs every attempt.',
    },
  ]
  return (
    <Section className="bg-white">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionTitle
            center={false}
            eyebrow="Human in the loop"
            title="AI does the typing. Your team stays in control."
            subtitle="Nothing reaches your accounts until a person approves it. Review screens are designed to be fast, even before the first coffee."
          />
          <div className="space-y-6">
            {points.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-100">
                  <p.icon className="size-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review mock (light) */}
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-blue-100 to-violet-100 blur-2xl" />
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            <div className="flex items-center gap-1.5 border-b bg-slate-50 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-slate-400">Order #1043 · Harbour View Hotel</span>
            </div>
            <div className="divide-y">
              {[
                ['“10 bags potatoes”', 'Washed Potatoes 20kg', 'history', 94, false],
                ['“3 bags onions”', 'Brown Onions 20kg', 'history', 92, false],
                ['“2 capsicum”', 'Red Capsicum 5kg', 'suggested', 78, true],
                ['“5 lemons”', 'Lemons 15kg', 'fuzzy', 81, true],
              ].map(([said, product, method, conf, warn]) => (
                <div key={String(said)} className={cn('flex items-center gap-3 px-4 py-3', warn && 'bg-amber-50/60')}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">{said}</p>
                    <div
                      className={cn(
                        'mt-1 flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm',
                        warn ? 'border-amber-300 bg-white' : 'border-slate-200',
                      )}
                    >
                      <span className="truncate text-slate-800">{product}</span>
                      <ChevronDown className="size-3.5 text-slate-400" />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        Number(conf) >= 85 ? 'bg-green-50 text-green-700' : 'bg-amber-100 text-amber-700',
                      )}
                    >
                      {conf}%
                    </span>
                    <p className="mt-1 text-[10px] text-slate-400">{method}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
              <span className="text-xs text-slate-500">2 lines need a quick look</span>
              <span className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Approve & send to Xero</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------
function Integrations() {
  const live: { icon: typeof Mail; name: string; text: string; chips?: string[] }[] = [
    {
      icon: RefreshCw,
      name: 'Accounting software',
      text: 'Products, customers, invoices, quotes',
      chips: ['Xero', 'QuickBooks', 'MYOB'],
    },
    { icon: Mail, name: 'Email forwarding', text: 'Any inbox: Outlook, Gmail, Google Workspace' },
    { icon: Code2, name: 'REST API', text: 'Map fields to your own system' },
    { icon: Webhook, name: 'Webhooks', text: 'Zapier, Make, n8n and more' },
    { icon: FileSpreadsheet, name: 'CSV / Excel', text: 'Import and export' },
    { icon: FileText, name: 'OrderDraft Invoices', text: 'PDF tax invoices with GST' },
  ]
  return (
    <Section className="bg-slate-50">
      <SectionTitle
        eyebrow="Integrations"
        title="Fits the way you already work"
        subtitle="Keep your accounting system. OrderDraft sits in front of it and feeds it clean orders."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {live.map((i) => (
          <div key={i.name} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700">
              <i.icon className="size-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{i.name}</p>
              <p className="text-sm text-slate-500">{i.text}</p>
              {i.chips && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {i.chips.map((c) => (
                    <span key={c} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">
        Coming soon: <span className="font-medium text-slate-700">Unleashed · Cin7 · Reckon · SMS & voicemail number</span>
      </p>
    </Section>
  )
}

// ---------------------------------------------------------------------
// ROI calculator - backend ke "time saved" estimate jaisa hi formula
// ---------------------------------------------------------------------
function RoiCalculator() {
  const [ordersPerDay, setOrdersPerDay] = useState(40)
  const [linesPerOrder, setLinesPerOrder] = useState(8)
  const [hourlyCost, setHourlyCost] = useState(38)

  const SECONDS_PER_ORDER = 120
  const SECONDS_PER_LINE = 30
  const workDays = 22
  const hoursPerMonth = (ordersPerDay * workDays * (SECONDS_PER_ORDER + linesPerOrder * SECONDS_PER_LINE)) / 3600
  const savingPerMonth = hoursPerMonth * hourlyCost

  const Slider = ({
    label,
    value,
    min,
    max,
    step = 1,
    suffix,
    onChange,
  }: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    suffix: string
    onChange: (v: number) => void
  }) => (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  )

  return (
    <Section className="bg-white">
      <div className="overflow-hidden rounded-3xl bg-slate-950 shadow-2xl">
        <div className="grid lg:grid-cols-2">
          <div className="space-y-6 p-8 sm:p-12">
            <Eyebrow dark>ROI calculator</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-white">How much time does manual entry cost you?</h2>
            <Slider label="Orders per day" value={ordersPerDay} min={5} max={300} step={5} suffix="" onChange={setOrdersPerDay} />
            <Slider label="Lines per order" value={linesPerOrder} min={1} max={40} suffix="" onChange={setLinesPerOrder} />
            <Slider label="Staff cost per hour (AUD)" value={hourlyCost} min={25} max={80} suffix="" onChange={setHourlyCost} />
            <p className="text-xs text-slate-500">
              Estimate based on ~2 minutes per order plus ~30 seconds per line of manual entry, over 22 working days.
            </p>
          </div>
          <div className="relative flex flex-col justify-center gap-8 bg-gradient-to-br from-blue-600 to-violet-700 p-8 sm:p-12">
            <div className="absolute inset-0 od-grid-bg opacity-40" />
            <div className="relative">
              <p className="text-sm text-blue-100">Hours of typing saved every month</p>
              <p className="mt-1 text-5xl font-extrabold tracking-tight text-white">{Math.round(hoursPerMonth)} hrs</p>
            </div>
            <div className="relative">
              <p className="text-sm text-blue-100">Estimated staff cost saved</p>
              <p className="mt-1 text-5xl font-extrabold tracking-tight text-white">
                ${Math.round(savingPerMonth).toLocaleString('en-AU')}
                <span className="text-xl font-semibold text-blue-200"> / month</span>
              </p>
            </div>
            <Link
              to="/register"
              className="relative inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-blue-50"
            >
              Start saving this week <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------
// Pricing - backend /public/plans se (Super admin mein badlo to yahan bhi badle)
// ---------------------------------------------------------------------
function Pricing({ plans, trialDays }: { plans: PublicPlan[]; trialDays: number }) {
  const popular = plans.length >= 2 ? plans[1].code : plans[0]?.code
  return (
    <Section id="pricing" className="bg-slate-50">
      <SectionTitle
        eyebrow="Pricing"
        title="Simple monthly plans"
        subtitle={`Every plan starts with a ${trialDays}-day free trial. Prices in AUD, excluding GST. Cancel any time.`}
      />
      <div className={cn('grid gap-6', plans.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
        {plans.map((p) => {
          const highlight = p.code === popular
          return (
            <div
              key={p.code}
              className={cn(
                'relative flex flex-col rounded-2xl border p-8',
                highlight
                  ? 'border-transparent bg-slate-950 text-white shadow-2xl shadow-blue-900/30 ring-2 ring-blue-500'
                  : 'border-slate-200 bg-white',
              )}
            >
              {highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className={cn('text-lg font-semibold', highlight ? 'text-white' : 'text-slate-900')}>{p.name}</h3>
              <p className={cn('mt-1 text-sm', highlight ? 'text-slate-400' : 'text-slate-500')}>
                Up to {p.order_limit.toLocaleString('en-AU')} orders / month
              </p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className={cn('text-5xl font-extrabold tracking-tight', highlight ? 'text-white' : 'text-slate-900')}>
                  ${p.price_aud_month.toLocaleString('en-AU')}
                </span>
                <span className={highlight ? 'text-slate-400' : 'text-slate-500'}>/month</span>
              </p>
              <ul className="my-8 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className={cn('flex items-start gap-2 text-sm', highlight ? 'text-slate-300' : 'text-slate-600')}>
                    <Check className={cn('mt-0.5 size-4 shrink-0', highlight ? 'text-blue-400' : 'text-blue-600')} /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={cn(
                  'rounded-xl py-3 text-center text-sm font-semibold transition',
                  highlight ? 'bg-white text-slate-900 hover:bg-blue-50' : 'bg-slate-900 text-white hover:bg-slate-800',
                )}
              >
                Start free trial
              </Link>
            </div>
          )
        })}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">
        More than 3,000 orders a month, or need a custom integration?{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-600 hover:underline">
          Talk to us
        </a>
      </p>
    </Section>
  )
}

// ---------------------------------------------------------------------
// Security strip
// ---------------------------------------------------------------------
function Security() {
  const items = [
    { icon: Lock, text: 'Accounting tokens and API keys encrypted at rest' },
    { icon: ShieldCheck, text: 'Every business’s data kept separate' },
    { icon: Users, text: 'Role-based access & full activity log' },
    { icon: BadgeCheck, text: 'Nothing exported without human approval' },
  ]
  return (
    <section className="border-y bg-white px-5 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.text} className="flex items-center gap-3 text-sm text-slate-600">
            <i.icon className="size-5 shrink-0 text-emerald-600" /> {i.text}
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------
function Faq() {
  const faqs = [
    [
      'Do my customers need to change how they order?',
      'No. They keep emailing, calling and texting the way they do now. You forward those orders to your OrderDraft address (or set up an automatic inbox rule) and we take it from there.',
    ],
    [
      'How accurate is the AI?',
      'Each line gets a confidence score. Lines it is sure about are green; anything uncertain is highlighted with suggestions so a person can confirm it. Accuracy improves as you approve orders, because OrderDraft learns how each customer names your products.',
    ],
    [
      'Does it work with Xero, QuickBooks and MYOB?',
      'Yes. Connect one of them to sync your items and customers, then approved orders become invoices, quotes or sales orders. Invoice status (sent, paid) is tracked back in OrderDraft.',
    ],
    [
      'We don’t use any of those. Can we still use it?',
      'Yes. Import your catalog from any CSV or Excel file, then send approved orders to your own system’s API, a webhook, a CSV export, or let OrderDraft create and email GST tax invoices for you.',
    ],
    [
      'What about voicemails and handwritten orders?',
      'Upload voice notes (MP3, M4A, WAV and more) and they are transcribed with Australian-English speech recognition. PDFs, scans and photos of order sheets are read as well.',
    ],
    [
      'What happens if we go over our monthly orders?',
      'We never drop a customer’s order. You get a warning as you approach your limit, and processing continues past it for a while so you have time to upgrade.',
    ],
    [
      'Is our data safe?',
      'Connections to your accounting software and systems are encrypted, each business has its own separate database, and nothing is sent to your accounting system without someone on your team approving it.',
    ],
  ]
  return (
    <Section id="faq" className="bg-white">
      <SectionTitle eyebrow="FAQ" title="Questions, answered" />
      <div className="mx-auto max-w-3xl divide-y rounded-2xl border border-slate-200">
        {faqs.map(([q, a]) => (
          <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
              {q}
              <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------
// Final CTA + footer
// ---------------------------------------------------------------------
function FinalCta({ trialDays }: { trialDays: number }) {
  return (
    <section className="px-5 pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-950 px-8 py-16 text-center sm:px-16">
        <div className="od-grid-bg absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-blue-600/30 blur-[100px]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Tomorrow’s orders could already be drafted.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Set up OrderDraft this afternoon. Import your catalog, forward one email and watch the draft appear.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-blue-50"
            >
              Start {trialDays}-day free trial <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t bg-white px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo />
        <div className="flex gap-6 text-sm text-slate-500">
          <a href="#features" className="hover:text-slate-900">
            Features
          </a>
          <a href="#pricing" className="hover:text-slate-900">
            Pricing
          </a>
          <a href="#faq" className="hover:text-slate-900">
            FAQ
          </a>
          <Link to="/login" className="hover:text-slate-900">
            Log in
          </Link>
        </div>
        <p className="text-sm text-slate-400">© {new Date().getFullYear()} OrderDraft. Made for Australian wholesale.</p>
      </div>
    </footer>
  )
}

export default function Landing() {
  const { data } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => api.get<{ trial_days: number; plans: PublicPlan[] }>('/public/plans'),
    retry: false,
  })
  const plans = data?.plans?.length ? data.plans : FALLBACK_PLANS
  const trialDays = data?.trial_days ?? 14

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[15px] antialiased">
      <Navbar />
      <Hero trialDays={trialDays} />
      <Channels />
      <Problem />
      <HowItWorks />
      <Features />
      <Spotlight />
      <Integrations />
      <RoiCalculator />
      <Pricing plans={plans} trialDays={trialDays} />
      <Security />
      <Faq />
      <FinalCta trialDays={trialDays} />
      <Footer />
    </div>
  )
}
