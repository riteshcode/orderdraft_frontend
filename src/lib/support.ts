/**
 * Support contact - .env mein set karo (frontend build ke time):
 *   VITE_SUPPORT_EMAIL=support@orderdraft.com.au
 *   VITE_SUPPORT_CHAT_URL=https://...      (chat widget / WhatsApp / Crisp link - optional)
 *   VITE_SUPPORT_PHONE=1300 000 000         (optional)
 */
export const SUPPORT = {
  email: import.meta.env.VITE_SUPPORT_EMAIL || 'support@orderdraft.com.au',
  chatUrl: (import.meta.env.VITE_SUPPORT_CHAT_URL as string | undefined) || '',
  phone: (import.meta.env.VITE_SUPPORT_PHONE as string | undefined) || '',
}

/** Email support - page ka URL aur business name pehle se bhara (support ko context mile) */
export function supportMailto(subject: string, tenant?: string) {
  const body = `\n\n---\nPage: ${window.location.href}\nBusiness: ${tenant || ''}\nBrowser: ${navigator.userAgent}`
  return `mailto:${SUPPORT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
