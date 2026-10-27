// Backend API response types. Backend change ho to yahan bhi update karo.

export type Role = 'owner' | 'admin' | 'reviewer'

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Usage {
  plan_code: string | null
  plan_name: string | null
  orders_used: number
  orders_limit: number
  percent: number
  users_used: number
  users_limit: number
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
  trial_ends_at: string | null
  current_period_end: string | null
  can_process: boolean
  blocked_reason: string
}

export interface Me {
  id: number
  name: string
  email: string
  role: Role
  is_superadmin: boolean
  impersonating: boolean
  tenant: { id: number; name: string; slug: string; status: string; inbound_email: string }
  usage: Usage
  accounting: {
    provider: ProviderKey | null
    status: 'connected' | 'pending_org' | null
    connected: boolean
    org_name: string | null
    last_sync_at: string | null
  }
}

export interface LoginResponse {
  token: string
  user: Me
}

// ---------- Catalog ----------
export interface Product {
  id: number
  sku: string
  barcode: string | null
  name: string
  description: string | null
  unit: string | null
  price: number | null
  is_taxable: boolean
  account_code: string | null
  tax_type: string | null
  is_active: boolean
  source: 'manual' | 'csv' | ProviderKey
  external_id: string | null
  // Purchase / inventory (Xero Item jaisa)
  purchase_description: string | null
  purchase_price: number | null
  purchase_account_code: string | null
  purchase_tax_type: string | null
  is_tracked_inventory: boolean
  quantity_on_hand: number | null
  reorder_level: number | null
  avg_cost: number | null
  is_sold: boolean
  is_purchased: boolean
  category_id: number | null
  category_name: string | null // "Fruit › Citrus"
  external_updated_at: string | null
  image_url: string | null
  images: ProductImage[]
  aliases: string[]
  deleted_at: string | null
  updated_at: string
}

export interface ProductImage {
  id: number
  url: string
  thumb_url: string
  is_primary: boolean
  sort_order: number
  alt_text: string | null
  width: number | null
  height: number | null
  size_bytes: number
}

export interface Customer {
  id: number
  code: string | null
  name: string
  email: string | null
  other_emails: string | null
  phone: string | null
  address: string | null
  abn: string | null
  is_active: boolean
  source: 'manual' | 'csv' | ProviderKey
  external_id: string | null
  updated_at: string
  // Xero Contact jaise poore fields
  first_name: string | null
  last_name: string | null
  mobile: string | null
  fax: string | null
  ddi: string | null
  postal_line1: string | null
  postal_line2: string | null
  postal_city: string | null
  postal_region: string | null
  postal_postcode: string | null
  postal_country: string | null
  postal_attention: string | null
  delivery_line1: string | null
  delivery_line2: string | null
  delivery_city: string | null
  delivery_region: string | null
  delivery_postcode: string | null
  delivery_country: string | null
  delivery_attention: string | null
  delivery_instructions: string | null
  company_number: string | null
  bank_account_details: string | null
  sales_tax_type: string | null
  purchase_tax_type: string | null
  default_currency: string | null
  is_customer: boolean
  is_supplier: boolean
  external_updated_at: string | null
  deleted_at: string | null
}

// ---------- Email settings ----------
export type SenderStatus = 'none' | 'pending' | 'verified' | 'failed'

export interface DnsRecord {
  type: 'TXT' | 'CNAME'
  purpose: 'DKIM' | 'Return-Path'
  host: string
  value: string
  verified: boolean
}

export interface EmailSettings {
  sender: {
    name: string | null
    email: string | null
    domain: string | null
    status: SenderStatus
    dns: DnsRecord[]
    checked_at: string | null
  }
  effective_from: string
  reply_to: string | null
  order_email: {
    enabled: boolean
    subject: string | null
    message: string | null
    cc_other: boolean
    bcc: string | null
    default_subject: string
    default_message: string
  }
  domain_api_configured: boolean
  platform_from: string
  missing?: string[]
}

export interface CustomerInsights {
  aliases: { id: number; alias: string; source: string; sku: string; product_name: string }[]
  usual_products: { sku: string; name: string; times_ordered: number; last_ordered_at: string | null }[]
}

// ---------- Imports ----------
export type ImportKind = 'products' | 'customers' | 'history' | 'suppliers' | 'categories'

export interface ImportField {
  key: string
  label: string
  required: boolean
  synonyms: string[]
}

