import { ChevronDown, ChevronUp, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { fieldTypeIcon } from '@/lib/schemas/field-types'
import type { FieldEntry } from '@/lib/schemas/builder-doc'

/** Sentinel used to select the pinned root "Schema settings" row. */
export const SCHEMA_SETTINGS_KEY = '__schema_settings__'

interface FieldOutlineProps {
  fields: FieldEntry[]
  selectedKey: string | null
  onSelectSettings: () => void
  onSelect: (key: string) => void
  onAdd: () => void
  onMove: (key: string, delta: number) => void
  onReorder: (fromKey: string, toKey: string) => void
  onRemove: (key: string) => void
  onRemoveMany: (keys: string[]) => void
  onRename: (oldKey: string, newKey: string) => void
  readOnly?: boolean
}

/**
 * The left pane of the F-54 studio: a searchable, keyboard-reachable outline of
 * the schema's fields plus a pinned schema-settings row. Rows support drag and
 * keyboard (`Alt`+`ArrowUp/Down`) reordering, multi-select bulk delete, and a
 * row menu for rename / reorder / delete.
 */
export function SchemaFieldOutline({
  fields,
  selectedKey,
  onSelectSettings,
  onSelect,
  onAdd,
  onMove,
  onReorder,
  onRemove,
  onRemoveMany,
  onRename,
  readOnly = false,
}: FieldOutlineProps) {
  const [query, setQuery] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [dragKey, setDragKey] = useState<string | null>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const visibleFields = normalizedQuery
    ? fields.filter((field) => field.key.toLowerCase().includes(normalizedQuery))
    : fields

  useEffect(() => {
    setChecked((previous) => {
      const next = new Set(
        [...previous].filter((key) => fields.some((field) => field.key === key)),
      )
      return next.size === previous.size ? previous : next
    })
  }, [fields])

  const toggleChecked = (key: string, next: boolean) => {
    setChecked((previous) => {
      const updated = new Set(previous)
      if (next) updated.add(key)
      else updated.delete(key)
      return updated
    })
  }

  const handleRemoveMany = () => {
    onRemoveMany([...checked])
    setChecked(new Set())
  }

  return (
    <div className="flex h-full flex-col" data-testid="schema-outline">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="text-sm font-semibold">Fields</h2>
        <span className="text-muted-foreground text-xs">{fields.length}</span>
      </div>

      <div className="border-b p-2">
        <Input
          type="search"
          value={query}
          placeholder="Search fields"
          aria-label="Search fields"
          className="h-8"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {!readOnly && checked.size > 0 && (
        <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-1.5">
          <span className="text-xs font-medium">{checked.size} selected</span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemoveMany}
          >
            Delete selected
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={onSelectSettings}
        aria-pressed={selectedKey === null}
        className={cn(
          'flex min-h-9 items-center gap-2 border-b px-3 py-2 text-start text-sm transition-colors hover:bg-muted/50',
          selectedKey === null && 'bg-accent text-accent-foreground',
        )}
      >
        <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded text-xs font-semibold">
          S
        </span>
        <span className="flex-1 truncate font-medium">Schema settings</span>
      </button>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col p-2" role="list">
          {visibleFields.length === 0 && (
            <li className="text-muted-foreground px-2 py-6 text-center text-sm">
              {fields.length === 0 ? 'No fields yet.' : 'No matching fields.'}
            </li>
          )}
          {visibleFields.map((field, index) => {
            const Icon = fieldTypeIcon(field.type)
            const isEditing = editingKey === field.key
            const selected = selectedKey === field.key
            return (
              <li key={field.key}>
                <div
                  draggable={!readOnly && !isEditing}
                  data-testid={`field-row-${field.key}`}
                  onDragStart={(event) => {
                    setDragKey(field.key)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', field.key)
                  }}
                  onDragOver={(event) => {
                    if (dragKey && dragKey !== field.key) event.preventDefault()
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const from =
                      dragKey || event.dataTransfer.getData('text/plain')
                    if (from && from !== field.key) onReorder(from, field.key)
                    setDragKey(null)
                  }}
                  onDragEnd={() => setDragKey(null)}
                  className={cn(
                    'group flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                    selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
                  )}
                >
                  {!readOnly && !isEditing && (
                    <input
                      type="checkbox"
                      className="size-4 shrink-0"
                      aria-label={`Select ${field.key}`}
                      checked={checked.has(field.key)}
                      onChange={(event) =>
                        toggleChecked(field.key, event.target.checked)
                      }
                    />
                  )}
                  {isEditing ? (
                    <InlineNameInput
                      value={field.key}
                      existingKeys={fields.map((entry) => entry.key)}
                      onCommit={(next) => {
                        onRename(field.key, next)
                        setEditingKey(null)
                      }}
                      onCancel={() => setEditingKey(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(field.key)}
                      aria-current={selected ? 'true' : undefined}
                      aria-label={field.key}
                      aria-describedby={
                        field.required ? `field-required-${field.key}` : undefined
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 text-start"
                      onKeyDown={(event) => {
                        if (!event.altKey) return
                        if (event.key === 'ArrowUp') {
                          event.preventDefault()
                          onMove(field.key, -1)
                        } else if (event.key === 'ArrowDown') {
                          event.preventDefault()
                          onMove(field.key, 1)
                        }
                      }}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0 opacity-70" />
                      <span className="flex-1 truncate text-sm">{field.key}</span>
                      {field.required && (
                        <>
                          <span
                            id={`field-required-${field.key}`}
                            className="sr-only"
                          >
                            Required
                          </span>
                          <span
                            aria-hidden="true"
                            className="bg-primary size-1.5 shrink-0 rounded-full"
                          />
                        </>
                      )}
                      {field.hasAdvancedKeywords && (
                        <Badge variant="outline" className="px-1 py-0 text-[10px] leading-4">
                          adv
                        </Badge>
                      )}
                    </button>
                  )}

                  {!readOnly && !isEditing && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-md:size-11 max-md:opacity-100"
                          aria-label={`Field actions for ${field.key}`}
                        >
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditingKey(field.key)}>
                          <Pencil aria-hidden="true" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === 0}
                          onSelect={() => onMove(field.key, -1)}
                        >
                          <ChevronUp aria-hidden="true" />
                          Move up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === visibleFields.length - 1}
                          onSelect={() => onMove(field.key, 1)}
                        >
                          <ChevronDown aria-hidden="true" />
                          Move down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => onRemove(field.key)}
                        >
                          <Trash2 aria-hidden="true" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </ScrollArea>

      {!readOnly && (
        <div className="border-t p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onAdd()}
          >
            <Plus aria-hidden="true" />
            Add field
          </Button>
        </div>
      )}
    </div>
  )
}

interface InlineNameInputProps {
  value: string
  existingKeys: string[]
  onCommit: (next: string) => void
  onCancel: () => void
}

function InlineNameInput({
  value,
  existingKeys,
  onCommit,
  onCancel,
}: InlineNameInputProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  const trimmed = draft.trim()
  const duplicate =
    trimmed !== value && existingKeys.includes(trimmed) && trimmed.length > 0
  const invalid = trimmed.length === 0 || duplicate

  const commit = () => {
    if (invalid) {
      onCancel()
      return
    }
    onCommit(trimmed)
  }

  return (
    <Input
      autoFocus
      value={draft}
      aria-label={`Rename field ${value}`}
      aria-invalid={invalid || undefined}
      className="h-7 flex-1"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
    />
  )
}
