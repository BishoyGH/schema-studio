import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { diffLines } from '@/lib/schemas/diff'

interface SchemaDiffProps {
  oldText: string
  newText: string
}

const markers: Record<string, string> = {
  equal: '  ',
  added: '+ ',
  removed: '- ',
}

export function SchemaDiff({ oldText, newText }: SchemaDiffProps) {
  const lines = useMemo(() => diffLines(oldText, newText), [oldText, newText])
  const changed = lines.some((line) => line.type !== 'equal')

  if (!changed) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="schema-diff-empty">
        No changes to the schema document yet.
      </p>
    )
  }

  return (
    <div
      className="bg-muted/40 max-h-64 overflow-auto rounded-md border"
      data-testid="schema-diff"
    >
      <pre className="p-3 font-mono text-xs leading-5">
        {lines.map((line, index) => (
          <div
            key={index}
            data-diff={line.type}
            className={cn(
              'whitespace-pre-wrap break-all px-1',
              line.type === 'added' && 'bg-primary/10 text-foreground',
              line.type === 'removed' &&
                'bg-destructive/10 text-destructive line-through decoration-destructive/50',
            )}
          >
            <span aria-hidden="true" className="select-none opacity-60">
              {markers[line.type]}
            </span>
            {line.text || ' '}
          </div>
        ))}
      </pre>
    </div>
  )
}