export interface UploadResult {
  upload_id: string
  filename: string
  headers: string[]
  preview: Record<string, string>[]
  total_rows: number
  mapping: Record<string, string | null>
  template_name: string | null
  fields: ImportField[]
}

export interface ImportRunResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
  dry_run: boolean
  job_id?: number
}

export interface ImportJob {
  id: number
  kind: ImportKind
  source: 'csv' | ProviderKey
  filename: string | null
  status: string
  created: number
  updated: number
  skipped: number
  errors: string[]
  created_at: string
}

export interface MappingTemplate {
  id: number
  kind: ImportKind
  name: string
  mapping: Record<string, string | null>
  created_at: string
}

// ---------- Orders ----------
export type OrderStatus = 'needs_review' | 'approved' | 'exported' | 'rejected' | 'cancelled'
export type Channel = 'email' | 'voice' | 'pdf' | 'manual'

export interface OrderSummary {
  id: number
  status: OrderStatus
  customer_id: number | null
  customer_name: string | null
  customer_raw: string | null
  channel: Channel | null
  source: 'ai' | 'manual' | 'portal' | 'standing'
  standing_order_id?: number | null
  payment_method?: 'cod' | 'account' | null // portal orders
  line_count: number
  overall_confidence: number
  po_number: string | null
  delivery_date: string | null
  total_amount: number | null
  created_at: string
  approved_at: string | null
  customer_email: string | null
  confirmation_sent_at: string | null
  confirmation_to: string | null
}

export interface Candidate {
  product_id: number
  sku: string
  name: string
  unit: string | null
  score: number
  usual: boolean
}

export interface OrderLine {
  id: number | null
  raw_text: string
  product_hint: string | null
  quantity: number
  unit: string | null
  product_id: number | null
  product_sku: string | null
  product_name: string | null
  unit_price: number | null
  price_source?: 'override' | 'customer' | 'product' | 'portal' // customer = pantry special price, portal = price customer saw
  match_confidence: number
  match_method: string | null
  candidates: Candidate[]
}

export interface Attachment {
  name: string
  type: string
  kind: 'pdf' | 'audio' | 'image' | 'sheet' | 'other'
  transcript?: string
}

export interface InboundMessage {
  id: number
  channel: Channel
  sender_email: string | null
  sender_name: string | null
  subject: string | null
  body_text: string | null
  combined_text: string | null
  attachments: Attachment[]
  status: 'received' | 'processing' | 'done' | 'not_order' | 'failed' | 'blocked'
  error: string | null
  processing_ms: number | null
  created_at: string
}

export interface ExportJob {
  id: number
  order_id: number
  destination_id: number
  destination_name: string | null
  destination_type: DestinationType | null
  status: 'pending' | 'running' | 'success' | 'failed'
  attempts: number
  max_attempts: number
  next_retry_at: string | null
  last_error: string | null
  response_summary: string | null
  external_id: string | null
  external_url: string | null
  created_at: string
  finished_at: string | null
}

export interface OrderDetail extends OrderSummary {
  customer_confidence: number
  notes: string | null
  lines: OrderLine[]
  message: Omit<InboundMessage, 'status' | 'error'> | null
  exports: ExportJob[]
  invoices: { id: number; number: string | null; source: InvoiceSource; status: InvoiceStatus; total: number }[]
}

export interface OrderStats {
  by_status: Partial<Record<OrderStatus, number>>
  processing: number
  failed_messages: number
  blocked_messages: number
  failed_exports: number
}

// ---------- Destinations ----------
export type DestinationType = 'accounting' | 'internal_invoice' | 'custom_api' | 'webhook'

export interface Destination {
  id: number
  name: string
  type: DestinationType
  type_label: string
  config: Record<string, unknown>
  auto_send: boolean
  is_active: boolean
  created_at: string
}

// ---------- Invoices ----------
export type InvoiceStatus = 'draft' | 'authorised' | 'sent' | 'paid' | 'void'

export interface Invoice {
  id: number
  number: string | null
  source: InvoiceSource
  status: InvoiceStatus
  overdue: boolean
  order_id: number | null
  customer_id: number | null
  customer_name: string | null
  customer_email: string | null
  reference: string | null
  issue_date: string
  due_date: string | null
  subtotal: number
  gst: number
  total: number
  amount_paid: number
  balance: number
  sent_at: string | null
  paid_at: string | null
  external_id: string | null
  external_url: string | null
  created_at: string
}

