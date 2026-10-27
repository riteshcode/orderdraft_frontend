/**
 * Activity log ko insaan ki bhasha mein dikhana (Dashboard "Recent activity", Activity log page, History panels).
 *   describeAction('product.updated') -> 'updated a product'
 *   fieldLabel('payment_terms_days') -> 'Payment terms (days)'
 *   entityLink('supplier', 4) -> '/suppliers/4'
 * Naya action backend mein aaye aur yahan na ho to bhi chalega: "po.sent" -> "po sent".
 */
import type { Activity } from '@/lib/types'

export const ACTION_LABELS: Record<string, string> = {
  // Orders & invoices
  'order.approved': 'approved an order',
  'order.rejected': 'rejected an order',
  'order.created_manual': 'entered an order manually',
  'order.created_portal': 'customer ordered on the portal',
  'order.created_standing': 'order created from a standing order',
  'order.cancelled': 'cancelled an order',
  'standing.created': 'created a standing order',
  'standing.updated': 'changed a standing order',
  'standing.deleted': 'deleted a standing order',
  'standing.skipped': 'standing order not created',
  'standing.skipped_date': 'skipped a standing order delivery',
  'standing.unskipped_date': 'removed a standing order skip',
  'supplier.deleted': 'moved a supplier to the Trash',
  'supplier.restored': 'restored a supplier',
  'supplier.purged': 'deleted a supplier permanently',
  'order.confirmation_sent': 'sent an order confirmation',
  'order.confirmation_failed': 'order confirmation failed',
  'order.confirmation_skipped': 'skipped an order confirmation',
  'export.success': 'exported an order',
  'export.failed': 'export failed',
  'invoice.created': 'created an invoice',
  'invoice.sent': 'sent an invoice',
  'invoice.payment': 'recorded a payment',
  'invoice.voided': 'voided an invoice',
  // Catalog
  'product.created': 'added a product',
  'product.updated': 'updated a product',
  'product.deleted': 'moved a product to Trash',
  'product.restored': 'restored a product',
  'product.activated': 'activated a product',
  'product.deactivated': 'deactivated a product',
  'product.purged': 'permanently deleted a product',
  'customer.created': 'added a customer',
  'customer.updated': 'updated a customer',
  'customer.deleted': 'moved a customer to Trash',
  'customer.restored': 'restored a customer',
  'customer.activated': 'activated a customer',
  'customer.deactivated': 'deactivated a customer',
  'customer.purged': 'permanently deleted a customer',
  'customer.price_added': 'added a pantry product',
  'customer.price_changed': 'changed a special price',
  'customer.price_removed': 'removed a pantry product',
  'customer.portal_access_added': 'gave portal access',
  'customer.portal_access_changed': 'changed portal access',
  'customer.portal_access_removed': 'removed portal access',
  'customer.portal_welcome_sent': 'sent a portal welcome email',
  'customer.portal_password_set': 'portal user set their password',
  'category.created': 'added a category',
  'category.updated': 'updated a category',
  'category.deleted': 'deleted a category',
  'product.bulk_category': 'changed the category of products',
  // Stock & purchasing
  'stock.adjusted': 'adjusted stock',
  'stock.received': 'received stock',
  'supplier.created': 'added a supplier',
  'supplier.updated': 'updated a supplier',
  'supplier.product_linked': 'linked a product to a supplier',
  'supplier.product_updated': 'changed supplier product terms',
  'supplier.product_unlinked': 'unlinked a supplier product',
  'po.created': 'created a purchase order',
  'po.updated': 'edited a purchase order',
  'po.sent': 'emailed a purchase order',
  'po.mark_sent': 'marked a purchase order as sent',
  'po.cancel': 'cancelled a purchase order',
  'po.close': 'closed a purchase order',
  'po.reopen': 'reopened a purchase order',
  'po.deleted': 'deleted a purchase order',
  // Imports & integrations
  'import.products': 'imported products',
  'import.customers': 'imported customers',
  'import.history': 'imported order history',
  'import.suppliers': 'imported suppliers',
  'accounting.connected': 'connected accounting software',
  'accounting.disconnected': 'disconnected accounting software',
  'accounting.synced': 'synced accounting software',
  'accounting.imported': 'imported accounts & tax rates',
  'destination.created': 'added a destination',
  'destination.updated': 'updated a destination',
  'destination.deleted': 'deleted a destination',
  'account_code.created': 'added an account code',
  'account_code.updated': 'updated an account code',
  'account_code.deleted': 'deleted an account code',
  'tax_rate.created': 'added a tax rate',
  'tax_rate.updated': 'updated a tax rate',
  'tax_rate.deleted': 'deleted a tax rate',
  // Account
  'settings.created': 'set up settings',
  'settings.updated': 'changed settings',
  'email.sender_saved': 'saved the sender email',
  'email.sender_verified': 'verified the sender email',
  'team.invited': 'invited a team member',
  'team.joined': 'joined the team',
  'team.updated': 'changed a team member',
  'tenant.registered': 'created the account',
  'billing.subscription': 'changed the subscription',
  'auth.login': 'logged in',
  'auth.login_failed': 'failed login (wrong password)',
  'admin.impersonated': 'support logged in to help',
  'admin.tenant_updated': 'support updated the account',
}

