import { FileText, Mail, Mic, PenLine } from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import type { Channel } from '@/lib/types'

type Def = { label: string; variant: BadgeVariant }

const ORDER: Record<string, Def> = {
  needs_review: { label: 'Needs review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'info' },
  exported: { label: 'Exported', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}
const MESSAGE: Record<string, Def> = {
  received: { label: 'Queued', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'info' },
  done: { label: 'Draft created', variant: 'success' },
  not_order: { label: 'Not an order', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' },
  blocked: { label: 'Blocked (plan)', variant: 'warning' },
}
const INVOICE: Record<string, Def> = {
  draft: { label: 'Draft', variant: 'secondary' },
  authorised: { label: 'Approved', variant: 'info' },
  sent: { label: 'Sent', variant: 'default' },
  paid: { label: 'Paid', variant: 'success' },
  void: { label: 'Void', variant: 'secondary' },
}
const PO: Record<string, Def> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'info' },
  partial: { label: 'Part received', variant: 'warning' },
  received: { label: 'Received', variant: 'success' },
  closed: { label: 'Closed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
}
const EXPORT: Record<string, Def> = {
  pending: { label: 'Pending', variant: 'secondary' },
  running: { label: 'Sending', variant: 'info' },
  success: { label: 'Sent', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
}
const SUBSCRIPTION: Record<string, Def> = {
  trialing: { label: 'Trial', variant: 'info' },
  active: { label: 'Active', variant: 'success' },
  past_due: { label: 'Past due', variant: 'warning' },
  canceled: { label: 'Canceled', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'destructive' },
}

function make(map: Record<string, Def>) {
  return function StatusBadge({ status }: { status: string }) {
    const def = map[status] || { label: status, variant: 'secondary' as BadgeVariant }
    return <Badge variant={def.variant}>{def.label}</Badge>
  }
}

export const OrderStatusBadge = make(ORDER)
export const MessageStatusBadge = make(MESSAGE)
export const InvoiceStatusBadge = make(INVOICE)
export const POStatusBadge = make(PO)
export const ExportStatusBadge = make(EXPORT)
export const SubscriptionBadge = make(SUBSCRIPTION)

/** Green >= 85, amber >= 60, red neeche */
export function ConfidenceBadge({ value, empty }: { value: number | null | undefined; empty?: boolean }) {
  if (empty) return <Badge variant="destructive">No match</Badge>
  const v = Math.round(value || 0)
  const variant: BadgeVariant = v >= 85 ? 'success' : v >= 60 ? 'warning' : 'destructive'
  return <Badge variant={variant}>{v}%</Badge>
}

const CHANNELS: Record<Channel, { label: string; icon: typeof Mail }> = {
  email: { label: 'Email', icon: Mail },
  voice: { label: 'Voice', icon: Mic },
  pdf: { label: 'PDF', icon: FileText },
  manual: { label: 'Text', icon: PenLine },
}

export function ChannelBadge({ channel }: { channel: Channel | null | undefined }) {
  if (!channel) return <span className="text-muted-foreground">-</span>
  const { label, icon: Icon } = CHANNELS[channel] || CHANNELS.manual
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" /> {label}
    </span>
  )
}