export interface InvoiceDetail extends Invoice {
  notes: string | null
  last_synced_at: string | null
  lines: InvoiceLine[]
  payments: { id: number; amount: number; paid_on: string; method: string | null; reference: string | null }[]
}

export interface InvoiceLine {
  id: number
  product_id: number | null
  sku: string | null
  description: string
  quantity: number
  unit_price: number
  account_code: string | null
  tax_code: string | null
  tax_rate: number
  gst_amount: number
  line_total: number
}

/** POST /invoices, PUT /invoices/:id/draft */
export interface ManualInvoiceInput {
  customer_id: number
  issue_date: string | null
  due_date: string | null
  reference: string | null
  notes: string | null
  send_email?: boolean
  lines: {
    product_id: number | null
    description: string
    quantity: number
    unit_price: number
    tax_code: string | null // null = product/default, '' = no tax
    account_code: string | null
  }[]
}

export interface InvoiceSummary {
  by_status: Partial<Record<InvoiceStatus, { count: number; total: number; paid: number }>>
  outstanding: number
  overdue_count: number
  overdue_amount: number
  paid_total: number
}

// ---------- Accounting software (Xero / QuickBooks / MYOB) ----------
export type ProviderKey = 'xero' | 'quickbooks' | 'myob'
export type InvoiceSource = 'internal' | ProviderKey
export type AccountingDocType = 'invoice_draft' | 'invoice_authorised' | 'quote' | 'sales_order'

export interface ProviderInfo {
  key: ProviderKey
  label: string
  configured: boolean
  doc_types: Partial<Record<AccountingDocType, string>>
  org_login_fields: string[]
}

export interface AccountingConnection {
  provider: ProviderKey
  label: string
  status: 'connected' | 'pending_org'
  org_name: string | null
  connected_at: string | null
  last_sync_at: string | null
  last_sync_status: string | null
  auto_sync: boolean
  include_all_contacts: boolean
  org_currency: string | null // Xero BaseCurrency, e.g. AUD
  org_country: string | null // Xero CountryCode, e.g. AU
}

/** GET /integrations */
export interface IntegrationsInfo {
  providers: ProviderInfo[]
  connection: AccountingConnection | null
}

/** GET /integrations/orgs */
export interface PendingOrgs {
  provider: ProviderKey
  label: string
  login_fields: string[]
  orgs: { id: string; name: string; requires_login: boolean }[]
}

/** GET /integrations/options - destination form */
export interface AccountingOptions {
  provider: ProviderKey | null
  label: string | null
  doc_types: Partial<Record<AccountingDocType, string>>
  accounts: { code: string; name: string; account_class: string }[]
  tax_rates: { code: string; name: string; rate: number }[]
}

// ---------- Reports ----------
export interface Dashboard {
  days: number
  orders: { received: number; needs_review: number; approved: number; exported: number; rejected: number; approved_value: number }
  invoices: { count: number; total: number; paid: number; outstanding: number; sent: number; overdue: number }
  accuracy_percent: number | null
  lines_processed: number
  time_saved_hours: number
  avg_processing_seconds: number | null
  series: { date: string; orders: number; value: number }[]
  by_channel: Partial<Record<Channel, number>>
  top_customers: { customer_id: number; name: string; orders: number; value: number }[]
}

export interface Onboarding {
  steps: { key: string; title: string; description: string; done: boolean; link: string }[]
  completed: number
  total: number
  dismissed: boolean
  accounting_connected: boolean
}

export interface Activity {
  id: number
  action: string
  entity: string | null
  entity_id: number | null
  detail: Record<string, unknown> | null
  user_name: string | null
  user_id?: number | null
  impersonated_by_name?: string | null // support ne "login as" karke kiya
  created_at: string
}

export interface ActivityPage extends Paged<Activity> {
  users: { id: number; name: string }[]
}

// ---------- Settings ----------
export interface TenantSettings {
  business: {
    name: string
    abn: string | null
    address: string | null
    phone: string | null
    email: string | null
    timezone: string
  }
  invoice: {
    invoice_prefix: string
    invoice_next_number: number
    gst_rate: number
    prices_include_gst: boolean
    payment_terms_days: number
    bank_details: string | null
    invoice_footer: string | null
  }
  stock: { deduct_on_approve: boolean; po_prefix: string; po_next_number: number }
  inbound_email: string
}