export function describeAction(action: string) {
  return ACTION_LABELS[action] || action.replace(/[._]/g, ' ')
}

/** Filter dropdown: kis cheez ka log */
export const ENTITY_LABELS: Record<string, string> = {
  order: 'Orders',
  invoice: 'Invoices',
  product: 'Products',
  category: 'Categories',
  customer: 'Customers',
  supplier: 'Suppliers',
  purchase_order: 'Purchase orders',
  standing_order: 'Standing orders',
  settings: 'Settings',
  destination: 'Destinations',
  account_code: 'Account codes',
  tax_rate: 'Tax rates',
  user: 'Logins',
}

const FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  name: 'Name',
  price: 'Price',
  unit: 'Unit',
  barcode: 'Barcode',
  description: 'Description',
  purchase_price: 'Purchase price',
  account_code: 'Sales account',
  purchase_account_code: 'Purchase account',
  tax_type: 'Tax rate',
  is_taxable: 'GST applies',
  is_tracked_inventory: 'Track stock',
  reorder_level: 'Reorder level',
  is_active: 'Active',
  category_id: 'Category',
  parent_id: 'Parent category',
  sort_order: 'Sort order',
  must_change_password: 'Must change password',
  code: 'Code',
  email: 'Email',
  other_emails: 'Other emails',
  cc_emails: 'CC emails',
  phone: 'Phone',
  abn: 'ABN',
  contact_name: 'Contact name',
  address: 'Address',
  payment_terms_days: 'Payment terms (days)',
  currency: 'Currency',
  account_number: 'Account number',
  notes: 'Notes',
  unit_cost: 'Cost',
  supplier_sku: 'Supplier code',
  min_order_qty: 'Min order',
  lead_time_days: 'Lead days',
  is_preferred: 'Preferred supplier',
  starts_on: 'Starts on',
  expires_on: 'Expires on',
  note: 'Note',
  business_name: 'Business name',
  gst_rate: 'GST rate',
  deduct_stock_on_approve: 'Reduce stock on approve',
}

export function fieldLabel(key: string) {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function formatValue(v: unknown) {
  if (v === null || v === undefined || v === '') return '(empty)'
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return String(v)
}

/** Record ka page (agar hai) */
export function entityLink(entity: string | null, id: number | null): string | null {
  if (!entity || !id) return null
  const routes: Record<string, string> = {
    order: `/orders/${id}`,
    product: `/products/${id}`,
    invoice: `/invoices/${id}`,
    customer: `/customers/${id}`,
    supplier: `/suppliers/${id}`,
    purchase_order: `/purchase-orders/${id}`,
  }
  return routes[entity] || null
}

/** "Roma 10kg", "PO-0012", "INV-0004" ... detail se record ka naam */
export function recordName(a: Activity): string | null {
  const d = (a.detail || {}) as Record<string, unknown>
  const v = d.name ?? d.number ?? d.product ?? d.sku ?? d.email
  return v ? String(v) : null
}

export function changesOf(a: Activity): [string, unknown, unknown][] {
  const ch = (a.detail as { changes?: Record<string, [unknown, unknown]> } | null)?.changes
  return ch ? Object.entries(ch).map(([k, [o, n]]) => [k, o, n]) : []
}
