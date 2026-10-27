import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, FileUp, Mail, MessageSquareText, PenSquare, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useMe } from '@/hooks/useMe'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Alert, Spinner } from '@/components/ui/misc'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ManualOrderForm } from './ManualOrderForm'

type Mode = 'text' | 'file' | 'manual'

export default function NewOrder() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const fileInput = useRef<HTMLInputElement>(null)

  const [params, setParams] = useSearchParams()
  const mode: Mode = (['text', 'file', 'manual'] as const).find((m) => m === params.get('mode')) || 'text'
  const setMode = (m: Mode) => setParams({ mode: m }, { replace: true })
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (mode === 'text' && !text.trim()) return setError('Paste the message text')
    if (mode === 'file' && !file) return setError('Choose a file')

    setBusy(true)
    try {
      if (mode === 'text') {
        await api.post('/inbound/text', {
          text,
          sender_name: senderName || null,
          sender_email: senderEmail || null,
        })
      } else {
        const form = new FormData()
        form.append('file', file!)
        if (senderName) form.append('sender_name', senderName)
        if (senderEmail) form.append('sender_email', senderEmail)
        if (note) form.append('note', note)
        await api.upload('/inbound/upload', form)
      }
      toast.success('Sent to AI - the draft will appear in Orders in a few seconds')
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order-stats'] })
      navigate('/orders')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function copyEmail() {
    if (!me) return
    navigator.clipboard.writeText(me.tenant.inbound_email)
    toast.success('Email address copied')
  }

  return (
    <div>
      <PageHeader
        back={{ to: '/orders', label: 'Orders' }}
        title="New order"
        description="Let the AI read a message, voice note, PDF or photo - or enter the order yourself."
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-5">
              <TabsList className="max-w-full overflow-x-auto">
                <TabsTrigger value="text">
                  <MessageSquareText className="size-4" /> Paste message
                </TabsTrigger>
                <TabsTrigger value="file">
                  <Upload className="size-4" /> Upload file
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <PenSquare className="size-4" /> Manual entry
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === 'manual' ? (
              <ManualOrderForm />
            ) : (
              <form onSubmit={submit} noValidate className="space-y-5">
                {error && <Alert tone="error">{error}</Alert>}

                {mode === 'text' ? (
                  <Field label="Message (SMS, WhatsApp, chat, email text)">
                    <Textarea
                      rows={10}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={"Hi mate, for tomorrow pls:\n2 box romas\n6 cos\n1 tray avos\n- Joe, Joe's Cafe"}
                    />
                  </Field>
                ) : (
                  <div className="space-y-4">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragging(true)
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      onClick={() => fileInput.current?.click()}
                      className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                        dragging ? 'border-primary bg-accent' : 'hover:bg-muted/40',
                      )}
                    >
                      <FileUp className="size-8 text-muted-foreground" />
                      {file ? (
                        <p className="font-medium">
                          {file.name} <span className="text-muted-foreground">({Math.round(file.size / 1024)} KB)</span>
                        </p>
                      ) : (
                        <>
                          <p className="font-medium">Drop a file here or click to browse</p>
                          <p className="text-xs text-muted-foreground">
                            Voice notes (.mp3 .m4a .wav .ogg), PDF purchase orders, photos. Max 25 MB.
                          </p>
                        </>
                      )}
                      <input
                        ref={fileInput}
                        type="file"
                        hidden
                        accept="audio/*,.pdf,image/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <Field label="Note (optional)" hint="Any extra context for the AI, e.g. 'delivery Friday'">
                      <Input value={note} onChange={(e) => setNote(e.target.value)} />
                    </Field>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sender name (optional)">
                    <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                  </Field>
                  <Field label="Sender email or phone (optional)" hint="Helps match the customer">
                    <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
                  </Field>
                </div>

                <Button disabled={busy}>{busy && <Spinner />} Create draft order</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4" /> Forward emails instead
            </CardTitle>
            <CardDescription>Every email sent to this address becomes a draft order automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-md bg-accent px-3 py-2">
              <code className="flex-1 truncate font-medium text-accent-foreground">{me?.tenant.inbound_email}</code>
              <Button variant="ghost" size="icon" onClick={copyEmail} title="Copy">
                <Copy />
              </Button>
            </div>
            <p className="text-muted-foreground">
              Tip: in Outlook or Gmail, create a rule to auto-forward emails from your customers (or your orders@ inbox) to this
              address. PDF and voice-note attachments are read too.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