export interface TeamData {
  members: {
    id: number
    name: string
    email: string
    role: Role
    is_active: boolean
    last_login_at: string | null
    is_me: boolean
  }[]
  invites: { id: number; email: string; role: Role; expires_at: string }[]
  user_limit: number
}

// ---------- Billing ----------
export interface Plan {
  id: number
  code: string
  name: string
  price_aud_month: number
  order_limit: number
  user_limit: number
  features: string[]
  has_stripe_price: boolean
  stripe_price_id: string | null
  is_active: boolean
  sort_order: number
}

export interface BillingInfo {
  plans: Plan[]
  usage: Usage
  has_subscription: boolean
  stripe_enabled: boolean
}

// ---------- Super admin ----------
export interface AdminStats {
  tenants_total: number
  tenants_by_subscription: Record<string, number>
  users_total: number
  mrr_aud: number
  orders_30d: number
  messages_30d: number
  failed_messages_30d: number
  ai_cost_usd_30d: number
  new_tenants_30d: number
}

export interface AdminTenantRow {
  id: number
  name: string
  slug: string
  email: string | null
  status: 'active' | 'suspended'
  subscription_status: Usage['subscription_status']
  trial_ends_at: string | null
  plan_name: string | null
  orders_30d: number
  ai_cost_usd_30d: number
  users: number
  last_order_at: string | null
  created_at: string
}

export interface AdminTenantDetail {
  id: number
  name: string
  slug: string
  email: string | null
  abn: string | null
  status: 'active' | 'suspended'
  plan_id: number | null
  subscription_status: Usage['subscription_status']
  trial_ends_at: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  usage: Usage
  ai_cost_by_kind_30d: Record<string, number>
  invoices_total: number
  users: { id: number; name: string; email: string; role: Role; is_active: boolean; last_login_at: string | null }[]
}

// ---------- Accounting ----------
export type AccountClass = 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY'

export interface AccountCode {
  id: number
  code: string
  name: string
  account_class: AccountClass
  source: 'manual' | ProviderKey
  is_active: boolean
  updated_at: string
}

export interface TaxRate {
  id: number
  code: string
  name: string
  rate: number
  applies_to: 'sales' | 'purchases' | 'both'
  source: 'manual' | ProviderKey
  is_active: boolean
  updated_at: string
}

/** POST /orders/manual */
export interface ManualOrderInput {
  customer_id: number
  po_number: string | null
  delivery_date: string | null
  notes: string | null
  approve: boolean
  lines: { product_id: number; quantity: number; unit: string | null; unit_price: number | null; raw_text?: string | null }[]
}

// ---------- Customer detail: finance + pantry ----------
export interface CustomerFinance {
  customer: { id: number; name: string; code: string | null; email: string | null; is_active: boolean; deleted_at: string | null }
  orders: {
    count: number
    approved: number
    needs_review: number
    rejected: number
    sales_total: number
    average_order: number
    first_order_at: string | null
    last_order_at: string | null
    recent: {
      id: number
      status: OrderStatus
      po_number: string | null
      created_at: string
      total_amount: number | null
      line_count: number
    }[]
  }
  monthly_sales: { month: string; value: number }[]
  top_products: { product_id: number; sku: string | null; name: string; quantity: number; value: number; orders: number }[]
  invoices: {
    count: number
    invoiced_total: number
    paid_total: number
    outstanding: number
    overdue: number
    overdue_count: number
    aging: { current: number; '1_30': number; '31_60': number; '61_90': number; '90_plus': number }
    open: {
      id: number
      number: string | null
      source: InvoiceSource
      status: InvoiceStatus
      issue_date: string
      due_date: string | null
      total: number
      balance: number
      days_overdue: number
    }[]
  }
}

export type PantryPriceStatus = 'none' | 'active' | 'scheduled' | 'expired'

export interface PantryItem {
  id: number
  product_id: number
  sku: string
  name: string
  unit: string | null
  image_url: string | null
  product_active: boolean
  base_price: number | null
  price: number | null
  starts_on: string | null
  expires_on: string | null
  note: string | null
  status: PantryPriceStatus
  effective_price: number | null
  updated_at: string
}

// ---------- Stock ----------
export type StockStatus = 'ok' | 'low' | 'out'

