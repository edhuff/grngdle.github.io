import type { Ordinal } from './ordinal'

export type BinaryKind = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'
export type Expression =
  | { kind: 'integer'; value: bigint }
  | { kind: BinaryKind; left: Expression; right: Expression }
  | { kind: 'factorial'; operand: Expression }
  | { kind: 'tower' | 'chain'; terms: readonly Expression[] }
  | { kind: 'hyper' | 'arrow'; rank: bigint; base: bigint; height: bigint }
  | { kind: 'fgh'; index: Ordinal; argument: bigint }
  | { kind: 'busy'; variant: 'steps' | 'ones'; states: bigint }
  | { kind: 'ackermann'; rank: bigint; argument: bigint }

export const integer = (value: bigint): Expression => ({ kind: 'integer', value })

export function children(expression: Expression): readonly Expression[] {
  switch (expression.kind) {
    case 'add': case 'subtract': case 'multiply': case 'divide': case 'power': return [expression.left, expression.right]
    case 'factorial': return [expression.operand]
    case 'tower': case 'chain': return expression.terms
    default: return []
  }
}

export function structure(expression: Expression) {
  let nodes = 0
  let depth = 0
  let truncated = false
  function visit(term: Expression, level: number) {
    if (nodes >= 512 || level > 64) { truncated = true; return }
    nodes++
    depth = Math.max(depth, level + (term.kind === 'integer' ? 0 : 1))
    for (const child of children(term)) {
      if (nodes >= 512) { truncated = true; break }
      visit(child, level + 1)
    }
  }
  visit(expression, 0)
  return { depth, nodes, truncated }
}

export const depth = (expression: Expression): number => structure(expression).depth
