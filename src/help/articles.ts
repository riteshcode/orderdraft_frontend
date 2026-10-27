import type { HelpArticle } from './types'

/**
 * Help Center articles (in-app knowledge base).
 * Audience: warehouse / office staff - plain, short, friendly. Field names match the on-screen labels.
 */
export const ARTICLES: HelpArticle[] = [
  // ───────────────────────────── Getting started ─────────────────────────────
  {
    slug: 'getting-started',
    title: 'Getting started: your first day',
    category: 'Getting started',
    summary: 'The five things to set up so orders start flowing: accounting, data, inbound email, destination and your team.',
    keywords: 'setup, onboarding, checklist, first steps, new account, trial, get set up, how to start',
    path: '/',
    sections: [
      {
        heading: 'How OrderDraft works',
        body: `Your customers keep ordering the way they always do - email, voice note, PDF or text. OrderDraft reads each order, matches it to your products and customers, and creates a **draft order**. You check it, click **Approve**, and it goes to your accounting software or becomes an invoice.

The **Get set up** card on the [Dashboard](/) ticks off each step as you finish it. You can hide it with the X once you're done.`,
      },
      {
        heading: 'Your first-day checklist',
        body: `1. **Connect your accounting software.** Go to [Integrations](/integrations) and connect Xero, QuickBooks or MYOB. Your products, customers, suppliers, accounts and tax rates come across automatically.
2. **No accounting software? Import your data.** Use [Import data](/imports) to upload a CSV or Excel file of products, then customers. Add order history too - it makes matching smarter.
3. **Set up your order email.** Copy your OrderDraft address from [Settings → General](/settings/general) and set up a forwarding rule in Outlook or Gmail so customer orders are forwarded to it.
4. **Choose where approved orders go.** Add a destination on the [Destinations](/destinations) page - for example "Draft invoice in Xero" or "OrderDraft Invoice".
5. **Invite your team.** Go to [Settings → Team](/settings/team) and invite the people who review orders.
6. **Send a test order.** Forward an old order email to your OrderDraft address, or paste one on the [New order](/orders/new) page. It shows up in [Orders](/orders) within a minute.`,
      },
      {
        heading: 'Good to know',
        body: `- Only **owners** and **admins** can connect software, import data and change settings. **Reviewers** can review and approve orders.
- The first few orders may need a few fixes. Every time you correct a line and approve, OrderDraft remembers it for that customer.
- Your free trial lasts 14 days. The banner at the top shows how many days are left.

> Stuck? Click **Help** in the top bar on any page to open the article for that page.`,
      },
    ],
    related: ['integrations', 'import-data', 'how-orders-arrive', 'team-roles'],
  },
  {
    slug: 'dashboard',
    title: 'The Dashboard',
    category: 'Getting started',
    summary: 'Your daily overview: orders received, approved value, AI accuracy, time saved, invoices and what needs review.',
    keywords: 'home, overview, stats, reports, KPIs, accuracy, time saved, top customers, recent activity',
    path: '/',
    sections: [
      {
        heading: 'What you see',
        body: `The top of the page shows your OrderDraft email address - forward customer orders there. Use the date picker on the right to switch between **Last 7 days**, **Last 30 days** and **Last 90 days**.

- **Orders received** - how many orders came in, and how many are waiting for review.
- **Approved value** - total value of orders you approved (ex GST).
- **AI accuracy** - the share of order lines you approved without changing anything. It goes up as OrderDraft learns your customers.
- **Time saved** - an estimate of typing time saved compared with entering orders by hand.
- **Orders over time** - orders received per day.
- **Invoices** - invoiced, sent, paid and outstanding totals, plus a link to any overdue invoices. **By channel** shows how orders arrived (Email, Voice, PDF, Text).
- **Waiting for review** - the newest drafts. Click one to open it, or **View all** to go to [Orders](/orders).
- **Recent activity** - the latest changes made by your team.
- **Top customers** - who ordered the most in the period.`,
      },
      {
        heading: 'Tips',
        body: `- The **Orders** number in the sidebar shows how many drafts need review. It refreshes on its own.
- The meter in the top bar shows how many orders you've used this billing period. Click it to see your plan.

> Confidence badges are colour coded: green is 85% or more, amber 60-84%, red below 60%.`,
      },
    ],
    related: ['getting-started', 'orders-list', 'activity-log'],
  },

  // ───────────────────────────── Orders ─────────────────────────────
  {
    slug: 'how-orders-arrive',
    title: 'How orders arrive: email, voice, PDF and text',
    category: 'Orders',
    summary:
      'Forward emails to your OrderDraft address, or paste a message / upload a voice note, PDF or photo on the New order page.',
    keywords:
      'inbound email, forward, forwarding rule, Outlook rule, Gmail filter, voice note, voicemail, PDF, photo, upload, paste, SMS, WhatsApp, new order',
    path: '/orders/new',
    sections: [
      {
        heading: 'Your OrderDraft email address',
        body: `Every account has its own order address. You'll find it on the [Dashboard](/), the [New order](/orders/new) page and in [Settings → General](/settings/general). Click the copy button next to it.

Every email sent or forwarded to this address becomes a draft order automatically. PDF purchase orders, photos and voice-note attachments are read too.`,
      },
      {
        heading: 'Set up automatic forwarding',
        body: `**Outlook:** Settings → Mail → Rules → Add rule → "Forward to" your OrderDraft address (for example, for emails sent to your orders@ inbox).

**Gmail:** Settings → Forwarding → add your OrderDraft address, then create a filter (for example \`to:orders@yourbusiness.com.au\`) → Forward it.

> Send yourself a test order after setting up the rule. It should appear in [Orders](/orders) in under a minute.`,
      },
      {
        heading: 'Paste a message',
        body: `For orders that come by SMS, WhatsApp or chat:

1. Go to [New order](/orders/new) and pick **Paste message**.
2. Paste the text, add the sender's name and phone or email if you know them.
3. Click **Create draft order**. The draft appears in [Orders](/orders) a few seconds later.`,
      },
      {
        heading: 'Upload a voice note, PDF or photo',
        body: `1. Go to [New order](/orders/new) and pick **Upload file**.
2. Drop the file in the box or click to browse. Voice notes (.mp3, .m4a, .wav, .ogg), PDF purchase orders and photos are accepted, up to 25 MB.
3. Add a note if it helps (for example "delivery Friday") and click **Create draft order**.

Voice notes are transcribed with Australian English, and the transcript is shown on the order.`,
      },
      {
        heading: 'Where to check what happened',
        body: `Every message that comes in is listed in the [Inbox log](/inbox) with its status. If something didn't turn into an order, look there first.`,
      },
    ],
    fields: [
      {
        form: 'New order - Paste message / Upload file',
        items: [
          {
            name: 'Message (SMS, WhatsApp, chat, email text)',
            description: `The order text exactly as the customer sent it. Include their sign-off - it helps find the customer. Example: "2 box romas, 6 cos - Joe, Joe's Cafe".`,
          },
          {
            name: 'Note (optional)',
            description: `Shown only on Upload file. Extra context for the AI that isn't in the file, e.g. "delivery Friday" or "this is for the Bondi store".`,
          },
          {
            name: 'Sender name (optional)',
            description: `Who sent the order. Fill it in when the message doesn't say, e.g. "Joe Smith".`,
          },
          {
            name: 'Sender email or phone (optional)',
            description: `The customer's email or mobile. Helps match the order to the right customer, especially for voice notes and texts.`,
          },
        ],
      },
    ],
    related: ['inbox-log', 'review-approve-order', 'manual-order', 'troubleshooting'],
  },
  {
    slug: 'inbox-log',
    title: 'Inbox log: every message that came in',
    category: 'Orders',
    summary: 'See every email, voice note, PDF and message received, what happened to it, and retry ones that failed.',
    keywords: 'inbox, messages, failed, blocked, not an order, retry, missing order, email log, received',
    path: '/inbox',
    sections: [
      {
        heading: 'What the Inbox log shows',
        body: `Every message that reaches OrderDraft is listed here with its source, sender, subject and status. Click a row to see the full text, attachments and any voice-note transcript.

Use the tabs to filter: **All**, **Processing**, **Failed**, **Blocked**, **Not an order** and **Done**.`,
      },
      {
        heading: 'Statuses explained',
        body: `- **Queued** - received, waiting to be read.
- **Processing** - the AI is reading it right now (usually a few seconds).
- **Draft created** - done. The draft is waiting in [Orders](/orders).
- **Not an order** - the message didn't look like an order (for example a thank-you email or a newsletter).
- **Failed** - something went wrong reading it. The error is shown when you open the row.
- **Blocked (plan)** - your plan limit was reached or your trial ended. The message is saved but not processed.`,
      },
      {
        heading: 'Retrying a message',
        body: `Messages that are **Failed**, **Not an order** or **Blocked** have a **Retry** button.

1. Fix the cause first - for example upgrade your plan in [Billing](/settings/billing) for blocked messages.
2. Click **Retry** on the row. Check back in a few seconds.

> If an order really was an order but shows "Not an order", click Retry. If it still fails, paste the text on the [New order](/orders/new) page or enter it manually.`,
      },
    ],
    related: ['how-orders-arrive', 'billing-plans', 'troubleshooting'],
  },
  {
    slug: 'review-approve-order',
    title: 'Reviewing and approving an order',
    category: 'Orders',
    summary: 'Check the draft against the original message, fix customers and products, then approve to send it on.',
    keywords:
      'review, approve, draft order, confidence, match, unmatched line, no match, suggestions, reject, re-run AI, confirmation email, export, send, customer price, price override',
    sections: [
      {
        heading: 'The review screen',
        body: `Open any order from [Orders](/orders). The **Original message** is on the left - who sent it, the subject, attachments, transcript and the full text. The **Draft order** is on the right with the customer, details and lines OrderDraft picked.

The badge next to "Draft order" is the overall **confidence**: green (85%+) means the AI is very sure, amber (60-84%) means check it, red means it needs your attention.`,
      },
      {
        heading: 'Checking the lines',
        body: `Each line shows what the customer wrote (in quotes) above the product OrderDraft picked.

- **Match** shows how sure the match is and how it was found (for example \`alias\`, \`sku\`, \`fuzzy\` or \`manual\`).
- **No match** (red) means the line needs a product. Click the product box and choose one.
- The product dropdown shows **Suggestions** at the top (with a score, and "usual" if the customer often orders it), then **All products**. Type a name, SKU or barcode to search.
- **Customer price** in green means a special price from this customer's pantry is being used.
- To change the price for this order only, type in the small **@** price box under the amount.
- Use **Add line** for items the AI missed and the bin icon to remove a line.`,
      },
      {
        heading: 'Approving',
        body: `1. Make sure a **Customer** is selected and every line has a product. The Approve button tells you what's missing if it's greyed out.
2. Click **Save** to keep changes without approving, or go straight to **Approve** (unsaved changes are saved first).

When you approve:
- OrderDraft **learns** your corrections for that customer, so next time "romas" goes straight to the right product.
- Stock goes down for tracked products (if turned on in [Settings → Stock](/settings/stock)).
- The order is sent to every active destination with "Send automatically on approve" turned on.
- The customer gets a **confirmation email** if that's turned on in [Settings → Email](/settings/email) and they have an email address.

Prices are locked in on approval - later pantry or price changes don't change an approved order.`,
      },
      {
        heading: 'After approving: Delivery panel',
        body: `Approved orders show a **Delivery** panel:

- Each destination the order was sent to, with its status (Pending, Sending, Sent, Failed). Click the link icon to open it in Xero, QuickBooks or MYOB.
- A failed send shows the reason and a **Retry** button. OrderDraft also retries automatically.
- **Send to...** lets you send the order to another destination - tick it and click **Send**.
- **Customer confirmation** shows whether the email went out. Click **Send** / **Resend** to send it again, or to a different address.
- Any **Invoices** created from the order are listed - click to open.`,
      },
      {
        heading: 'Reject or re-run',
        body: `- **Reject** - the order is not exported anywhere. Use it for duplicates or cancelled orders.
- **Re-run AI** - deletes this draft and reads the original message again. Handy after you've added missing products or customers.`,
      },
      {
        heading: 'Cancel an approved order',
        body: `Customer changed their mind after you approved? Open the order and click **Cancel order** (top right), with an optional reason.

- Stock that the order took off is **put back** (Stock page shows "Order cancelled").
- Exports that haven't gone yet are stopped.
- An **OrderDraft invoice** is voided - unless a payment is recorded (then refund or credit it).
- An invoice in **Xero / QuickBooks / MYOB** must be voided there - you get a reminder.
- Portal and standing-order customers get an "Order cancelled" notification and email with your reason.`,
      },
      {
        heading: 'What the customer is told',
        body: `For orders from your **customer portal** or a **standing order**, the customer is kept up to date automatically (bell, phone notification and email):

- **Approved** → "Order confirmed" · **Rejected** → "Order not accepted" (with your reason)
- **Edited** while it needs review (items, quantities or delivery date) → "Order updated" listing the changes. More edits within 15 minutes update the same message instead of sending another one.
- **Invoice created** by your destination → "Invoice ready" (bell and phone only)
- **Cancelled** → "Order cancelled" (with your reason)`,
      },
    ],
    fields: [
      {
        form: 'Draft order',
        items: [
          {
            name: 'Customer',
            description: `Who the order is for. The hint underneath shows what the message said. Search by name, code or email. Required before you can approve.`,
          },
          {
            name: 'Delivery date',
            description: `When the customer wants it. OrderDraft reads dates like "tomorrow" or "Fri" from the message - check it's right.`,
          },
          {
            name: 'PO number',
            description: `The customer's own purchase order number, if they gave one. It's sent to your accounting software and printed on invoices. Example: PO-4471.`,
          },
          {
            name: 'Notes',
            description: `Anything else about the order, e.g. "leave at back door".`,
          },
          {
            name: 'Product',
            description: `The product for this line. Pick from Suggestions or search the full catalog by name, SKU or barcode.`,
          },
          {
            name: 'Qty',
            description: `How many. Decimals are fine for weights, e.g. 2.5.`,
          },
          {
            name: 'Unit',
            description: `The unit the customer ordered in, e.g. box, kg, tray. Filled from the product if left empty.`,
          },
          {
            name: 'Unit price',
            description: `The small @ box under the amount. Leave it to use the customer's special price or the normal product price. Type a new price to override it for this order only.`,
          },
          {
            name: 'Match',
            description: `Read-only. How confident the match is (green/amber/red) and how it was found. "No match" means you must pick a product.`,
          },
        ],
      },
      {
        form: 'Delivery (after approval)',
        items: [
          {
            name: 'Send to...',
            description: `Tick one or more active destinations and click Send to send (or re-send) this order there.`,
          },
          {
            name: 'Customer confirmation',
            description: `Shows if the confirmation email was sent. Click Send / Resend, check or change the email address, then Send confirmation.`,
          },
        ],
      },
    ],
    related: ['orders-list', 'pantry-special-prices', 'destinations', 'email-settings'],
  },
  {
    slug: 'manual-order',
    title: 'Entering an order manually',
    category: 'Orders',
    summary: 'Type in phone or counter orders yourself - no AI needed - and save as a draft or approve straight away.',
    keywords: 'manual entry, phone order, counter order, walk-in, type order, create order, key in',
    path: '/orders/new?mode=manual',
    sections: [
      {
        heading: 'When to use it',
        body: `Use manual entry for orders taken over the phone, at the counter or in person. Manual orders skip the AI and **don't count towards your plan's order limit**.

You need at least one customer and one product first - [import them](/imports) or connect your accounting software.`,
      },
      {
        heading: 'Steps',
        body: `1. Go to [New order](/orders/new) and choose **Manual entry**.
2. Pick the **Customer** - type their name, code or email.
3. Add the PO number and delivery date if you have them.
4. For each line, search the product by name, SKU or barcode and enter the quantity. Click **Add line** for more.
5. Leave **Unit price** empty to use the customer's special price (shown as "Customer price") or the normal price.
6. Click **Save as draft** to check it later, or **Create & approve** to send it straight to your destinations.`,
      },
      {
        heading: 'Good to know',
        body: `- "Create & approve" does everything a normal approval does: reduces stock, sends to destinations and emails the customer confirmation.
- Inactive products and customers aren't shown.

> The order total at the bottom updates as you type.`,
      },
    ],
    fields: [
      {
        form: 'Manual entry',
        items: [
          { name: 'Customer *', description: `Who the order is for. Required. Search by name, account code or email.` },
          { name: 'PO number', description: `Optional. The customer's purchase order number, e.g. "PO 1182".` },
          { name: 'Delivery date', description: `Optional. When the order should be delivered.` },
          {
            name: 'Product',
            description: `Search by product name, SKU or scanned barcode. Required on each line you want to keep.`,
          },
          { name: 'Qty', description: `How many. Must be more than 0. Decimals are fine, e.g. 1.5 kg.` },
          {
            name: 'Unit',
            description: `Filled from the product (e.g. box). Change it if the customer ordered in a different unit.`,
          },
          {
            name: 'Unit price',
            description: `Leave empty to charge the customer's pantry price or the product price (shown in grey). Type a price to override it for this order.`,
          },
          { name: 'Notes', description: `Delivery instructions or anything else, e.g. "Ring on arrival".` },
        ],
      },
    ],
    related: ['review-approve-order', 'pantry-special-prices', 'orders-list'],
  },
  {
    slug: 'orders-list',
    title: 'Orders list and statuses',
    category: 'Orders',
    summary: 'Find any order, filter by status or source, and export approved orders to CSV.',
    keywords: 'orders, list, status, needs review, approved, exported, rejected, export CSV, search order, filter, source',
    path: '/orders',
    sections: [
      {
        heading: 'Order statuses',
        body: `- **Needs review** - a draft waiting for someone to check and approve it. Only these can be edited.
- **Approved** - approved, but not (yet) sent successfully to a destination.
- **Exported** - approved and sent to your destination(s).
- **Rejected** - you rejected it. It isn't sent anywhere.

The number on each tab shows how many orders are in it.`,
      },
      {
        heading: 'Finding orders',
        body: `- Search by customer, PO number or order number (e.g. #1042).
- Use **All sources** to filter by Email, Voice, PDF, Text or Manual entry.
- Click a column heading (Order, Customer, Delivery, Value, Confidence, Status, Received) to sort. Click again to reverse.
- A customer name in amber with a "?" means the customer wasn't recognised - open the order and pick one.

While new messages are being read you'll see "N messages being processed by AI..." above the list.`,
      },
      {
        heading: 'Export to CSV',
        body: `Click **Export CSV** to download all approved and exported orders as a spreadsheet. Handy if you don't use a destination yet.`,
      },
    ],
    related: ['review-approve-order', 'manual-order', 'export-log'],
  },

  // ───────────────────────────── Catalog ─────────────────────────────
  {
    slug: 'customers',
    title: 'Customers',
    category: 'Catalog',
    summary: 'Add and edit customers, their contact and delivery details, and switch them active, inactive or to Trash.',
    keywords:
      'customer, client, contact, account code, delivery address, postal address, ABN, trash, restore, inactive, deactivate, delete customer, insights, learned',
    path: '/customers',
    sections: [
      {
        heading: 'The Customers page',
        body: `Lists everyone who orders from you. Search by name, code or email, and use the tabs **Active**, **Inactive**, **All** and **Trash**. Click a customer's name to open their page with orders, balance, pantry and special prices.

Customers synced from Xero, QuickBooks or MYOB show a source badge. The next sync may overwrite their details, so make big changes in your accounting software.`,
      },
      {
        heading: 'Add or edit a customer',
        body: `1. Click **Add customer** (or the pencil icon on a row).
2. Fill in **Business / contact name** - the only required field.
3. Use the tabs **Contact**, **Delivery address**, **Postal address** and **Business & tax** for the rest.
4. Click **Save**.

> Add every email address the customer's staff order from in **Other emails**. That's how OrderDraft knows an email from chef@ is for the same café.`,
      },
      {
        heading: 'Active, inactive and Trash',
        body: `- **Active switch** - turn a customer off when they stop ordering. Inactive customers aren't matched on new orders and don't show in dropdowns, but their history stays.
- **Move to Trash** (bin icon or **Delete** on their page) - removes the customer. Orders from them will no longer be recognised. You can **Restore** from the Trash tab.
- **Delete forever** - only from the Trash tab. Customers used on orders or invoices can't be deleted forever - they're kept for your records.
- Syncing or re-importing never brings back customers you trashed or switched off.`,
      },
      {
        heading: 'What the AI learned',
        body: `Click the insights icon on a row (or the **What AI learned** tab on their page) to see:

- **Usually orders** - their regular products and how often.
- **What OrderDraft learned** - words they use mapped to your products, e.g. "romas" → Roma tomatoes 10kg. Click **Forget** (bin icon) to remove a wrong mapping.`,
      },
      {
        heading: 'History',
        body: `The **History** panel on a customer's page shows who changed their details and when, with the old and new values. See [Activity log](/activity) for everything across your account.`,
      },
    ],
    fields: [
      {
        form: 'Add / Edit customer',
        items: [
          { name: 'Business / contact name *', description: `The name you know them by, e.g. "Joe's Cafe Bondi". Required.` },
          { name: 'First name', description: `Main contact's first name. Optional.` },
          { name: 'Last name', description: `Main contact's last name. Optional.` },
          {
            name: 'Email',
            description: `Their main email. Order confirmations and invoices are sent here. Also used to recognise orders.`,
          },
          {
            name: 'Account code',
            description: `Your code for this customer, e.g. JOES01. Must match your accounting software if you use one. Searchable everywhere.`,
          },
          {
            name: 'Other emails',
            description: `Extra addresses their staff order from, comma separated, e.g. "chef@joescafe.com.au, accounts@joescafe.com.au". Helps match orders.`,
          },
          { name: 'Phone', description: `Main phone number.` },
          { name: 'Mobile', description: `Mobile number. Helps match texts and voice notes.` },
          { name: 'Direct dial (DDI)', description: `A direct line, if they have one.` },
          { name: 'Fax', description: `Fax number, if they still use one.` },
          {
            name: 'Address line 1 / Address line 2',
            description: `Street address. Found on both the Delivery address and Postal address tabs.`,
          },
          { name: 'Suburb / city', description: `e.g. Bondi Beach.` },
          { name: 'State / region', description: `e.g. NSW.` },
          { name: 'Postcode', description: `e.g. 2026.` },
          { name: 'Country', description: `e.g. Australia.` },
          { name: 'Attention', description: `The person to address deliveries or mail to, e.g. "Head chef".` },
          {
            name: 'Delivery instructions',
            description: `Shown with the delivery details, e.g. "Back door, before 7am".`,
          },
          {
            name: 'Same as delivery address',
            description: `Button on the Postal address tab - copies the delivery address so you don't type it twice.`,
          },
          {
            name: 'Address (display)',
            description: `How the address appears on documents. Leave empty and it's built from the delivery / postal address.`,
          },
          { name: 'ABN / tax number', description: `Their ABN, e.g. 12 345 678 901.` },
          { name: 'Company number (ACN)', description: `Their ACN, if a company.` },
          {
            name: 'Default sales tax',
            description: `Tax code from your accounting software to use for this customer, e.g. OUTPUT. Leave empty to use product settings.`,
          },
          { name: 'Default purchase tax', description: `Purchase tax code, e.g. INPUT. Usually only set by accounting sync.` },
          { name: 'Currency', description: `Three-letter currency, e.g. AUD.` },
          { name: 'Bank account', description: `Their bank details, if you need them on record.` },
          { name: 'Active', description: `Off = not matched on new orders and hidden from dropdowns. History is kept.` },
        ],
      },
    ],
    related: ['pantry-special-prices', 'customer-finance', 'import-data', 'integrations'],
  },
  {
    slug: 'pantry-special-prices',
    title: 'Pantry and special prices',
    category: 'Catalog',
    summary: 'Keep a list of products each customer buys and give them their own price - always, or between dates.',
    keywords:
      'pantry, special price, customer price, price list, contract price, discount, promo, expiry, usual products, favourites',
    sections: [
      {
        heading: 'What the pantry is',
        body: `Each customer has a **pantry**: the products they usually buy, with an optional **special sell price** just for them. Open a customer from [Customers](/customers) and go to the **Pantry & prices** tab.

Special prices are used automatically when you approve an order, on manual orders, on the review screen (shown as "Customer price") and on manual invoices. Leave the price empty to charge the normal price.`,
      },
      {
        heading: 'Add products',
        body: `1. Search for a product in **Search product to add**.
2. Type a **Special price** if they get one (or leave it empty).
3. Click **Add**.

Or click **Add usual products** to fill the pantry from the customer's order history in one go.`,
      },
      {
        heading: 'Set dates for a special price',
        body: `1. On the product's row, type the **Special price**. You'll see how much it differs from the normal price.
2. Set **Starts** if the price begins later (e.g. next month's contract).
3. Turn off **Always** and choose an **Expires** date for a limited-time price.
4. Click **Save** on the row.

The **Status** column tells you what's charged right now:
- **Special price** - their price applies today.
- **Starts later** - the start date is in the future.
- **Expired** - the end date has passed, so the normal price applies.
- **Normal price** - no special price set.

"Charged $X" under the status shows the price they pay today.`,
      },
      {
        heading: 'Good to know',
        body: `- Approved orders keep the price they were approved at, even if you change the pantry later.
- You can still override a price on a single order.
- Remove a product with the bin icon.`,
      },
    ],
    fields: [
      {
        form: 'Pantry & special prices',
        items: [
          {
            name: 'Search product to add',
            description: `Find a product to add to this customer's pantry. Search by name, SKU or barcode.`,
          },
          {
            name: 'Special price',
            description: `Their sell price for this product (ex GST if your prices exclude GST). Empty = normal price. Example: 42.00 instead of 45.00.`,
          },
          { name: 'Starts', description: `Optional. The special price applies from this date. Empty = from now.` },
          { name: 'Always', description: `On = the price never expires. Turn off to pick an end date.` },
          { name: 'Expires', description: `Last day the special price applies. After this, the normal price is charged.` },
        ],
      },
    ],
    related: ['customers', 'customer-finance', 'review-approve-order', 'manual-order'],
  },
  {
    slug: 'customer-finance',
    title: 'Customer page: orders and finance',
    category: 'Catalog',
    summary: 'See a customer’s sales, outstanding balance, overdue invoices, aging and top products in one place.',
    keywords:
      'customer balance, outstanding, overdue, aging, debtors, statement, sales history, top products, recent orders, account summary',
    sections: [
      {
        heading: 'Orders & finance tab',
        body: `Open any customer from [Customers](/customers). The **Orders & finance** tab shows:

- **Total sales** - value of approved orders (ex GST).
- **Orders** - how many orders, and the average order value (or how many are waiting for review).
- **Outstanding** - what they still owe, with invoiced and paid totals.
- **Overdue** - unpaid invoices past their due date.
- **Sales - last 6 months** - a month-by-month bar chart.
- **Balance by age** - unpaid amounts grouped by days past due (1-30, 31-60, 61-90, 90+).
- **Unpaid invoices** - each invoice with its due date and balance. Click to open.
- **Recent orders** and **Top products**.`,
      },
      {
        heading: 'Other tabs',
        body: `- **Pantry & prices** - see [Pantry and special prices](/help/pantry-special-prices).
- **Details** - contact, addresses, ABN and source.
- **What AI learned** - their usual products and learned words.

The buttons at the top let owners and admins switch the customer **Active**, **Edit** their details or **Delete** (move to Trash).`,
      },
      {
        heading: 'Good to know',
        body: `Balances include invoices created by OrderDraft and invoices tracked from Xero, QuickBooks or MYOB. If a payment was recorded in your accounting software, it shows here after the next status update.`,
      },
    ],
    related: ['customers', 'pantry-special-prices', 'invoices'],
  },
  {
    slug: 'products',
    title: 'Products',
    category: 'Catalog',
    summary: 'Add and edit products - prices, GST, accounts, aliases, cost, stock tracking, barcodes, suppliers and photos.',
    keywords:
      'product, item, SKU, catalog, price, GST, GST-free, alias, other names, cost price, track inventory, barcode, photo, image, trash, restore, inactive',
    path: '/products',
    sections: [
      {
        heading: 'The Products page',
        body: `Your catalog. The AI matches every order line to these products. Search by name, SKU or scan a barcode straight into the search box. Use the tabs **Active**, **Inactive**, **All** and **Trash**, and click a column heading to sort.

Owners and admins can **Add product**, **Import CSV**, edit (pencil) and move to Trash (bin). Tick products and click **Print labels** to print barcode stickers, or **Set category** to put them in a category. Use the **Category** filter to show one category.

Click a product's **name** to open its page - which orders it's on and in what quantity, stock changes and edit history. See [The product page](/help/product-page).`,
      },
      {
        heading: 'Add or edit a product',
        body: `1. Click **Add product** or the pencil on a row.
2. On the **Sales** tab enter at least **SKU** and **Name**, then the price and unit.
3. Fill in the other tabs if you need them, then click **Save**.

Products synced from Xero, QuickBooks or MYOB show a note - the next sync may overwrite name and price, so change those in your accounting software. Stock is always managed in OrderDraft.`,
      },
      {
        heading: 'Help the AI match better',
        body: `Add the words customers really use in **Other names (aliases)** - e.g. "romas, roma toms, tomatoes roma". OrderDraft also learns these on its own each time you correct a line and approve.`,
      },
      {
        heading: 'Active, inactive and Trash',
        body: `- **Active switch** off - the product is no longer matched on new orders or shown in dropdowns. Use it for seasonal lines.
- **Move to Trash** - removed from the catalog; restore it any time from the Trash tab.
- **Delete forever** - from the Trash tab only. Products used on orders or invoices can't be deleted forever.
- Syncs and re-imports never bring back trashed products or re-activate ones you switched off.`,
      },
    ],
    fields: [
      {
        form: 'Product - Sales tab',
        items: [
          {
            name: 'SKU *',
            description: `Your product code. Required and unique, e.g. TOM-ROMA-10. Must match your accounting software's item code.`,
          },
          {
            name: 'Barcode',
            description: `The EAN/UPC printed on the box - scan it into this box. Leave empty and OrderDraft creates an internal barcode for you.`,
          },
          { name: 'Name *', description: `What the product is called, e.g. "Roma tomatoes 10kg box". Required.` },
          {
            name: 'Category',
            description:
              'Type to search, e.g. "Fruit › Citrus". Used for filters, sales reports and your ordering portal. Manage the list on the [Categories](/categories) page.',
          },
          { name: 'Description', description: `Longer description shown on invoices and documents. Optional.` },
          { name: 'Unit', description: `How it's sold, e.g. box, kg, each, tray.` },
          { name: 'Price (AUD)', description: `Normal sell price. Customers with a pantry special price pay that instead.` },
          {
            name: 'Sales account',
            description: `Which revenue account sales post to, e.g. 200 - Sales. "Default (from settings)" uses your account default. Manage the list in Settings → Accounts & Tax.`,
          },
          {
            name: 'Tax rate',
            description: `A specific tax code for this product, e.g. GST on Income (10%) or GST Free. When set, it overrides the GST switch. "Default (GST switch)" uses the switch below.`,
          },
          {
            name: 'Other names (aliases)',
            description: `Comma separated words customers use for this product, e.g. "romas, roma toms". Helps the AI match.`,
          },
          {
            name: 'GST applies',
            description: `On = GST is added. Turn off for GST-free items like most fresh fruit and veg.`,
          },
        ],
      },
      {
        form: 'Product - Purchase & stock tab',
        items: [
          {
            name: 'Purchase description',
            description: `How the product is described when you buy it, e.g. the supplier's wording. Optional.`,
          },
          {
            name: 'Cost price',
            description: `What you usually pay (ex GST). Once you receive stock, the hint shows the **average cost from receipts**, which is used for stock value.`,
          },
          { name: 'Purchase account', description: `Account purchases post to, e.g. 310 - Cost of goods sold. Optional.` },
          {
            name: 'Purchase tax type',
            description: `Tax code for purchases, e.g. INPUT. Optional - usually filled by accounting sync.`,
          },
          {
            name: 'Reorder level',
            description: `When stock on hand drops to this number, the product shows as Low stock and appears in reorder suggestions. Example: 10.`,
          },
          {
            name: 'Quantity on hand',
            description: `Current stock. Only editable when Track inventory is on. Every change is logged on the Stock page.`,
          },
          {
            name: 'Track inventory',
            description: `On = OrderDraft keeps a stock count for this product (even if it's synced from Xero/QuickBooks/MYOB). Approved orders reduce it, deliveries increase it.`,
          },
          { name: 'I sell this', description: `On for products you sell to customers.` },
          { name: 'I buy this', description: `On for products you buy from suppliers.` },
        ],
      },
      {
        form: 'Product - Barcode & QR tab',
        items: [
          {
            name: 'Barcode SVG / QR SVG',
            description: `Download the barcode or QR code as an image file, e.g. to put on your own labels.`,
          },
          { name: 'Print labels', description: `Opens the label sheet for this product. See Barcodes and labels.` },
          {
            name: 'Use internal barcode instead',
            description: `Replaces your barcode with an OrderDraft internal one (starts with 20). Use it if the manufacturer code is wrong or duplicated.`,
          },
        ],
      },
      {
        form: 'Product - Suppliers tab',
        items: [
          {
            name: 'Supplier / Code / Cost / Last cost / Min order / Lead days',
            description: `Read-only list of suppliers linked to this product. To change these, open the supplier → Products & costs tab. "★ preferred" marks the supplier used for reorder suggestions.`,
          },
        ],
      },
      {
        form: 'Product - Photos tab',
        items: [
          {
            name: 'Drop photos here or click to upload',
            description: `Add up to 8 photos (JPG, PNG or WEBP, up to 5 MB each). Save the product first.`,
          },
          {
            name: 'Make main photo',
            description: `The star icon. The main photo shows in lists and on your customer portal.`,
          },
          { name: 'Move left / Move right', description: `Change the photo order.` },
          {
            name: 'Alt text',
            description: `A short description of the photo, e.g. "Box of roma tomatoes". Saved when you click away.`,
          },
        ],
      },
    ],
    related: ['product-page', 'categories', 'barcodes-labels', 'stock'],
  },
  {
    slug: 'barcodes-labels',
    title: 'Barcodes and printing labels',
    category: 'Catalog',
    summary: 'Every product has a barcode and QR code. Print sticker sheets and scan codes anywhere in OrderDraft.',
    keywords: 'barcode, QR code, label, sticker, print, EAN, UPC, scanner, scan, internal barcode, label printer',
    path: '/products/labels',
    sections: [
      {
        heading: 'Every product has a barcode',
        body: `- If you enter the manufacturer's barcode (EAN-13, UPC-A, EAN-8 or Code 128) on the product's **Sales** tab, OrderDraft uses it. Check digits are validated.
- If you leave it empty, OrderDraft makes an **internal barcode** starting with 20. These are reserved for in-store use, so they never clash with retail barcodes.
- Both the barcode and the QR code find the same product.`,
      },
      {
        heading: 'Print labels',
        body: `1. Go to [Products](/products) and tick the products you want.
2. Click **Print labels**. The label page opens in a new tab.
3. Choose the **Code**, **Copies each**, **Per row** and whether to **Show price**.
4. Click **Print N labels** and print to your printer or save as PDF.

You can also print from a single product: **Barcode & QR** tab → **Print labels**.`,
      },
      {
        heading: 'Where you can scan',
        body: `A USB or Bluetooth scanner works like a keyboard. Scan into:
- the search box on [Products](/products) and [Stock](/stock),
- any product dropdown (orders, invoices, pantry),
- the **Scan barcode** box on purchase orders and when receiving stock.

> Your browser's print settings control margins and paper size. For label printers, choose the label size in the print dialog.`,
      },
    ],
    fields: [
      {
        form: 'Print labels',
        items: [
          { name: 'Code', description: `What goes on each label: Barcode + QR, Barcode only or QR only.` },
          { name: 'Copies each', description: `How many labels per product (1-100). Example: 12 for a carton of 12.` },
          { name: 'Per row', description: `Labels across the page (2-5). Match your sticker sheet.` },
          { name: 'Show price', description: `On = the sell price is printed on the label.` },
        ],
      },
    ],
    related: ['products', 'receiving-stock', 'shortcuts-search'],
  },

  // ───────────────────────────── Stock & purchasing ─────────────────────────────
  {
    slug: 'stock',
    title: 'Stock: on hand, adjustments and low stock',
    category: 'Stock & purchasing',
    summary: 'Track quantity on hand, record counts and write-offs, set reorder levels and see every stock movement.',
    keywords:
      'stock, inventory, on hand, stocktake, count, adjust, write off, damaged, waste, low stock, out of stock, reorder level, stock value, average cost, negative stock, movement history',
    path: '/stock',
    sections: [
      {
        heading: 'How stock works in OrderDraft',
        body: `- OrderDraft keeps the stock count for every product with **Track inventory** on - including products synced from Xero, QuickBooks or MYOB. The first sync brings the opening quantity; after that, syncs never overwrite your stock.
- **Approving an order reduces stock** for tracked products (turn this on or off in [Settings → Stock](/settings/stock)). It's logged as "Sold" with the order number.
- **Receiving stock** increases it and updates the average cost.
- Stock **can go negative** - orders still approve when you're short. Fix it with a stock count.`,
      },
      {
        heading: 'The Stock page',
        body: `- Cards at the top: **Tracked products**, **Low stock** (at or below reorder level), **Out of stock** and **Stock value** (at average cost).
- Filter with **All**, **Low stock**, **Out of stock** and **In stock**. Search by name, SKU or scan a barcode.
- **On order** shows quantities on open purchase orders.
- **Reorder at** - type a number straight into the table and press Enter to save it.
- **Avg cost** is the weighted average cost from deliveries (or the cost / sell price until stock is received).`,
      },
      {
        heading: 'Start tracking a product',
        body: `1. Click **Track a product**.
2. Pick the product and optionally a **Reorder level**.
3. Click **Start tracking**, then use the count button to enter the opening stock.

You can also turn on **Track inventory** in the product's **Purchase & stock** tab.`,
      },
      {
        heading: 'Adjust stock',
        body: `Use the buttons on each row:
- **+ (Add stock)** - stock came in outside a delivery, or a customer return.
- **- (Remove stock)** - damaged, wasted or used.
- **Stock count** (sliders icon) - set the exact number you counted.

Choose a **Reason**, add a **Note** if helpful and click **Save**. The box shows the quantity **After** the change - it turns red if stock will be negative.

> For deliveries from suppliers, use **Receive stock** instead - it also updates the average cost.`,
      },
      {
        heading: 'History',
        body: `Click **History** at the top for all products, or the clock icon on a row for one product. You'll see every change: when, the reason, the change, the quantity after, and who did it. "Sold" lines link to the order.`,
      },
    ],
    fields: [
      {
        form: 'Adjust stock',
        items: [
          {
            name: 'Add (received) / Remove / Set (count)',
            description: `Choose what you're doing: add to stock, take away from stock, or set the exact counted number.`,
          },
          {
            name: 'Quantity',
            description: `How many to add or remove, e.g. 5. Shown as **Counted quantity** when you choose Set (count) - enter the total you counted, e.g. 42.`,
          },
          {
            name: 'Reason',
            description: `Why stock changed: Adjustment, Stock received, Stock count, Damaged / waste or Customer return. ("Sold" and "Opening stock" are added automatically.)`,
          },
          { name: 'Note', description: `Optional detail, e.g. "Counted by Sam" or "Pallet dropped".` },
        ],
      },
      {
        form: 'Track stock for a product',
        items: [
          { name: 'Product', description: `The product to start tracking. Only products not yet tracked are listed.` },
          {
            name: 'Reorder level',
            description: `Optional. The product shows as Low stock at or below this quantity, and appears in reorder suggestions.`,
          },
        ],
      },
    ],
    related: ['receiving-stock', 'reorder-suggestions', 'settings', 'products'],
  },
  {
    slug: 'suppliers',
    title: 'Suppliers',
    category: 'Stock & purchasing',
    summary:
      'Keep supplier details and link products with supplier codes, costs, minimum orders, lead times and a preferred supplier.',
    keywords:
      'supplier, vendor, creditor, wholesaler, grower, supplier code, cost, min order, minimum order, MOQ, lead time, preferred supplier, import suppliers',
    path: '/suppliers',
    sections: [
      {
        heading: 'Adding suppliers',
        body: `There are three ways:
- Click **Add supplier** and fill in the form.
- **Import → From CSV / Excel file** - see [Import data](/imports?kind=suppliers).
- **Import → From Xero / QuickBooks / MYOB** when your accounting software is connected. Suppliers also come across on every accounting sync.

Search by name, code or email, and filter **Active**, **Inactive** or **All**.`,
      },
      {
        heading: 'The supplier page',
        body: `Click a supplier to open it. You'll see **Open purchase orders**, **Received to date** and the number of **Purchase orders**, plus tabs:
- **Products & costs** - which of your products they supply (see below).
- **Purchase orders** - every PO for this supplier.
- **Details** - contact and account details.

The **History** panel shows who changed what and when.

Buttons at the top: **Active** switch, **Edit**, **New purchase order** and **Move to Trash** (bin).

- **Trash** - the Suppliers list has a **Trash** tab. Restore a supplier from there any time; its purchase orders are kept.
- **Delete permanently** - only from the Trash tab, and only for suppliers with no purchase orders or receipts (those are kept for your records).`,
      },
      {
        heading: 'Link products to a supplier',
        body: `On the **Products & costs** tab:

1. Search for a product in **Search product to add**.
2. Enter the **Supplier code**, **Cost (ex GST)**, **Min order** and **Lead days** if you know them.
3. Click add. Edit any value in the table later and click **Save** on the row.
4. Tick **Preferred** for the supplier you normally buy this product from.

What each one does on a purchase order:
- **Supplier code** is printed on the PO so the supplier knows exactly what you mean.
- **Cost** fills the line price.
- **Min order** is the starting quantity, with a warning if you order less.
- **Lead days** sets the expected delivery date: order date + the longest lead time on the PO.
- **Preferred** is the supplier used for [reorder suggestions](/purchase-orders/suggestions).
- **Last cost** updates automatically when you receive stock.`,
      },
    ],
    fields: [
      {
        form: 'Add / Edit supplier',
        items: [
          { name: 'Supplier name *', description: `The business name, e.g. "Sydney Markets Produce Co". Required.` },
          { name: 'Code', description: `Your short code for them, e.g. SMP01. Optional, searchable.` },
          { name: 'Contact person', description: `Who you deal with, e.g. "Tony (sales)".` },
          { name: 'Orders email', description: `Purchase orders are emailed here, e.g. orders@supplier.com.au.` },
          {
            name: 'CC emails',
            description: `Extra addresses copied on PO emails, comma separated, e.g. accounts@supplier.com.au.`,
          },
          { name: 'Phone', description: `Their phone number.` },
          { name: 'ABN', description: `Their ABN.` },
          { name: 'Payment terms (days)', description: `How many days you have to pay them, e.g. 14 or 30.` },
          {
            name: 'Our account number',
            description: `Your customer account number with this supplier. Printed on POs so they know who's ordering.`,
          },
          { name: 'Currency', description: `Three-letter currency, e.g. AUD.` },
          { name: 'Address', description: `Their address.` },
          { name: 'Notes', description: `Anything useful, e.g. "Delivers Mon/Wed/Fri, order by 2pm".` },
          { name: 'Active', description: `Off = hidden from new purchase orders. Their history is kept.` },
        ],
      },
      {
        form: 'Products & costs',
        items: [
          {
            name: 'Search product to add',
            description: `Pick one of your products this supplier sells. Search by name, SKU or barcode.`,
          },
          { name: 'Supplier code', description: `The supplier's own code for the item, e.g. "RT10". Printed on the PO.` },
          { name: 'Cost (ex GST)', description: `The agreed price you pay, ex GST, e.g. 28.50. Fills the line cost on new POs.` },
          {
            name: 'Min order',
            description: `The smallest quantity they'll take, e.g. 5. Used as the starting quantity on a PO, with a warning if you order less.`,
          },
          {
            name: 'Lead days',
            description: `Days from ordering to delivery, e.g. 2. Sets the PO's expected delivery date (order date + longest lead time).`,
          },
          {
            name: 'Preferred',
            description: `Tick the supplier you normally buy this product from. Used by reorder suggestions.`,
          },
          { name: 'Last cost', description: `Read-only. The cost from the last delivery you received.` },
        ],
      },
    ],
    related: ['purchase-orders', 'reorder-suggestions', 'import-data', 'receiving-stock'],
  },
  {
    slug: 'purchase-orders',
    title: 'Purchase orders',
    category: 'Stock & purchasing',
    summary: 'Create purchase orders, email them to suppliers, and track them from draft to received.',
    keywords:
      'purchase order, PO, buy, order stock, supplier order, email PO, PDF, mark sent, cancel PO, close PO, part received, expected delivery',
    path: '/purchase-orders',
    sections: [
      {
        heading: 'Create a purchase order',
        body: `1. Click **New purchase order** (or start from a supplier's page, or from [Reorder suggestions](/purchase-orders/suggestions)).
2. Choose the **Supplier**.
3. Add lines: search a product, or scan its barcode into **Scan barcode or type SKU, then Enter** (scanning again adds 1). Picking a product fills in the supplier code, cost and minimum order.
4. For freight or other charges, leave the product empty and type a description.
5. Check quantities - a **Min N** warning appears in amber if you order less than the supplier's minimum.
6. Click **Create draft**.

All costs are ex GST. GST is worked out per line.`,
      },
      {
        heading: 'Send it to the supplier',
        body: `Open the PO and click **Email supplier**. Check the **To** address (CC emails from the supplier are added) and add a message if you like. The PDF is attached and sent from your business email (see [Email settings](/settings/email)).

Ordered by phone or through the supplier's website? Click **Mark sent** instead. Click **PDF** to download or print it.`,
      },
      {
        heading: 'PO statuses',
        body: `- **Draft** - not sent yet. You can **Edit** or delete it.
- **Sent** - emailed or marked as sent. You can **Cancel** it if nothing has arrived.
- **Part received** - some items arrived. Receive more, or **Close** it if the rest isn't coming.
- **Received** - everything arrived.
- **Closed** - finished with items still outstanding. You can **Reopen** it.
- **Cancelled** - not going ahead. Kept for your records.

A red **Late** badge means the expected delivery date has passed. Tabs on the list: **Open**, **Draft**, **Sent**, **Part received**, **Done** and **All**.`,
      },
    ],
    fields: [
      {
        form: 'New / Edit purchase order',
        items: [
          { name: 'Supplier *', description: `Who you're ordering from. Required. Search by name, code or email.` },
          { name: 'Order date', description: `The date on the PO. Defaults to today.` },
          {
            name: 'Expected delivery',
            description: `When you expect the delivery. Leave empty and it's worked out for you: order date + the longest supplier lead time (shown as "Auto").`,
          },
          { name: 'Reference', description: `Optional reference for you or the supplier, e.g. "Weekend stock".` },
          { name: 'Deliver to', description: `Where to deliver. Leave empty to use your business address.` },
          {
            name: 'Scan barcode',
            description: `Scan a barcode or type a SKU and press Enter to add that product. Scanning it again adds 1 more.`,
          },
          {
            name: 'Product / description',
            description: `The product to order, or leave empty and type a description for things like freight or packaging.`,
          },
          { name: 'Supplier code', description: `Read-only. The supplier's code from the supplier's Products & costs tab.` },
          { name: 'Qty', description: `How many to order. Starts at the supplier's minimum order if one is set.` },
          {
            name: 'Cost (ex GST)',
            description: `Price per unit before GST. Filled from the supplier's cost - change it if the price has moved.`,
          },
          { name: 'GST %', description: `GST for this line. Leave as shown unless the item is GST-free (enter 0).` },
          { name: 'Notes for the supplier', description: `Printed on the PO, e.g. "Please deliver before 6am".` },
        ],
      },
      {
        form: 'Email purchase order',
        items: [
          { name: 'To', description: `The supplier's orders email. CC addresses are shown underneath.` },
          { name: 'Message', description: `Optional. Leave empty to use the standard message.` },
        ],
      },
    ],
    related: ['receiving-stock', 'suppliers', 'reorder-suggestions', 'settings'],
  },
  {
    slug: 'receiving-stock',
    title: 'Receiving stock',
    category: 'Stock & purchasing',
    summary: 'Book deliveries into stock against a purchase order (including part deliveries) or without one, with scanning.',
    keywords:
      'receive, receiving, goods received, GRN, delivery, docket, part delivery, short delivery, scan, without PO, average cost, booking in',
    path: '/stock-receipts/new',
    sections: [
      {
        heading: 'Against a purchase order',
        body: `1. Open the PO from [Purchase orders](/purchase-orders) and click **Receive stock**.
2. Enter the **Supplier docket / invoice no** and **Received on** date.
3. For each line enter **Received now**. Or click into **Scan to count** and scan each item - the first scan sets 1, each scan after adds 1.
4. Check the **Cost (ex GST)** - change it if the delivery price is different.
5. Add **Notes** for damaged boxes or short deliveries, then click **Receive N items**.

Received less than ordered? The PO becomes **Part received** - receive the rest later, or **Close** it. "More than ordered" warns you if you enter extra.`,
      },
      {
        heading: 'Without a purchase order',
        body: `For stock bought without a PO (market runs, emergency buys):

1. Click **Receive without PO** on [Purchase orders](/purchase-orders), or **Receive stock** on [Stock](/stock).
2. Pick a **Supplier** if there is one (optional), the docket number and date.
3. Scan items or search products, enter **Quantity** and **Cost (ex GST)**.
4. Click **Receive into stock**.`,
      },
      {
        heading: 'What happens when you receive',
        body: `- Tracked products go into stock, with a "Stock received" movement in their history.
- The product's **average cost** is updated: (on hand × old average + quantity received × new cost) ÷ new on hand. If stock was at zero or below, the new cost becomes the average.
- The supplier's **Last cost** for that product is updated.
- The delivery is listed under **Deliveries received** on the PO.`,
      },
    ],
    fields: [
      {
        form: 'Receive stock (against a PO)',
        items: [
          {
            name: 'Supplier docket / invoice no',
            description: `The number on the supplier's delivery docket or invoice, e.g. D-55821. Helps match it up later.`,
          },
          { name: 'Received on', description: `The date the delivery arrived. Defaults to today.` },
          {
            name: 'Scan to count',
            description: `Scan each item as you unpack. First scan of a product sets 1, each extra scan adds 1.`,
          },
          {
            name: 'Received now',
            description: `How many of this line arrived in this delivery. Leave 0 for items that didn't come.`,
          },
          { name: 'Cost (ex GST)', description: `What this delivery cost per unit. Leave as shown if it matches the PO.` },
          { name: 'Notes', description: `e.g. "2 boxes damaged, credit requested".` },
        ],
      },
      {
        form: 'Receive stock without a PO',
        items: [
          { name: 'Supplier', description: `Optional. Who you bought from.` },
          { name: 'Docket / invoice no', description: `The supplier's docket or invoice number.` },
          { name: 'Received on', description: `When it arrived.` },
          { name: 'Scan barcode', description: `Scan or type a SKU and press Enter to add a line.` },
          { name: 'Product', description: `What you received. Search by name, SKU or barcode.` },
          { name: 'Quantity', description: `How many arrived.` },
          { name: 'Cost (ex GST)', description: `Price per unit before GST. Updates the average cost.` },
          { name: 'Notes', description: `Anything to remember about this delivery.` },
        ],
      },
    ],
    related: ['purchase-orders', 'stock', 'barcodes-labels'],
  },
  {
    slug: 'reorder-suggestions',
    title: 'Reorder suggestions',
    category: 'Stock & purchasing',
    summary: 'See what’s running low and create draft purchase orders for each supplier in one click.',
    keywords: 'reorder, restock, low stock, replenish, auto order, suggested order, purchase suggestions, what to order',
    path: '/purchase-orders/suggestions',
    sections: [
      {
        heading: 'How suggestions work',
        body: `A product appears when it's **tracked**, has a **reorder level**, and **on hand + on order** is at or below that level.

The suggested quantity tops it up to **twice the reorder level**, and is never less than the supplier's minimum order. Example: reorder level 10, on hand 3, nothing on order → suggest 17.

The supplier shown is the **preferred** supplier from the supplier's Products & costs tab.`,
      },
      {
        heading: 'Create purchase orders',
        body: `1. Go to [Purchase orders](/purchase-orders) → **Reorder suggestions**.
2. Untick anything you don't want. Change the **Order qty** or **Supplier** if needed.
3. Click **Create N draft POs**. One draft PO is made per supplier.
4. Open each PO, check it and email it to the supplier.

> Nothing showing? Set reorder levels on the [Stock](/stock) page and mark a preferred supplier for each product.`,
      },
    ],
    fields: [
      {
        form: 'Reorder suggestions',
        items: [
          { name: 'Order qty', description: `How many to order. Pre-filled with the suggestion - change it as you like.` },
          {
            name: 'Supplier',
            description: `Who to order from. Pre-filled with the preferred supplier. Products with no linked supplier need you to choose one.`,
          },
          { name: 'Cost', description: `Read-only. The supplier's cost for the product.` },
        ],
      },
    ],
    related: ['stock', 'suppliers', 'purchase-orders'],
  },

  // ───────────────────────────── Invoices ─────────────────────────────
  {
    slug: 'invoices',
    title: 'Invoices',
    category: 'Invoices',
    summary:
      'Create, email and track tax invoices, record payments and void mistakes. Also tracks Xero, QuickBooks and MYOB invoices.',
    keywords:
      'invoice, tax invoice, bill, payment, record payment, paid, unpaid, overdue, void, credit, PDF, email invoice, manual invoice, new invoice',
    path: '/invoices',
    sections: [
      {
        heading: 'Where invoices come from',
        body: `- **OrderDraft invoices** - created when an approved order goes to an "OrderDraft Invoice" destination, or when you click **New invoice**.
- **Xero / QuickBooks / MYOB invoices** - created in your accounting software from approved orders. OrderDraft tracks their status; send them and record payments in your software.

Cards at the top show **Outstanding**, **Overdue**, **Paid** and **Drafts**. Use the tabs (**All**, **Draft**, **Sent**, **Unpaid**, **Overdue**, **Paid**, **Void**) and the source filter to narrow the list.`,
      },
      {
        heading: 'Create an invoice without an order',
        body: `For delivery fees, services or one-off sales (owners and admins):

1. Click **New invoice** and choose the **Customer**.
2. Add lines - pick a product, or leave it empty and type a description like "Delivery fee". Products use the customer's special price.
3. Set the **Tax rate** and **Account** per line if needed.
4. Click **Save draft**, or **Save & email** to send it straight away (the customer needs an email address).

Draft invoices without payments can be edited in full - click **Edit** on the invoice.`,
      },
      {
        heading: 'Send, get paid, void',
        body: `On an OrderDraft invoice:
- **PDF** - download the tax invoice.
- **Send** / **Resend** - email it with the PDF attached.
- **Record payment** - enter what was paid. Part payments are fine; the **Balance due** updates.
- **Edit** - change the due date and notes once it's been sent.
- **Void** - cancels it for good. Not possible once a payment is recorded.

For Xero, QuickBooks or MYOB invoices, use **Refresh status** or **Open in** your software.`,
      },
      {
        heading: 'Settings',
        body: `Invoice numbering, payment terms, GST rate and bank details live in [Settings → Invoices](/settings/invoice). Invoices are emailed from your sender address in [Settings → Email](/settings/email).`,
      },
    ],
    fields: [
      {
        form: 'New invoice / Edit draft invoice',
        items: [
          {
            name: 'Customer *',
            description: `Who you're billing. Required. Their email shows underneath (or a warning if there's none).`,
          },
          { name: 'Issue date', description: `The invoice date. Defaults to today.` },
          {
            name: 'Due date',
            description: `When payment is due. Leave empty and it's worked out from your payment terms (shown as "Auto").`,
          },
          { name: 'Reference', description: `PO number or job reference, printed on the invoice, e.g. "PO 7781".` },
          {
            name: 'Item',
            description: `Pick a product, or leave it as "Custom item" and type a description such as "Delivery fee".`,
          },
          { name: 'Qty', description: `How many. Must be more than 0.` },
          { name: 'Price', description: `Price per unit. Filled from the product (or the customer's special price).` },
          {
            name: 'Tax rate',
            description: `GST for the line. "Default GST" uses your GST rate; choose "No tax (0%)" for GST-free items.`,
          },
          { name: 'Account', description: `Revenue account for the line. "Default" uses the product's or your default account.` },
          { name: 'Notes', description: `Shown on the invoice, e.g. "Thanks for your business".` },
        ],
      },
      {
        form: 'Email invoice',
        items: [
          { name: 'To', description: `The customer's email. Change it to send somewhere else.` },
          { name: 'Message (optional)', description: `Leave empty to use the default message. The PDF is always attached.` },
        ],
      },
      {
        form: 'Record payment',
        items: [
          { name: 'Amount (AUD)', description: `How much was paid. Starts at the full balance - change it for a part payment.` },
          { name: 'Paid on', description: `The date the money arrived.` },
          { name: 'Method', description: `Bank transfer, Card, Cash or Other.` },
          { name: 'Reference (optional)', description: `e.g. the bank reference or receipt number.` },
        ],
      },
      {
        form: 'Edit invoice (sent invoices)',
        items: [
          { name: 'Due date', description: `Change when payment is due.` },
          { name: 'Notes', description: `Printed on the invoice PDF.` },
        ],
      },
    ],
    related: ['customer-finance', 'destinations', 'settings', 'email-settings'],
  },

  // ───────────────────────────── Integrations ─────────────────────────────
  {
    slug: 'integrations',
    title: 'Connecting Xero, QuickBooks or MYOB',
    category: 'Integrations',
    summary:
      'Connect your accounting software to sync products, customers, suppliers, accounts and tax rates, and send orders to it.',
    keywords:
      'Xero, QuickBooks, QBO, MYOB, accounting software, connect, sync, disconnect, organisation, company file, nightly sync, integration',
    path: '/integrations',
    sections: [
      {
        heading: 'Connect',
        body: `You can connect **one** accounting software per account (owners and admins only).

1. Go to [Integrations](/integrations) and click **Connect Xero**, **Connect QuickBooks** or **Connect MYOB**.
2. Log in to your software and allow access.
3. Back in OrderDraft, **Choose organisation** (or company file for MYOB). MYOB files that need a login ask for the file's username and password.
4. The first sync starts straight away.

Each organisation can only be linked to one OrderDraft account. To switch software, **Disconnect** the current one first.`,
      },
      {
        heading: 'What syncs',
        body: `- **Items → Products** (name, code, price, GST, accounts). Stock on hand is brought in once; after that OrderDraft manages stock.
- **Contacts → Customers.** Turn on **Include all contacts** to bring in contacts that aren't marked as customers.
- **Suppliers.**
- **Chart of accounts and tax rates** (see [Accounts & Tax](/settings/accounting)).
- **Invoice status** - invoices created from your orders update when they're paid.

Syncs never bring back products or customers you trashed, and never re-activate ones you switched off.`,
      },
      {
        heading: 'When syncs happen',
        body: `- **Nightly auto-sync** (if switched on) picks up changes every night.
- **Sync now** on the Integrations page, or the **Sync** button in the top bar, runs one straight away.
- **Recent syncs** shows how many records were new, updated or skipped.

If the last sync failed, a red message explains why. "Reconnect" means your login expired - click Disconnect and connect again.`,
      },
      {
        heading: 'Sending orders to your software',
        body: `Connecting doesn't send orders by itself. Add an **Accounting software** destination on the [Destinations](/destinations) page to choose whether approved orders become draft invoices, approved invoices, quotes or sales orders.`,
      },
    ],
    fields: [
      {
        form: 'Connected software',
        items: [
          {
            name: 'Nightly auto-sync',
            description: `On = products, customers, suppliers, accounts and tax rates update every night.`,
          },
          {
            name: 'Include all contacts (not just customers)',
            description: `On = every contact comes across as a customer. Leave off if your software has lots of non-customer contacts.`,
          },
          { name: 'Sync now', description: `Runs a sync immediately.` },
          { name: 'Disconnect', description: `Unlinks the software. Your existing data in OrderDraft stays.` },
        ],
      },
      {
        form: 'Choose organisation',
        items: [
          { name: 'Organisation', description: `Pick the Xero organisation, QuickBooks company or MYOB company file to use.` },
          {
            name: 'Username / Password',
            description: `Only for MYOB company files that have their own login. Usually "Administrator".`,
          },
        ],
      },
    ],
    related: ['destinations', 'accounts-tax-rates', 'getting-started', 'troubleshooting'],
  },
  {
    slug: 'destinations',
    title: 'Destinations: where approved orders go',
    category: 'Integrations',
    summary: 'Send approved orders to your accounting software, an OrderDraft invoice, your own system or a webhook.',
    keywords:
      'destination, export, send orders, accounting destination, draft invoice, approved invoice, quote, sales order, OrderDraft invoice, custom API, webhook, Zapier, auto send',
    path: '/destinations',
    sections: [
      {
        heading: 'Add a destination',
        body: `1. Go to [Destinations](/destinations) and click **Add destination**.
2. Choose a type (see below).
3. Give it a **Name**, fill in the settings and keep **Send automatically on approve** on.
4. Click save, then **Test** to check it works.

The four types:
- **Accounting software** - an invoice, quote or sales order in your connected Xero, QuickBooks or MYOB.
- **OrderDraft Invoice** - OrderDraft makes a tax invoice (PDF) and can email it to the customer.
- **Custom API** - sends to your own system (ask your IT person).
- **Webhook** - sends to Zapier, Make or another tool.

Without a destination, approved orders stay in OrderDraft - you can still use **Export CSV** on the Orders page.`,
      },
      {
        heading: 'Good to know',
        body: `- Every active destination with auto-send on receives each approved order.
- You can send an approved order to another destination from the order's **Delivery** panel.
- Every send attempt is listed in the [Export log](/exports). Failed sends retry automatically.`,
      },
    ],
    fields: [
      {
        form: 'Add / Edit destination',
        items: [
          { name: 'Name', description: `A name you'll recognise, e.g. "Xero draft invoices".` },
          {
            name: 'Create in [software] as',
            description: `Accounting software only. Draft invoice, Approved invoice, Quote or Sales order - whatever your software supports. Draft invoice is the safest start.`,
          },
          {
            name: 'Default sales account',
            description: `Accounting software only. Used when a product has no account code, e.g. 200 - Sales.`,
          },
          { name: 'Default tax rate', description: `Accounting software only. Used when a product has no tax rate.` },
          {
            name: 'Email the invoice to the customer from [software]',
            description: `Accounting software only. On = your software emails the invoice to the customer.`,
          },
          {
            name: 'Email the invoice PDF to the customer automatically',
            description: `OrderDraft Invoice only. On = the invoice is emailed as soon as it's created. Numbering and bank details are in Settings → Invoices.`,
          },
          { name: 'API URL *', description: `Custom API only. The address of your system, given by your IT team.` },
          {
            name: 'Method / Authentication / Extra headers / Request body / Order fields / Line fields',
            description: `Custom API only. Technical settings for your system - your IT person or developer will know what to enter.`,
          },
          { name: 'Webhook URL *', description: `Webhook only. The URL from Zapier, Make or your tool.` },
          { name: 'Signing secret', description: `Webhook only. Leave empty and one is made for you.` },
          { name: 'Send automatically on approve', description: `On = every approved order is sent here automatically.` },
          { name: 'Active', description: `Off = this destination is paused and receives nothing.` },
        ],
      },
    ],
    related: ['export-log', 'integrations', 'invoices', 'review-approve-order'],
  },
  {
    slug: 'export-log',
    title: 'Export log',
    category: 'Integrations',
    summary: 'Every attempt to send an approved order to a destination - see failures and retry them.',
    keywords: 'export, export log, failed export, retry, sync error, sent, pending, destination error',
    path: '/exports',
    sections: [
      {
        heading: 'What it shows',
        body: `Each row is one attempt to send an order to a destination: the order, destination, status, attempts, next automatic retry and the message from the destination. Use the tabs **All**, **Failed**, **Pending** and **Success**.

The number next to **Export log** in the sidebar shows how many exports have failed.`,
      },
      {
        heading: 'Fixing a failed export',
        body: `1. Read the **Message** - it usually says what's wrong (for example a missing account code or an expired login).
2. Fix the cause - reconnect your software on [Integrations](/integrations), add the missing code in [Accounts & Tax](/settings/accounting), or fix the customer/product.
3. Click **Retry** on the row.

OrderDraft retries failed exports automatically a few times, with longer gaps between attempts.

> **No duplicates on retry:** if the connection drops right after your software created the invoice, the retry recognises it. Xero and QuickBooks get the same request key and return the invoice they already made; for MYOB, OrderDraft first looks for invoice **OD<order number>** and uses it if it's there. Webhooks and custom APIs get an \`Idempotency-Key\` header that stays the same on every retry. Clicking **Send** again on an order makes a new export on purpose.`,
      },
    ],
    related: ['destinations', 'integrations', 'troubleshooting'],
  },
  {
    slug: 'import-data',
    title: 'Importing data from CSV or Excel',
    category: 'Integrations',
    summary: 'Bring in categories, products, customers, suppliers and order history from any system with the import wizard.',
    keywords:
      'import, CSV, Excel, xlsx, spreadsheet, upload, mapping, columns, bulk, order history, suppliers import, categories import, template, saved mapping, special characters, encoding',
    path: '/imports',
    sections: [
      {
        heading: 'The import wizard',
        body: `Owners and admins can import from [Import data](/imports). Any column names work - you match them once and OrderDraft remembers.

1. **Choose what to import:** Categories, Products, Customers, Order history or Suppliers. Tip: import categories first, then products with a Category column.
2. **Upload your file** - .csv or .xlsx, up to 20 MB. Drag it in or click to browse.
3. **Match columns.** For each column in your file, choose what it is in **Import as** (OrderDraft suggests most of them). Choose **— Ignore —** for columns you don't need. Required fields must be matched.
4. Click **Preview import**. You'll see how many rows **will be created**, **will be updated** and **will be skipped**, with the reasons for skipped rows.
5. Click **Import now**.

> Import products first, then customers, then order history - history needs both to exist.`,
      },
      {
        heading: 'How existing records are matched',
        body: `Re-importing updates what's already there instead of creating duplicates:
- **Products** by SKU.
- **Customers** by account code, then email, then name.
- **Suppliers** by code, then email, then name.

Re-imports never bring back items in Trash or re-activate items you switched off.`,
      },
      {
        heading: 'What each import needs',
        body: `- **Products** - SKU and Product name are required. Optional: barcode, description, unit, sell price, GST (yes/no), accounts, tax types, cost, tracked as inventory, quantity on hand, other names (separate with |).
- **Customers** - Customer name is required. Optional: account code, emails, phone, mobile, addresses, ABN, ACN, tax types, currency.
- **Order history** - Customer (code, email or name) and SKU are required. Optional: times ordered and last ordered date. This makes matching much smarter from day one.
- **Suppliers** - Supplier name is required. Optional: code, orders email, CC emails, contact, phone, address, ABN, payment terms, currency, your account number, notes.

Using Xero, QuickBooks or MYOB? [Connect it](/integrations) instead - no CSV needed.`,
      },
      {
        heading: 'Saved mappings',
        body: `Leave **Save this mapping** on and give it a name (e.g. "MYOB export"). Next time a file with the same columns is uploaded, the mapping is applied automatically. Delete old ones under **Saved mappings**. **Recent imports** shows past imports and their results.`,
      },
      {
        heading: 'Excel tips',
        body: `- Saving from Excel as **CSV UTF-8** keeps special characters like é and ’ correct. Plain "CSV" from Windows Excel also works - OrderDraft detects it.
- Uploading the .xlsx file directly avoids encoding problems altogether.
- Keep one header row at the top, no merged cells, and one record per row.
- For yes/no columns, use yes/no, true/false or 1/0.`,
      },
    ],
    fields: [
      {
        form: 'Import wizard',
        items: [
          {
            name: 'Import as',
            description: `For each column in your file, the OrderDraft field it fills. Choose "— Ignore —" to skip a column.`,
          },
          { name: 'Save this mapping', description: `On = remember how you matched these columns for next time.` },
          {
            name: 'Mapping name (optional)',
            description: `A name for the saved mapping, e.g. "Supplier price list" or "MYOB export".`,
          },
        ],
      },
    ],
    related: ['products', 'customers', 'suppliers', 'integrations'],
  },

  // ───────────────────────────── Account & settings ─────────────────────────────
  {
    slug: 'settings',
    title: 'Settings: business, invoices and stock',
    category: 'Account & settings',
    summary: 'Your business details, inbound email address, invoice numbering and GST, stock deduction and PO numbering.',
    keywords:
      'settings, business details, ABN, timezone, invoice number, prefix, payment terms, GST rate, prices include GST, bank details, footer, stock settings, reduce stock, PO number',
    path: '/settings/general',
    sections: [
      {
        heading: 'Settings tabs',
        body: `- **General** - business details and your order email address.
- **Invoices** - numbering, terms, GST and bank details.
- **Accounts & Tax** - see [Accounts and tax rates](/help/accounts-tax-rates).
- **Stock** - stock deduction and PO numbering.
- **Email** - sender address and confirmation emails (owners and admins).
- **Team** - users and roles (owners and admins).
- **Billing** - plan and payment (owner only).

Reviewers can see General, Invoices, Accounts & Tax and Stock but can't change them.`,
      },
      {
        heading: 'General',
        body: `**Business details** appear on your invoices, POs and emails. The **Inbound email** card shows your OrderDraft order address with steps to set up forwarding in Outlook or Gmail.`,
      },
      {
        heading: 'Invoices',
        body: `These apply to invoices created by OrderDraft. The box at the top previews your next invoice number and due date. **Prices include GST** is also sent to your accounting software.`,
      },
      {
        heading: 'Stock',
        body: `- **Reduce stock when an order is approved** - on by default. Each approved order takes its quantities off tracked products and logs it as "Sold". Products without Track inventory are never counted. Orders still approve when stock runs short.
- **Costing: weighted average cost** - explains how average cost is worked out when you receive stock.
- **Purchase order prefix** and **Next PO number** - click **Save numbering** after changing them.`,
      },
    ],
    fields: [
      {
        form: 'General - Business details',
        items: [
          { name: 'Business name', description: `Your trading name, e.g. "Fresh Farms Wholesale". Required.` },
          { name: 'ABN', description: `Your ABN, printed on tax invoices, e.g. 12 345 678 901.` },
          { name: 'Phone', description: `Your business phone.` },
          { name: 'Email', description: `Customers reply to this address.` },
          {
            name: 'Timezone',
            description: `Your local time zone, e.g. Australia/Sydney. Used for dates and "tomorrow" in orders.`,
          },
          { name: 'Address', description: `Your business address. Also used as the default "Deliver to" on purchase orders.` },
        ],
      },
      {
        form: 'Invoice settings',
        items: [
          { name: 'Number prefix', description: `Letters before the invoice number, e.g. INV- gives INV-1001.` },
          { name: 'Next number', description: `The number the next invoice will use, e.g. 1001. Must be 1 or more.` },
          {
            name: 'Payment terms (days)',
            description: `Days until an invoice is due, e.g. 14. Sets the due date automatically.`,
          },
          { name: 'GST rate (%)', description: `Usually 10 in Australia.` },
          {
            name: 'Prices include GST',
            description: `On = your product prices already include GST. Off = GST is added on top. The example next to the switch shows the effect.`,
          },
          {
            name: 'Bank / payment details',
            description: `Printed on the invoice PDF so customers know how to pay, e.g. BSB, account number, PayID.`,
          },
          { name: 'Invoice footer', description: `Terms or a thank-you note at the bottom of the invoice.` },
        ],
      },
      {
        form: 'Stock settings',
        items: [
          {
            name: 'Reduce stock when an order is approved',
            description: `On = approving an order takes stock off tracked products. Turn off if you manage stock somewhere else.`,
          },
          { name: 'Purchase order prefix', description: `Letters before the PO number, e.g. PO- gives PO-1001.` },
          { name: 'Next PO number', description: `The number the next purchase order will use.` },
        ],
      },
    ],
    related: ['accounts-tax-rates', 'email-settings', 'invoices', 'stock'],
  },
  {
    slug: 'accounts-tax-rates',
    title: 'Accounts and tax rates',
    category: 'Account & settings',
    summary:
      'Manage the account codes and tax rates used on products and invoices, or import them from your accounting software.',
    keywords:
      'account code, chart of accounts, tax rate, tax code, GST, OUTPUT, GST free, BAS excluded, revenue account, sales account',
    path: '/settings/accounting',
    sections: [
      {
        heading: 'What these are for',
        body: `- **Account codes** decide which revenue account each sale is posted to, e.g. 200 Sales.
- **Tax rates** decide how much GST each line gets, e.g. OUTPUT 10% or EXEMPTOUTPUT 0%.

Products pick their account and tax rate from these lists, and invoice lines use the product's tax rate. "No tax" is always available on invoices.`,
      },
      {
        heading: 'Import from your software',
        body: `If you've connected Xero, QuickBooks or MYOB, click **Import from [software]**. The codes then refresh on every sync. Imported codes can only be changed in your software - the next sync overwrites other changes.

Not connected? OrderDraft starts you with 200 Sales, 260 Other Revenue, OUTPUT 10%, EXEMPTOUTPUT 0% and BASEXCLUDED 0%. Add your own with **Add**.`,
      },
    ],
    fields: [
      {
        form: 'Add / Edit account code',
        items: [
          { name: 'Code', description: `The account number, e.g. 200. Must match your accounting software.` },
          { name: 'Name', description: `e.g. Sales or Freight income.` },
          { name: 'Type', description: `Revenue, Expense, Asset, Liability or Equity. Sales accounts are Revenue.` },
          { name: 'Active', description: `Off = hidden from dropdowns.` },
        ],
      },
      {
        form: 'Add / Edit tax rate',
        items: [
          { name: 'Tax code', description: `Your software's tax code, e.g. OUTPUT (Xero) or GST (MYOB).` },
          { name: 'Rate (%)', description: `e.g. 10 for GST, 0 for GST-free.` },
          { name: 'Name', description: `e.g. "GST on Income".` },
          { name: 'Applies to', description: `Sales, Purchases, or Sales & purchases.` },
          { name: 'Active', description: `Off = hidden from dropdowns.` },
        ],
      },
    ],
    related: ['settings', 'integrations', 'products'],
  },
  {
    slug: 'email-settings',
    title: 'Email settings: sender address and confirmations',
    category: 'Account & settings',
    summary: 'Send emails from your own business address and set up the order confirmation email customers receive.',
    keywords:
      'email, sender, from address, domain, DNS, DKIM, verify, spam, order confirmation, BCC, CC, reply-to, email template',
    path: '/settings/email',
    sections: [
      {
        heading: 'Send from your own address',
        body: `Order confirmations, invoices and purchase orders are emailed for you. Until your domain is verified they come from **"Your business via OrderDraft"**, and replies still go to you. **Customers currently see** shows the sender in use right now.

To use your own address (owners and admins):
1. Enter **From name** and **From email** (must be on your own domain, not Gmail, Outlook or BigPond) and click **Save sender**.
2. Two DNS records appear. Send them to whoever manages your website domain (GoDaddy, Cloudflare, Crazy Domains...). You don't need to change your SPF record.
3. Once added, click **Verify DNS**. DNS can take a few hours - OrderDraft also re-checks automatically.

When verified, emails are signed so they land in the inbox, not spam. Click **Remove** to go back to the OrderDraft sender.`,
      },
      {
        heading: 'Order confirmation email',
        body: `When **Email customers when an order is approved** is on, the customer gets an email with the items, quantities and total each time you approve their order. They need an email address on their customer record.

You can write your own subject and message, add a BCC copy for yourself, and send a test to check how it looks. To resend a confirmation, use the **Customer confirmation** box on the order.`,
      },
    ],
    fields: [
      {
        form: 'Send emails from your own address',
        items: [
          { name: 'From name', description: `The name customers see, e.g. "Fresh Farms Orders".` },
          {
            name: 'From email',
            description: `Your business address, e.g. orders@freshfarms.com.au. Must be on your own domain - free email addresses are not accepted.`,
          },
        ],
      },
      {
        form: 'Order confirmation email',
        items: [
          {
            name: 'Email customers when an order is approved',
            description: `On = a confirmation is sent automatically on approval.`,
          },
          {
            name: 'Subject',
            description: `Leave empty for the default. You can use {order_number}, {customer_name}, {business_name}, {po_number} and {delivery_date}, e.g. "Order {order_number} confirmed".`,
          },
          { name: 'Message', description: `A short note above the order details. Leave empty for the default.` },
          { name: 'BCC (your copy)', description: `Optional. Your address(es) to get a hidden copy, comma separated.` },
          {
            name: "CC the customer's other emails",
            description: `On = the customer's "Other emails" are copied in too.`,
          },
          { name: 'Send test', description: `Type an address and click to see what customers receive.` },
        ],
      },
    ],
    related: ['review-approve-order', 'invoices', 'settings', 'troubleshooting'],
  },
  {
    slug: 'team-roles',
    title: 'Team members and roles',
    category: 'Account & settings',
    summary: 'Invite staff, choose what each person can do, and turn off access for people who leave.',
    keywords: 'team, users, staff, invite, role, owner, admin, reviewer, permissions, access, disable user, seats',
    path: '/settings/team',
    sections: [
      {
        heading: 'Roles',
        body: `- **Owner** - everything, including billing and the team.
- **Admin** - everything except billing. Can manage the team but can't change owners.
- **Reviewer** - reviews and approves orders, uses New order and the Inbox log. Can view products, customers, stock, suppliers, purchase orders and invoices, but can't change them. Can't see Import data, Destinations, Export log or Integrations.`,
      },
      {
        heading: 'Invite someone',
        body: `1. Go to [Settings → Team](/settings/team) and click **Invite member**.
2. Enter their **Email** and choose a **Role**.
3. Click send. They get an email with a link to set their password. You also see the link - copy and share it if the email doesn't arrive.

Waiting invites are listed under **Pending invites** with the expiry date. Click **Cancel** to withdraw one. The card shows how many seats you've used - your plan sets the limit.`,
      },
      {
        heading: 'Change or remove access',
        body: `- Change someone's role with the dropdown in the **Role** column.
- Turn off **Active** to stop someone logging in (for example when they leave). Their past work stays in the activity log.`,
      },
    ],
    fields: [
      {
        form: 'Invite a team member',
        items: [
          { name: 'Email', description: `Their work email address. The invite is sent here.` },
          {
            name: 'Role',
            description: `What they can do: Reviewer (review & approve orders), Admin (everything except billing) or Owner (everything - only owners can invite owners).`,
          },
        ],
      },
    ],
    related: ['billing-plans', 'activity-log', 'getting-started'],
  },
  {
    slug: 'billing-plans',
    title: 'Billing and plans',
    category: 'Account & settings',
    summary: 'See your plan, usage and trial, choose or switch plans, and update your card.',
    keywords:
      'billing, plan, subscription, upgrade, pricing, trial, card, payment failed, invoice, usage, order limit, users limit, Stripe',
    path: '/settings/billing',
    sections: [
      {
        heading: 'Your plan and usage',
        body: `Only the **owner** can see Billing. The top card shows your plan, when your trial ends or your plan renews, and your usage:
- **Orders this period** - AI-processed orders used out of your limit. Manually entered orders don't count.
- **Team members** - seats used out of your limit.

The meter in the top bar shows the same order usage. It turns amber at 80% and red at 100%.`,
      },
      {
        heading: 'Choose or switch plan',
        body: `Click **Choose plan** (or **Switch plan**) on the plan you want and complete the secure checkout. Click **Manage billing** to update your card, see past invoices or cancel.`,
      },
      {
        heading: 'Limits and trial end',
        body: `When you reach your plan limit or your trial ends, new orders are still **saved** but not processed - they show as **Blocked (plan)** in the [Inbox log](/inbox). Upgrade, then click **Retry** on those messages.

If a payment fails you'll see a banner - update your card in **Manage billing** to avoid interruption.`,
      },
    ],
    related: ['inbox-log', 'team-roles', 'troubleshooting'],
  },
  {
    slug: 'activity-log',
    title: 'Activity log and support reference numbers',
    category: 'Account & settings',
    summary: 'See who changed what and when, with old and new values - and what to send support when something goes wrong.',
    keywords:
      'activity, audit log, history, who changed, changes, price changed, deleted, log, support, reference number, error, impersonation, by support',
    path: '/activity',
    sections: [
      {
        heading: 'The Activity log',
        body: `Owners and admins can open the **Activity log** to see every change in your account: who did it, when, and what changed. Click a row to see the **old → new** values - for example a price going from $42.00 to $45.00.

Filters:
- **Type** - Orders, Invoices, Products, Customers, Suppliers, Purchase orders, Settings, Destinations, Account codes, Tax rates or Logins.
- **User** - one team member, or **System (automatic)** for things like syncs.
- **From / to date** - a date range.
- **Search** - type an action, e.g. "price" or "deleted".

Customer and supplier pages also have a **History** panel showing changes to that record only.`,
      },
      {
        heading: 'When support helps you',
        body: `If you ask support to look at something, they may log in to your account to help. Anything they change is marked **by support** in the activity log, so you always know.`,
      },
      {
        heading: 'Reference numbers',
        body: `If something goes wrong on our side, the error message ends with a **reference number**, for example "(reference 7f3a9c21)".

1. Copy or screenshot the message including the reference.
2. Send it to support using the contact options at the bottom of this article.

The reference lets us find exactly what happened, so we can fix it faster.`,
      },
    ],
    fields: [
      {
        form: 'Activity log filters',
        items: [
          { name: 'Type', description: `Show only one kind of record, e.g. Products. "Everything" shows all.` },
          { name: 'User', description: `Show changes by one person, or "System (automatic)" for syncs and background jobs.` },
          { name: 'From date / To date', description: `Limit to a date range, e.g. last week.` },
          { name: 'Search', description: `Type part of an action, e.g. "price", "deleted" or "approved".` },
        ],
      },
    ],
    related: ['team-roles', 'troubleshooting', 'customers'],
  },
  {
    slug: 'shortcuts-search',
    title: 'Keyboard shortcuts and finding things fast',
    category: 'Getting started',
    summary: 'Jump anywhere with Ctrl+K, search any dropdown by name, SKU, barcode, code or email, and scan barcodes.',
    keywords:
      'shortcut, keyboard, ctrl k, cmd k, command palette, quick search, jump, find, search, dropdown, barcode scanner, sort, help button',
    sections: [
      {
        heading: 'Jump anywhere: Ctrl+K',
        body: `Press **Ctrl+K** (**Cmd+K** on a Mac) or click the search button in the top bar. Start typing to jump to:
- any page (e.g. "stock", "suppliers"),
- an action (e.g. "new purchase order", "receive stock"),
- a record - a customer, product, supplier or order,
- a help article.

Use the arrow keys and press **Enter** to open. **Esc** closes it.`,
      },
      {
        heading: 'Searchable dropdowns',
        body: `Every product, customer and supplier dropdown is searchable. Click it and type any of:
- a **name** ("roma"),
- a **SKU** or **barcode** (products),
- a **code** or **email** (customers and suppliers).

You can also scan a barcode straight into a product dropdown.`,
      },
      {
        heading: 'More time savers',
        body: `- **Help** in the top bar opens the article for the page you're on.
- Click any column heading in lists to sort (A-Z, then Z-A, then back to normal).
- Scan barcodes into the search on Products and Stock, and into the scan boxes on purchase orders and receiving.
- Press **Enter** after typing a reorder level on the Stock page to save it.`,
      },
    ],
    related: ['barcodes-labels', 'getting-started', 'troubleshooting'],
  },

  // ───────────────────────────── Troubleshooting ─────────────────────────────
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting and FAQ',
    category: 'Troubleshooting',
    summary:
      'Fixes for common problems: missing orders, unmatched products, failed syncs, odd characters, negative stock and errors.',
    keywords:
      'problem, not working, help, FAQ, missing order, order did not arrive, wrong product, not matched, sync failed, export failed, special characters, weird characters, PDF, email not received, negative stock, error, reference number',
    sections: [
      {
        heading: "An order email didn't arrive",
        body: `1. Check the [Inbox log](/inbox). If it's there, its status tells you what happened.
2. **Not an order** or **Failed** - click **Retry**. If it still fails, paste the text on [New order](/orders/new).
3. **Blocked (plan)** - your plan limit was reached or the trial ended. See [Billing and plans](/help/billing-plans).
4. Not in the Inbox log at all? Check your forwarding rule in Outlook or Gmail is on and uses the exact address from [Settings → General](/settings/general). Some mail systems need you to confirm forwarding first.`,
      },
      {
        heading: "A product wasn't matched (or the wrong one was)",
        body: `- Pick the right product on the line and approve - OrderDraft learns it for that customer.
- Add common names to the product's **Other names (aliases)**, e.g. "avos, avocado tray".
- Check the product is **Active** and not in Trash - inactive products are never matched.
- Missing product? Add it on [Products](/products), then click **Re-run AI** on the order.
- Import your **order history** so OrderDraft knows each customer's usual products.
- A wrong learned word? Remove it from the customer's **What AI learned** tab.`,
      },
      {
        heading: "The customer wasn't recognised",
        body: `Add the email address they sent from to the customer's **Email** or **Other emails**, then choose the customer on the order. Next time it's automatic.`,
      },
      {
        heading: 'Accounting sync or export failed',
        body: `- On [Integrations](/integrations), read the sync message. "Reconnect" means the login expired - Disconnect and connect again.
- For failed exports, open the [Export log](/exports), read the message, fix the cause (often a missing account code, tax rate or customer in your software) and click **Retry**.
- Check the organisation is set to Australia and AUD - other currencies don't match Australian GST codes.`,
      },
      {
        heading: 'Strange characters in imports, PDFs or emails',
        body: `If names like "Café" show as "CafÃ©":
- For imports, save from Excel as **CSV UTF-8**, or upload the .xlsx file directly.
- Fix any records already imported by editing them, or re-import the corrected file - existing records are updated, not duplicated.
- If a PDF or email still shows odd characters after the data is correct, send support the invoice or PO number.`,
      },
      {
        heading: 'Confirmation or invoice email not received',
        body: `- Check the customer has an email address and that **Email customers when an order is approved** is on in [Settings → Email](/settings/email).
- Ask the customer to check spam. Verifying your own sender domain helps emails land in the inbox.
- Resend from the order's **Customer confirmation** box, or **Resend** on the invoice.`,
      },
      {
        heading: 'Stock went negative',
        body: `This is allowed so orders never get stuck. It usually means a delivery wasn't received in OrderDraft or the starting count was off.
1. Receive any missing deliveries against their purchase orders.
2. Do a **Stock count** on the [Stock](/stock) page to set the real quantity.
3. Use **History** to see which orders and adjustments caused it.`,
      },
      {
        heading: 'An error with a "reference number"',
        body: `Something went wrong on our side. Copy the full message including the reference number and send it to support (contact options below). See [Activity log and support reference numbers](/help/activity-log).`,
      },
      {
        heading: "I can't see a page or button",
        body: `Some pages are only for owners and admins (Import data, Destinations, Export log, Integrations, Email, Team) and Billing is owner only. Ask an owner to change your role in [Settings → Team](/settings/team).`,
      },
    ],
    related: ['inbox-log', 'export-log', 'import-data', 'activity-log'],
  },

  // ───────────────────────────── Added: categories, product page, portal, reports, notices ─────────────────────────────
  {
    slug: 'categories',
    title: 'Product categories',
    category: 'Catalog',
    summary:
      'Group products into main categories and sub-categories (Fruit › Citrus) for filtering, reports and your ordering portal.',
    keywords: 'category, sub-category, group, department, family, organise products, bulk category',
    path: '/categories',
    sections: [
      {
        heading: 'How categories work',
        body: `- There are **two levels**: a main category (e.g. **Fruit**) and sub-categories under it (e.g. **Citrus**, **Berries**).
- Each product has **one** category - either a main category or a sub-category.
- Choosing a main category in a filter or report also includes its sub-categories.
- Categories are used for the **Category** filter on [Products](/products), the **Sales by category** report in [Reports](/reports), and the category menu of your customer ordering portal.`,
      },
      {
        heading: 'Set up categories',
        body: `1. Open [Categories](/categories) and click **Add category** - e.g. Fruit, Veg, Dairy.
2. Next to a main category, click **+ Sub** to add a sub-category under it.
3. Use **Sort order** to control the order they appear in (lower numbers first).

> Got a long list? Import it - see **Import categories from a file** below.`,
      },
      {
        heading: 'Import categories from a file',
        body: `1. Click **Import CSV** on the [Categories](/categories) page (or [Import data](/imports?kind=categories) → **Categories**).
2. Upload a CSV or Excel file with one row per category. Columns can be called anything - you match them on the next screen.
3. For sub-categories either add a **Parent** column (Citrus → parent Fruit) **or** write both in the name: \`Fruit > Citrus\`.
4. Optional columns: **Description**, **Sort order**, **Active** (yes / no).
5. Check the preview, then click **Import now**.

- Main categories that don't exist yet are created automatically.
- Importing the same file again **updates** descriptions, order and active - it never makes duplicates (names are matched ignoring capitals).
- A slash is part of the name - \`Herbs/Spices\` stays one category.
- Only two levels are allowed; rows like \`A > B > C\` are skipped and listed in the result.

**Export:** click **Export CSV** on the Categories page to download all categories with the same columns (name, parent, description, sort order, active). Edit it in Excel and import it back to update them in one go.

> Next, import your products with a **Category** column (e.g. \`Fruit > Citrus\`) to put every product in its place.`,
      },
      {
        heading: 'Put products into categories',
        body: `- **One product:** Products → click the pencil → **Category** (type to search).
- **Many products at once:** tick them in the [Products](/products) list → **Set category** → choose → **Apply**.
- **From a file:** add a **Category** column to your products CSV and import it again.`,
      },
      {
        heading: 'Deleting a category',
        body: `- A main category with sub-categories can't be deleted - delete or move the sub-categories first.
- When you delete a category, its products are **not** deleted - they just become "Uncategorised".
- Rather than deleting, you can switch a category to **Hidden** so it can't be picked for new products.`,
      },
    ],
    fields: [
      {
        form: 'Add / edit category',
        items: [
          {
            name: 'Name',
            description: 'What staff (and later your customers) see, e.g. "Citrus". Must be unique under the same parent.',
          },
          {
            name: 'Parent category',
            description: 'Empty = main category. Pick a main category to make this a sub-category. Only two levels are allowed.',
          },
          { name: 'Description', description: 'Optional short text - will show on your ordering portal.' },
          { name: 'Sort order', description: 'Lower numbers show first. Leave 0 to sort by name.' },
          { name: 'Active', description: "Off (Hidden) = existing products keep it, but it can't be chosen for new products." },
        ],
      },
      {
        form: 'Set category (bulk)',
        items: [{ name: 'Category', description: 'The category for all ticked products. Leave empty to remove their category.' }],
      },
    ],
    related: ['products', 'reports', 'import-data'],
  },
  {
    slug: 'product-page',
    title: 'The product page: orders, stock changes and edit history',
    category: 'Catalog',
    summary: 'Click a product name to see every order it is on (with quantities), how its stock changed, and who edited it.',
    keywords: 'product detail, which orders, quantity ordered, sold, stock movements, inventory history, who changed price',
    path: '/products',
    sections: [
      {
        heading: 'Open it',
        body: `Click a product's **name** on the [Products](/products) or [Stock](/stock) page, or search for it with **Ctrl+K**.`,
      },
      {
        heading: 'What you see',
        body: `- **Sold** - quantity and value (ex GST) from approved orders.
- **Orders** and **Customers** - how many approved orders and different customers bought it.
- **On hand** (tracked products) or **Waiting for review** - quantity sitting in orders that aren't approved yet.

Tabs:
- **Orders** - every order line with this product: order number, date, customer, quantity, price and status. Filter by status. Click an order to open it.
- **Stock changes** - every change to the quantity on hand (orders approved, deliveries received, adjustments) and who made it.
- **Edit history** - every change to the product's details (price, name, category...) with the old and new value.

> Only **approved** and **exported** orders count as sold. Orders still in review show in the Orders tab with the status "Needs review".`,
      },
      {
        heading: 'Editing',
        body: `Click **Edit product** at the top to open the same form as on the Products list.`,
      },
    ],
    related: ['products', 'stock', 'activity-log', 'orders-list'],
  },
  {
    slug: 'portal-access',
    title: 'Giving customers a portal login (welcome email)',
    category: 'Catalog',
    summary:
      "Create a login for a customer's staff - they get a welcome email with a temporary password and a link to set their own.",
    keywords:
      'customer login, portal, welcome email, temporary password, invite customer, reset customer password, online ordering',
    sections: [
      {
        heading: 'What it is',
        body: `Your customers can order online from your own ordering portal - see [Your customer ordering portal](/help/customer-portal). Each customer can have one or more **logins** - for example the chef and the manager at a café.`,
      },
      {
        heading: 'Give access',
        body: `1. Open the customer and go to the **Portal access** tab.
2. Enter the person's **email** (and name if you like).
3. Click **Give access**.

They receive a welcome email from your business with:
- your portal address,
- their email and a **temporary password**,
- a **Set your password** button (works for 7 days).

If they log in with the temporary password, they're asked to choose their own straight away.

> Turn off **Send the welcome email now** if you'd rather give them the details yourself - the temporary password is then shown to you once.`,
      },
      {
        heading: 'Manage logins',
        body: `- **Invited** = they haven't set their own password yet. **Active** = they have.
- **Reset / Send** emails a new temporary password. Their old password stops working.
- The **switch** disables or enables the login without deleting it.
- The bin removes the login completely.
- Customers can also use **Forgot your password?** on the portal login page.`,
      },
    ],
    fields: [
      {
        form: 'Portal access',
        items: [
          { name: 'Email', description: 'Their login. Each email can only have one login across all your customers.' },
          { name: "Person's name", description: 'Optional - used to greet them in the email.' },
          {
            name: 'Send the welcome email now',
            description: 'On = email goes immediately. Off = you get the temporary password to pass on yourself.',
          },
        ],
      },
    ],
    related: ['customers', 'email-settings', 'pantry-special-prices'],
  },
  {
    slug: 'reports',
    title: 'Sales reports',
    category: 'Reports',
    summary: 'Sales by category, by customer and by order for any date range - with CSV download for Excel.',
    keywords: 'reports, sales, revenue, by category, by customer, by order, export, excel, csv, financial year',
    path: '/reports',
    sections: [
      {
        heading: 'What counts as a sale',
        body: `- Orders that are **approved** or **exported**. Orders in review or rejected are not included.
- Amounts are **ex GST**, using the price at the time the order was approved.
- The date used is the **approve date**, in your business timezone (Settings → General).`,
      },
      {
        heading: 'Using the page',
        body: `1. Pick a range at the top - This month, Last month, Last 30 / 90 days, **This financial year** (from 1 July) - or choose your own dates.
2. The cards show total sales, orders (and average order), customers and items sold.
3. Pick a tab:
- **By category** - which categories sell most. Choose **Include sub-categories** to split Fruit into Citrus, Berries...
- **By customer** - your best customers, their share of sales, average order and last order.
- **By order** - every approved order in the range.
4. Click **Download CSV** to open it in Excel.

> Products without a category show as **Uncategorised**. Set categories on the [Categories](/categories) page and the report updates straight away - even for old orders.`,
      },
    ],
    related: ['categories', 'dashboard', 'customers'],
  },
  {
    slug: 'notices',
    title: 'Notices from OrderDraft (banners and popups)',
    category: 'Account & settings',
    summary:
      'Coloured banners or popups are messages from the OrderDraft team - maintenance, new features or problems to act on.',
    keywords: 'banner, popup, notice, announcement, maintenance, downtime, message at top, notification',
    sections: [
      {
        heading: 'What they mean',
        body: `- **Blue** - information, e.g. a new feature.
- **Green** - good news, e.g. a problem has been fixed.
- **Amber** - heads up, e.g. planned maintenance.
- **Red** - important - please read and act, e.g. reconnect your accounting software.

Important notices may pop up in the middle of the screen. Click **Got it** / **OK** to continue.`,
      },
      {
        heading: 'Closing them',
        body: `Click the **X** to hide a notice - it won't come back for you. Some notices can't be closed while they still matter; they disappear on their own when the issue is over. Notices may also show on the login page, e.g. during maintenance.`,
      },
    ],
    related: ['troubleshooting', 'getting-started'],
  },

  {
    slug: 'customer-portal',
    title: 'Your customer ordering portal',
    category: 'Orders',
    summary:
      'An online shop where your customers see their own prices, add to cart and place orders - set it up in Settings → Customer portal.',
    keywords:
      'portal, online ordering, shop, webshop, b2b portal, cart, checkout, COD, cash on delivery, on account, banners, public, private',
    path: '/settings/portal',
    sections: [
      {
        heading: 'How it works',
        body: `1. Turn the portal on in [Settings → Customer portal](/settings/portal).
2. Give customers a login on their customer page → **Portal access** (they get a welcome email).
3. They log in, browse by category or search, add to cart and check out.
4. The order arrives in [Orders](/orders) as **Needs review** with the source **Portal**. Review and approve it as usual - exports, invoices, stock and confirmation emails all work the same.

- Logged-in customers see **their own price** (pantry special price if set, otherwise your normal price). The price they saw is locked on the order.
- They get an "order received" email straight away, and your confirmation email when you approve.
- A copy of every new order is emailed to you (choose the address in the settings).
- In the portal they can see **My orders** (including orders from email or phone), use **Order again**, and update their delivery address.`,
      },
      {
        heading: 'Find the settings',
        body: `Everything is in [Settings → Customer portal](/settings/portal), split into tabs:
- **Setup** - on/off, public or private, payment options, minimum order, welcome text.
- **Look & feel** - logo, app icon, brand colour, header, font, corners, tagline, top bar message, footer. There's a live preview.
- **Customer logins** - every customer who can log in, with **Login as** and **Set password**.
- **Notify customers** - send messages to the portal, phones and email.
- **Banners** - slides on the portal home page.`,
      },
      {
        heading: 'Login as a customer (no password)',
        body: `On **Customer logins** (or the customer page → Portal access) click **Login as**. The portal opens in a new tab exactly as that customer sees it - their prices, cart and orders. A yellow bar shows you're viewing as staff; click **Exit** when done. Anything you order is marked as placed by you in the Activity log. The session lasts 2 hours.`,
      },
      {
        heading: 'Set a password for a customer',
        body: `Click **⋯ → Set password…** next to a login. A password is suggested (or type your own), then choose:
- **Ask them to choose their own password** - on for a temporary password.
- **Email this password** - optional. Leave it off to read it to them over the phone.

Their old password stops working straight away.`,
      },
      {
        heading: 'The portal as a phone app',
        body: `Customers can install your portal like an app - it gets your app icon and name on their home screen:
- **Android / Chrome / Edge** - an **Install** button appears on the portal home page.
- **iPhone / iPad** - open the portal in Safari → Share → **Add to Home Screen**.

Inside the app (or browser) they tap the **bell → Turn on** to get notifications on that device.

On a phone the portal looks and works like a normal shopping app: a top bar in your header colour (the phone's status bar matches it), tabs at the bottom (**Home · Shop · Cart · Orders · Account**), a sticky **Add / Checkout / Place order** button, pop-ups that slide up from the bottom, pull down to refresh, swipe from the left edge to go back (installed app), and a splash screen with your logo when it opens. Computers keep the normal website layout.`,
      },
      {
        heading: 'Notify customers',
        body: `**Notify customers → New message**: write a short title and message, choose all customers or pick some, and an optional page to open when tapped. It appears under the bell in the portal, as a phone notification for anyone who turned notifications on, and by email if you tick it. The list shows how many people read it.`,
      },
      {
        heading: 'Order confirmed / not accepted messages',
        body: `When you **Approve** a portal order, the customer gets an "Order confirmed" message under the bell and as a phone notification (if they turned notifications on). The person who placed the order also gets an email - unless your normal order confirmation email (Settings → Email) already goes to the same address, so they never get two.

When you **Reject** a portal order you can type a reason (for example "Out of lemons this week, please call us"). The customer sees it in the "Order not accepted" message and email.

These automatic messages don't appear in your **Notify customers** list.`,
      },
      {
        heading: 'Delivery days and cut-off time',
        body: `In **Setup → Delivery days & cut-off** choose:

- **Delivery days** - the weekdays you deliver (e.g. Mon-Fri).
- **Order cut-off time** - orders after this time count as the next day (your business time zone).
- **Days before delivery** - 1 = next day, 0 = same day.
- **Closed dates** - public holidays or days off.

Once days or a cut-off are set, customers must pick a delivery date at checkout from a calendar that only shows the days you deliver, and the earliest one is picked for them. Example: Mon-Fri, cut-off 4 pm, 1 day → an order on Friday at 5 pm can be delivered on Monday at the earliest.

Leave the days empty and the cut-off blank to let customers pick any date (or none).`,
      },
      {
        heading: 'Public or private',
        body: `- **Private** - customers must log in before they see any products or prices.
- **Public** - anyone with the link can browse. You choose whether visitors see prices. Ordering always needs a login.`,
      },
      {
        heading: 'Banners',
        body: `Add slides to the top of the portal home page under **Home page banners**. Each banner can open a product, a category or a web link - great for specials and new season lines. Use **Show from / until** to schedule them, and the arrows to change the order.

> Best image size is about 1600 × 500 px. Keep important text in the middle so it isn't cut off on phones.`,
      },
    ],
    fields: [
      {
        form: 'Customer portal settings',
        items: [
          {
            name: 'Portal is on / off',
            description: 'Off = customers see "Online ordering isn\'t open yet" with your contact details.',
          },
          { name: 'Who can see it', description: 'Private = login first. Public = anyone can browse; login to order.' },
          { name: 'Show prices to visitors', description: 'Public portal only. Off = visitors see "Log in for prices".' },
          {
            name: 'Cash on delivery (COD)',
            description: 'Customer pays when the order is delivered. Shown as the payment method on the order.',
          },
          { name: 'On account', description: 'You invoice them with your usual payment terms (Settings → Invoices).' },
          {
            name: 'Minimum order value',
            description: 'Checkout is blocked until the cart subtotal reaches this amount. Empty = no minimum.',
          },
          { name: 'Email new orders to', description: 'Who gets the "new online order" email. Empty = your business email.' },
          {
            name: 'Hide out of stock',
            description: 'Hides tracked products with 0 on hand. Otherwise they show "Out of stock" but can still be ordered.',
          },
          { name: 'Welcome title / text', description: 'Heading and short message at the top of the portal home page.' },
          { name: 'Checkout note', description: 'Shown on the checkout page, e.g. "Order by 4pm for next-day delivery".' },
          { name: 'Delivery days', description: 'Weekdays you deliver. Empty (and no cut-off) = customers can pick any date.' },
          { name: 'Order cut-off time', description: 'Orders after this time count as the next day. Empty = no cut-off.' },
          {
            name: 'Days before delivery',
            description: 'Minimum days between ordering and delivery. 1 = next day, 0 = same day.',
          },
          { name: 'Closed dates', description: "Public holidays or days you don't deliver - customers can't pick them." },
        ],
      },
      {
        form: 'Banner',
        items: [
          { name: 'Image', description: 'JPG, PNG or WEBP up to 5 MB, about 1600 × 500 px.' },
          {
            name: 'Title / Subtitle / Button text',
            description: 'Optional text over the image. Button text defaults to "Shop now".',
          },
          { name: 'When clicked, open', description: 'Nothing, a product, a category, or a web link.' },
          { name: 'Show from / until', description: 'Schedule a banner. Empty = straight away / no end.' },
          { name: 'Show this banner', description: 'Off = hidden without deleting it.' },
        ],
      },
    ],
    related: ['portal-access', 'categories', 'review-approve-order', 'pantry-special-prices'],
  },
  // ───────────────────────────── Standing orders + notifications ─────────────────────────────
  {
    slug: 'standing-orders',
    title: 'Standing orders (repeat orders on a schedule)',
    category: 'Orders',
    summary: 'Customers who order the same things every week get their order created automatically on the day you choose.',
    keywords:
      'standing order, recurring order, repeat order, schedule, weekly order, regular order, every monday, usual order, subscription, skip week, auto order',
    path: '/customers',
    sections: [
      {
        heading: 'Set one up',
        body: `1. Open the customer and go to the **Standing orders** tab.
2. Click **New standing order**.
3. Choose the **Delivery day** (e.g. Monday) and **Create the order on** + **At** (e.g. Saturday 6:00 am). The order can be created days before delivery or on the same day.
4. Choose **Repeat** - every week, or every 2, 3 or 4 weeks - and optional **Start from** / **End on** dates.
5. Add the products and quantities, then **Save standing order**.

Customers can also set up their own from the portal (account menu → **Standing orders**) - turn this on or off in [Settings → Customer portal](/settings/portal).`,
      },
      {
        heading: 'What happens on the day',
        body: `At the chosen time OrderDraft creates the order with source **Standing** and status **Needs review** - check it and approve as usual. Prices are the customer's prices on the day you approve.

- You get a notification in the bell (and by desktop notification and the "Email new orders to" address).
- The customer gets "Your usual order has been placed".
- Products that are no longer active are left out. If none are active, or the day is a **closed date** (Settings → Customer portal), no order is created and the bell tells you why.
- If the server was down at that time, the order is still created later, as long as the delivery hasn't passed.`,
      },
      {
        heading: 'Skip a week, pause or change',
        body: `- **Skip this week** under any upcoming delivery - and **Undo skip** to bring it back.
- Switch **Active** off to pause it.
- **Create next order now** makes the next delivery's order straight away instead of waiting.
- Deleting a standing order keeps the orders it already created.`,
      },
    ],
    fields: [
      {
        form: 'Standing order',
        items: [
          { name: 'Delivery day', description: 'The weekday the goods are delivered. The order gets this delivery date.' },
          { name: 'Create the order on / At', description: 'The weekday and time (your time zone) the order is created.' },
          {
            name: 'Repeat',
            description: 'Every week, or every 2, 3 or 4 weeks, counted from the first delivery after the start date.',
          },
          { name: 'Start from / End on', description: 'Empty start = today. Empty end = keeps going.' },
          { name: 'PO / reference, Notes', description: 'Copied onto every order it creates.' },
          { name: 'Active', description: 'Off = paused; no orders are created.' },
        ],
      },
    ],
    related: ['review-approve-order', 'customer-portal'],
  },
  {
    slug: 'notifications',
    title: 'Notifications for your team',
    category: 'Orders',
    summary: 'The bell in the top bar tells you about new online orders, standing orders and new email orders.',
    keywords: 'notification, bell, alert, desktop notification, push, new order alert, sound, pop-up',
    sections: [
      {
        heading: 'The bell',
        body: `The **bell** in the top bar shows a red count of new notifications: new portal orders, orders created by a standing order, standing orders that couldn't be created, and new email / voice / PDF orders. Click one to open the order. **Mark all read** clears the count - just for you.`,
      },
      {
        heading: 'Desktop notifications',
        body: `Click the bell → **Turn on desktop notifications** and allow them when your browser asks. You then get a pop-up on this computer even when OrderDraft isn't open. Do it on each computer or browser you use; turn it off from the same place.

> If the button says desktop notifications aren't set up, ask your OrderDraft administrator - the server needs its notification keys first.`,
      },
    ],
    related: ['standing-orders', 'customer-portal'],
  },
]