export interface StockItem {
  id: number
  sku: string
  barcode: string | null
  name: string
  unit: string | null
  image_url: string | null
  quantity_on_hand: number
  reorder_level: number | null
  status: StockStatus
  price: number | null
  purchase_price: number | null
  avg_cost: number | null
  on_order: number
  stock_value: number
  is_active: boolean
  source: string
  updated_at: string
}

export interface StockList extends Paged<StockItem> {
  summary: { tracked: number; out: number; low: number; stock_value: number; untracked: number }
  reasons: Record<string, string>
}

export interface StockMovement {
  id: number
  product_id: number
  sku: string
  name: string
  change: number
  qty_before: number
  qty_after: number
  reason: string
  reason_label: string
  note: string | null
  ref_type: string | null // 'order' = order approve se
  ref_id: number | null
  user_name: string | null
  created_at: string
}

// ---------- Purchasing ----------
export interface Supplier {
  id: number
  name: string
  code: string | null
  email: string | null
  cc_emails: string | null
  contact_name: string | null
  phone: string | null
  address: string | null
  abn: string | null
  payment_terms_days: number | null
  currency: string | null
  account_number: string | null
  notes: string | null
  is_active: boolean
  source: string
  external_id: string | null
  deleted_at?: string | null
  updated_at: string
  open_pos?: number
  product_count?: number
}

export interface SupplierDetail extends Supplier {
  open_pos: number
  open_po_value: number
  received_total: number
  po_count: number
  recent_pos: { id: number; number: string; status: POStatus; order_date: string; expected_date: string | null; total: number }[]
}

export interface SupplierProductLink {
  id: number
  supplier_id: number
  supplier_name: string
  product_id: number
  sku: string
  name: string
  unit: string | null
  product_active: boolean
  supplier_sku: string | null
  unit_cost: number | null
  min_order_qty: number | null
  lead_time_days: number | null
  is_preferred: boolean
  last_cost: number | null
  last_received_at: string | null
  avg_cost: number | null
  quantity_on_hand: number | null
}

export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'closed' | 'cancelled'

export interface POSummary {
  id: number
  number: string
  status: POStatus
  supplier_id: number
  supplier_name: string
  order_date: string
  expected_date: string | null
  reference: string | null
  subtotal: number
  gst: number
  total: number
  line_count: number
  received_pct: number
  overdue: boolean
  sent_at: string | null
  sent_to: string | null
  received_at: string | null
  created_at: string
}

export interface POLine {
  id: number
  product_id: number | null
  sku: string | null
  barcode: string | null
  unit: string | null
  tracked: boolean
  description: string
  supplier_sku: string | null
  quantity: number
  quantity_received: number
  outstanding: number
  unit_cost: number
  tax_rate: number
  line_total: number
  min_order_qty: number | null // supplier ka minimum (Supplier -> Products)
  below_min: boolean // qty minimum se kam
}

export interface StockReceiptSummary {
  id: number
  number: string
  supplier_id: number | null
  supplier_name: string | null
  po_id: number | null
  po_number: string | null
  received_on: string
  reference: string | null
  notes: string | null
  total: number
  line_count: number
  created_at: string
  lines?: {
    id: number
    po_line_id: number | null
    product_id: number
    sku: string
    name: string
    quantity: number
    unit_cost: number
  }[]
}

export interface PODetail extends POSummary {
  deliver_to: string | null
  notes: string | null
  supplier: { id: number; name: string; email: string | null; cc_emails: string | null; phone: string | null }
  lines: POLine[]
  receipts: StockReceiptSummary[]
}

export interface POList extends Paged<POSummary> {
  counts: Partial<Record<POStatus, number>>
}

export interface ReorderSuggestion {
  product_id: number
  sku: string
  name: string
  unit: string | null
  quantity_on_hand: number
  on_order: number
  reorder_level: number
  suggested_qty: number
  supplier_id: number | null
  supplier_name: string | null
  unit_cost: number | null
  min_order_qty: number | null
  lead_time_days: number | null
}

// ---------- Categories ----------
export interface Category {
  id: number
  name: string
  parent_id: number | null
  path: string // "Fruit › Citrus"
  description: string | null
  sort_order: number
  is_active: boolean
  product_count: number
}

