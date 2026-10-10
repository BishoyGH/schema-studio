import { useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SchemaPreview } from '@/components/schemas/schema-preview'
import { parseJsonSchema } from '@/lib/schemas/validation'

type InspectorTab = 'preview' | 'json' | 'notes'

interface SchemaInspectorProps {
  jsonSchemaText: string
  /** Preserve the active tab across edits/remounts within a session. */
  storageKey?: string
}

function readStoredTab(storageKey?: string): InspectorTab {
  if (!storageKey || typeof window === 'undefined') return 'preview'
  const stored = window.sessionStorage.getItem(storageKey)
  return stored === 'json' || stored === 'notes' ? stored : 'preview'
}

/**
 * The right pane of the F-54 studio: an `Preview / JSON / Notes` inspector that
 * re-hosts the F-07a preview and the read-only JSON Schema mirror. Notes keeps
 * the studio self-documenting for authors.
 */
export function SchemaInspector({ jsonSchemaText, storageKey }: SchemaInspectorProps) {
  const [tab, setTab] = useState<InspectorTab>(() => readStoredTab(storageKey))

  useEffect(() => {
    if (!storageKey) return
    window.sessionStorage.setItem(storageKey, tab)
  }, [storageKey, tab])

  const parsed = parseJsonSchema(jsonSchemaText)
  const mirror = parsed.ok ? JSON.stringify(parsed.value, null, 2) : jsonSchemaText

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => setTab(next as InspectorTab)}
      className="flex h-full flex-col gap-0"
    >
      <div className="border-b p-2">
        <TabsList aria-label="Inspector">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="preview" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="p-3">
            <SchemaPreview jsonSchemaText={jsonSchemaText} />
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="json" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <pre
            data-testid="studio-json-mirror"
            className="bg-muted/50 m-3 overflow-auto rounded-md border p-3 font-mono text-xs"
          >
            {mirror}
          </pre>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="notes" className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="text-muted-foreground flex flex-col gap-3 p-3 text-sm">
            <p>
              The builder edits the same document as the Raw JSON tab — switching
              between them never loses content.
            </p>
            <p>
              Constructs the builder does not manage (like <code>$ref</code> or{' '}
              <code>if</code>/<code>then</code>) are preserved untouched and
              flagged as <strong>advanced</strong>.
            </p>
            <p>The Preview tab shows exactly what a record form will look like.</p>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
