import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('text-sm font-medium leading-none', className)} {...props} />
))
Label.displayName = 'Label'

/** Label + input + hint/error ek saath. Label input se apne aap jud jata hai (click / screen readers). */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string | null
  children: React.ReactNode
  className?: string
}) {
  const autoId = React.useId()
  // Single input/select/textarea child ho to usko id do aur label ko htmlFor
  let control = children
  let htmlFor: string | undefined
  if (React.isValidElement<{ id?: string }>(children)) {
    htmlFor = children.props.id || autoId
    if (!children.props.id) control = React.cloneElement(children, { id: htmlFor })
  }
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {control}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