// ---------- Product page: kis order mein kitna ----------
export interface ProductOrderLine {
  order_id: number
  status: OrderStatus
  source: string
  created_at: string
  approved_at: string | null
  delivery_date: string | null
  po_number: string | null
  customer_id: number | null
  customer_name: string | null
  quantity: number
  unit: string | null
  unit_price: number | null
  line_total: number | null
}

export interface ProductOrders extends Paged<ProductOrderLine> {
  summary: {
    by_status: Record<string, { orders: number; quantity: number; value: number }>
    sold_quantity: number
    sold_value: number
    sold_orders: number
    pending_quantity: number
    customers: number
  }
}

// ---------- Customer portal logins ----------
export interface PortalLogin {
  id: number
  customer_id: number
  email: string
  name: string | null
  is_active: boolean
  must_change_password: boolean
  welcome_sent_at: string | null
  last_login_at: string | null
  created_at: string
  email_error?: string | null
  temp_password?: string | null // sirf jab email nahi gaya - admin khud bata de
  customer_name?: string // Settings -> Customer portal -> Customer logins
  push_devices?: number
}

export interface PortalMe {
  id: number
  email: string
  name: string
  must_change_password: boolean
  impersonated_by?: string | null // staff "login as" kar raha hai
  customer: { id: number; name: string }
  business: { name: string; slug: string }
}

// ---------- Announcements (super admin -> clients) ----------
export type AnnouncementLevel = 'info' | 'success' | 'warning' | 'critical'
export interface Announcement {
  id: number
  title: string
  body: string | null
  level: AnnouncementLevel
  display: 'banner' | 'popup'
  dismissible: boolean
  link_url: string | null
  link_text: string | null
  audience?: 'all' | 'tenants' | 'plans'
  tenant_ids?: number[]
  plan_ids?: number[]
  roles?: Role[]
  show_in_app?: boolean
  show_on_login?: boolean
  starts_at?: string | null
  ends_at?: string | null
  is_active?: boolean
  dismissed_count?: number
  created_at?: string
}

// ---------- Sales reports ----------
export interface SalesSummary {
  date_from: string
  date_to: string
  orders: number
  value: number
  quantity: number
  customers: number
  average_order: number
}
export interface SalesByCategory {
  total: number
  level: 'parent' | 'sub'
  items: {
    category_id: number | null
    category: string
    quantity: number
    value: number
    orders: number
    products: number
    share: number
  }[]
}
export interface SalesByCustomer {
  total: number
  items: {
    customer_id: number | null
    customer: string
    code: string | null
    orders: number
    quantity: number
    value: number
    average_order: number
    last_order: string | null
    share: number
  }[]
}
export interface SalesByOrder extends Paged<{
  order_id: number
  approved_at: string | null
  delivery_date: string | null
  customer_id: number | null
  customer: string
  po_number: string | null
  status: string
  source: string
  lines: number
  quantity: number
  value: number
}> {
  total_value: number
}

