import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { LoginAnnouncements } from '@/components/layout/Announcements'

/** Login / register pages - left mein form, right mein product pitch */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">OD</div>
            <span className="text-lg font-semibold">OrderDraft</span>
          </Link>
          {/* Super admin ke notices (maintenance etc.) - login se pehle bhi dikhe */}
          <LoginAnnouncements />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
      <div className="hidden flex-col justify-center gap-6 bg-sidebar p-12 text-white lg:flex">
        <h2 className="max-w-md text-3xl font-semibold leading-tight">
          Turn order emails, voicemails and PDFs into ready-to-send orders.
        </h2>
        <ul className="space-y-3 text-slate-300">
          {[
            'Forward emails, upload voice notes and PDF purchase orders',
            'AI matches every line to your SKUs and customers',
            'Review, approve and push to Xero, QuickBooks, MYOB, your API or invoice directly',
            'Gets smarter with every order you approve',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-primary" /> {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
