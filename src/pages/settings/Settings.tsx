import { Link, Navigate, useParams } from 'react-router-dom'
import { BookOpen, Boxes, CreditCard, FileText, Mail, Settings as SettingsIcon, Store, Users } from 'lucide-react'
import { usePermission } from '@/hooks/useMe'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { GeneralSettings } from './GeneralSettings'
import { InvoiceSettings } from './InvoiceSettings'
import { TeamSettings } from './TeamSettings'
import { BillingSettings } from './BillingSettings'
import { AccountingSettings } from './AccountingSettings'
import { EmailSettings } from './EmailSettings'
import { StockSettings } from './StockSettings'
import { PortalSettings } from './PortalSettings'

export default function Settings() {
  const { tab = 'general' } = useParams()
  const { isAdmin, isOwner } = usePermission()

  // Kaunse tabs dikhenge - reviewer ko team nahi, sirf owner ko billing
  const tabs = [
    { key: 'general', label: 'General', icon: SettingsIcon, show: true },
    { key: 'invoice', label: 'Invoices', icon: FileText, show: true },
    { key: 'accounting', label: 'Accounts & Tax', icon: BookOpen, show: true },
    { key: 'stock', label: 'Stock', icon: Boxes, show: true },
    { key: 'portal', label: 'Customer portal', icon: Store, show: true },
    { key: 'email', label: 'Email', icon: Mail, show: isAdmin },
    { key: 'team', label: 'Team', icon: Users, show: isAdmin },
    { key: 'billing', label: 'Billing', icon: CreditCard, show: isOwner },
  ].filter((t) => t.show)

  if (!['general', 'invoice', 'accounting', 'stock', 'portal', 'email', 'team', 'billing'].includes(tab))
    return <Navigate to="/settings/general" replace />

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Business details, invoicing, accounts & tax, stock, customer portal, email, team and billing."
      />

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            to={`/settings/${t.key}`}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="size-4" /> {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'general' && <GeneralSettings />}
      {tab === 'invoice' && <InvoiceSettings />}
      {tab === 'accounting' && <AccountingSettings />}
      {tab === 'stock' && <StockSettings />}
      {tab === 'portal' && <PortalSettings />}
      {tab === 'email' && (isAdmin ? <EmailSettings /> : <Navigate to="/settings/general" replace />)}
      {tab === 'team' && (isAdmin ? <TeamSettings /> : <Navigate to="/settings/general" replace />)}
      {tab === 'billing' && (isOwner ? <BillingSettings /> : <Navigate to="/settings/general" replace />)}
    </div>
  )
}