// ---------- Customer portal (shop) ----------
export interface PortalPaymentOption {
  key: 'cod' | 'account'
  label: string
  hint: string
}
export interface PortalInfo {
  name: string
  slug: string
  email: string | null
  phone: string | null
  address: string | null
  enabled: boolean
  access: 'private' | 'public'
  show_prices_public: boolean
  welcome_title: string | null
  welcome_text: string | null
  checkout_note: string | null
  min_order: number | null
  payment_options: PortalPaymentOption[]
  prices_include_gst: boolean
  gst_rate: number
  branding: PortalBranding
  push_public_key: string | null // null = server pe push set nahi
  allow_standing: boolean // customer khud standing order bana sake
}
export interface PortalBranding {
  brand_color: string | null
  header_style: 'light' | 'brand' | 'dark'
  font: 'modern' | 'classic' | 'rounded'
  corners: 'rounded' | 'soft' | 'sharp'
  tagline: string | null
  announcement: string | null
  footer_text: string | null
  logo_url: string | null
  icon_url: string | null
}
export interface PortalNotice {
  id: number
  title: string
  body: string | null
  link_url: string | null
  created_at: string
  read?: boolean
}
export interface PortalNoticeAdmin extends PortalNotice {
  audience: 'all' | 'customers'
  customers: string[]
  send_push: boolean
  send_email: boolean
  push_sent: number
  push_failed: number
  email_sent: number
  recipients: number
  read_by: number
}
export interface PortalProduct {
  id: number
  name: string
  sku: string
  unit: string | null
  category_id: number | null
  category: string | null
  image_url: string | null
  price: number | null // null = guest ko price nahi dikhta
  regular_price: number | null // special ho to normal price (kata hua)
  special: boolean
  taxable: boolean
  in_stock: boolean | null
  description?: string | null
  images?: ProductImage[]
}
export interface PortalCategory {
  id: number
  name: string
  description: string | null
  image_url?: string | null
  product_count: number
  children: { id: number; name: string; product_count: number }[]
}
export interface PortalBannerItem {
  id: number
  title: string | null
  subtitle: string | null
  button_text: string | null
  image_url: string | null
  link_type: 'none' | 'product' | 'category' | 'url'
  product_id: number | null
  category_id: number | null
  url: string | null
}
export interface PortalQuote {
  lines: (PortalProduct & { quantity: number; line_total: number | null })[]
  removed: number[]
  subtotal: number | null
  gst: number | null
  total: number | null
  prices_include_gst: boolean
  gst_rate: number
  min_order: number | null
  below_min: boolean
}
export interface PortalOrder {
  id: number
  status: OrderStatus
  status_label: string
  created_at: string
  delivery_date: string | null
  po_number: string | null
  payment_method: string | null
  source: string
  line_count: number
  total: number | null
  notes?: string | null
  lines?: {
    product_id: number | null
    name: string
    sku: string | null
    quantity: number
    unit: string | null
    unit_price: number | null
    line_total: number | null
  }[]
}
/** GET /portal/{slug}/delivery-dates - delivery days / cut-off ke hisaab se */
export interface PortalDelivery {
  required: boolean
  earliest: string | null
  dates: string[]
  days: number[]
  cutoff_time: string | null
  lead_days: number
}

export interface PortalProfile {
  name: string | null
  email: string
  customer: string
  phone: string | null
  delivery_line1: string | null
  delivery_line2: string | null
  delivery_city: string | null
  delivery_region: string | null
  delivery_postcode: string | null
  delivery_instructions: string | null
  payment_options: PortalPaymentOption[]
}

// Staff side: Settings -> Customer portal
export type PortalSettings = {
  enabled: boolean
  access: 'private' | 'public'
  show_prices_public: boolean
  allow_cod: boolean
  allow_account: boolean
  min_order: number | null
  hide_out_of_stock: boolean
  welcome_title: string | null
  welcome_text: string | null
  checkout_note: string | null
  delivery_days: number[]
  cutoff_time: string | null
  lead_days: number
  closed_dates: string[]
  allow_standing: boolean
  notify_email: string | null
  portal_url: string
  payment_terms_days: number
  push_configured: boolean
} & PortalBranding
export interface PortalBannerAdmin {
  id: number
  title: string | null
  subtitle: string | null
  button_text: string | null
  image_url: string | null
  link_type: 'none' | 'product' | 'category' | 'url'
  link_product_id: number | null
  link_category_id: number | null
  link_url: string | null
  link_label: string | null
  sort_order: number
  is_active: boolean
  starts_on: string | null
  ends_on: string | null
}

/** GET /staff-notifications - staff bell */
export interface StaffNotification {
  id: number
  kind: string
  title: string
  body: string | null
  link_url: string | null
  order_id: number | null
  created_at: string
  read: boolean
}

export interface StaffNotifications {
  items: StaffNotification[]
  unread: number
  push_public_key: string | null
  push_subscribed: boolean
}

/** Standing (recurring) order - staff + portal */
export interface StandingOrderLine {
  id?: number
  product_id: number
  name: string
  sku: string
  unit: string | null
  quantity: number
  available: boolean
  price?: number | null
}

export interface StandingUpcoming {
  delivery_date: string
  generate_at: string
  skipped: boolean
  generated: boolean
  order_id: number | null
}

export interface StandingOrder {
  id: number
  customer_id: number
  customer_name: string | null
  name: string
  is_active: boolean
  delivery_weekday: number
  generate_weekday: number
  generate_time: string
  every_weeks: number
  start_date: string
  end_date: string | null
  skip_dates: string[]
  po_number: string | null
  notes: string | null
  payment_method: string | null
  created_by: 'staff' | 'customer'
  last_generated_for: string | null
  last_order_id: number | null
  schedule: string
  lines: StandingOrderLine[]
  upcoming: StandingUpcoming[]
  estimate?: number
  created_at: string
}
