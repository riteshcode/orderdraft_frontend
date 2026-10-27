import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'

/**
 * Help article body ka mini-format render karta hai (format: help/types.ts).
 * Koi HTML inject nahi hota - sab React elements (safe).
 */
export function HelpText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const blocks: ReactNode[] = []
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trimEnd()
    if (!line.trim()) {
      i++
      continue
    }
    if (/^- /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2))
      blocks.push(
        <ul key={i} className="list-disc space-y-1 pl-5">
          {items.map((t, k) => (
            <li key={k}>{inline(t, onNavigate)}</li>
          ))}
        </ul>,
      )
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ''))
      blocks.push(
        <ol key={i} className="list-decimal space-y-1 pl-5">
          {items.map((t, k) => (
            <li key={k}>{inline(t, onNavigate)}</li>
          ))}
        </ol>,
      )
    } else if (/^> /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^> /.test(lines[i])) items.push(lines[i++].slice(2))
      blocks.push(
        <div key={i} className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          <Lightbulb className="mt-0.5 size-4 shrink-0" />
          <div>{inline(items.join(' '), onNavigate)}</div>
        </div>,
      )
    } else {
      const para: string[] = []
      while (i < lines.length && lines[i].trim() && !/^(- |\d+\. |> )/.test(lines[i])) para.push(lines[i++].trim())
      blocks.push(<p key={i}>{inline(para.join(' '), onNavigate)}</p>)
    }
  }
  return <div className="space-y-2.5 text-sm leading-relaxed">{blocks}</div>
}

/** **bold**, `code`, [text](/route) */
function inline(text: string, onNavigate?: () => void): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<strong key={m.index}>{m[1]}</strong>)
    else if (m[2])
      out.push(
        <code key={m.index} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
          {m[2]}
        </code>,
      )
    else if (m[4].startsWith('/'))
      out.push(
        <Link key={m.index} to={m[4]} onClick={onNavigate} className="font-medium text-primary hover:underline">
          {m[3]}
        </Link>,
      )
    else
      out.push(
        <a key={m.index} href={m[4]} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
          {m[3]}
        </a>,
      )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
