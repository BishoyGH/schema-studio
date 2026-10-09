export type DiffLineType = 'equal' | 'added' | 'removed'

export interface DiffLine {
  type: DiffLineType
  text: string
}

export function hasDiff(oldText: string, newText: string): boolean {
  return oldText !== newText
}

/**
 * Line-based diff using a longest-common-subsequence table. Used for the
 * "preview changes before save" panel; documents are small so the O(n*m) table
 * is more than fast enough.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const before = oldText.length > 0 ? oldText.split('\n') : []
  const after = newText.length > 0 ? newText.split('\n') : []
  const m = before.length
  const n = after.length

  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  )
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        before[i] === after[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const lines: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (before[i] === after[j]) {
      lines.push({ type: 'equal', text: before[i] })
      i += 1
      j += 1
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      lines.push({ type: 'removed', text: before[i] })
      i += 1
    } else {
      lines.push({ type: 'added', text: after[j] })
      j += 1
    }
  }
  while (i < m) {
    lines.push({ type: 'removed', text: before[i] })
    i += 1
  }
  while (j < n) {
    lines.push({ type: 'added', text: after[j] })
    j += 1
  }
  return lines
}
