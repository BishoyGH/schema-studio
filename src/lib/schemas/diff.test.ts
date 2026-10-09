import { describe, expect, it } from 'vitest'
import { diffLines, hasDiff } from './diff'

describe('hasDiff', () => {
  it('is false for identical text and true otherwise', () => {
    expect(hasDiff('a', 'a')).toBe(false)
    expect(hasDiff('a', 'b')).toBe(true)
  })
})

describe('diffLines', () => {
  it('marks every line equal when nothing changed', () => {
    const lines = diffLines('{\n  "a": 1\n}', '{\n  "a": 1\n}')
    expect(lines.every((line) => line.type === 'equal')).toBe(true)
  })

  it('reports added and removed lines for an edit', () => {
    const lines = diffLines('{\n  "a": 1\n}', '{\n  "a": 2\n}')

    expect(lines.filter((line) => line.type === 'removed').map((l) => l.text)).toContain(
      '  "a": 1',
    )
    expect(lines.filter((line) => line.type === 'added').map((l) => l.text)).toContain(
      '  "a": 2',
    )
    expect(lines.filter((line) => line.type === 'equal').map((l) => l.text)).toEqual([
      '{',
      '}',
    ])
  })

  it('handles empty text on either side', () => {
    expect(diffLines('', 'a').map((l) => l.type)).toEqual(['added'])
    expect(diffLines('a', '').map((l) => l.type)).toEqual(['removed'])
    expect(diffLines('', '')).toEqual([])
  })
})
