import { evaluate, exactBitLimit, type Evaluation, type Rational } from './evaluate'
import { structure, type Expression } from './ast'
import { compareOrdinals, isCanonicalOrdinal, ordinalDepth } from './ordinal'

const limit = 1n << BigInt(exactBitLimit)
const bounded = (n: bigint) => n < limit ? n : limit

// Saturation yields a lower bound. Intermediate terms never need more than 2049 bits.
function powerBound(base: bigint, exponent: bigint) {
  if (base < 2n || exponent < 1n) return 1n
  if (exponent >= BigInt(exactBitLimit)) return limit
  base = bounded(base)
  let result = 1n
  for (let n = exponent; n; n >>= 1n) {
    if (n & 1n) result = bounded(result * base)
    if (result === limit) break
    base = bounded(base * base)
  }
  return result
}

export function lowerBound(expression: Expression, budget = 16): bigint | null {
  if (budget <= 0 || (expression.kind !== 'integer' && !naturalForm(expression))) return null
  const lower = (child: Expression) => lowerBound(child, budget - 1)
  switch (expression.kind) {
    case 'integer': return expression.value
    case 'busy': return expression.states >= 4n ? (expression.variant === 'steps' ? 107n : 13n) : 1n
    case 'ackermann': case 'fgh': return expression.argument + 1n
    case 'chain': return expression.terms.length ? lower(expression.terms[0]) : null
    case 'factorial': {
      const n = lower(expression.operand)
      // n! >= 2^(n-1) on the natural domain for n >= 1.
      return n !== null && n > 1n ? powerBound(2n, n - 1n) : 1n
    }
    case 'power': {
      const base = lower(expression.left)
      const exponent = lower(expression.right)
      return base !== null && exponent !== null && base >= 1n && exponent >= 1n ? powerBound(base, exponent) : null
    }
    case 'tower': {
      const values = expression.terms.map(lower)
      if (!values.length || values.some(value => value === null || value < 1n)) return null
      return (values as bigint[]).reduceRight((acc, base) => powerBound(base, acc))
    }
    case 'hyper': case 'arrow': {
      const rank = expression.kind === 'arrow' ? expression.rank + 2n : expression.rank
      if (rank < 3n || expression.base < 2n || expression.height < 1n) return null
      if (rank === 3n) return powerBound(expression.base, expression.height)
      let result = 1n
      // For base >= 2 and height >= 1, ranks >= 4 dominate tetration.
      for (let i = 0n; i < expression.height && result < limit; i++) result = powerBound(expression.base, result)
      return result
    }
    case 'add': case 'multiply': {
      const left = lower(expression.left)
      const right = lower(expression.right)
      if (left === null || right === null || left < 0n || right < 0n) return null
      return bounded(expression.kind === 'add' ? left + right : left * right)
    }
    default: return null
  }
}

export type Truth = 'proven' | 'disproven' | 'unknown'
export type Order = 'less' | 'equal' | 'greater' | 'unknown'

export function compareValues(a: Rational, b: Rational): Exclude<Order, 'unknown'> {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator
  return difference === 0n ? 'equal' : difference < 0n ? 'less' : 'greater'
}

function sameNaturalExpression(a: Expression, b: Expression): boolean {
  let remaining = 512
  function same(first: Expression, other: Expression, level: number): boolean {
    if (--remaining < 0 || level > 64 || first.kind !== other.kind) return false
    switch (first.kind) {
      case 'integer': return other.kind === 'integer' && first.value === other.value
      case 'factorial': return other.kind === 'factorial' && same(first.operand, other.operand, level + 1)
      case 'tower': case 'chain':
        return (other.kind === 'tower' || other.kind === 'chain') && first.terms.length === other.terms.length &&
          first.terms.every((entry, index) => same(entry, other.terms[index], level + 1))
      case 'hyper': case 'arrow':
        return (other.kind === 'hyper' || other.kind === 'arrow') &&
          first.rank === other.rank && first.base === other.base && first.height === other.height
      case 'busy': return other.kind === 'busy' && first.variant === other.variant && first.states === other.states
      case 'ackermann': return other.kind === 'ackermann' && first.rank === other.rank && first.argument === other.argument
      case 'fgh': return other.kind === 'fgh' && first.argument === other.argument && compareOrdinals(first.index, other.index) === 0
      default: return 'left' in other && same(first.left, other.left, level + 1) && same(first.right, other.right, level + 1)
    }
  }
  return same(a, b, 0)
}

export function compareExpressions(a: Expression, b: Expression): Order {
  const first = evaluate(a)
  const second = evaluate(b)
  if (first.status === 'exact' && second.status === 'exact') return compareValues(first.value, second.value)
  if ((first.status === 'unknown' && first.reason === 'domain') || (second.status === 'unknown' && second.reason === 'domain')) return 'unknown'
  const clears = (exact: Evaluation, symbolic: Expression) => {
    const lower = lowerBound(symbolic)
    return exact.status === 'exact' && lower !== null && lower * exact.value.denominator > exact.value.numerator
  }
  if (clears(first, b)) return 'less'
  if (clears(second, a)) return 'greater'
  if (naturalForm(a) && naturalForm(b) && sameNaturalExpression(a, b)) return 'equal'
  return 'unknown'
}

export function analyze(expression: Expression) {
  const exact = evaluate(expression)
  const integer: Truth = exact.status === 'exact' ? exact.value.denominator === 1n ? 'proven' : 'disproven'
    : exact.reason !== 'domain' && naturalForm(expression) ? 'proven' : 'unknown'
  const lower = exact.status === 'exact' || exact.reason === 'domain' ? null : lowerBound(expression)
  const positive: Truth = exact.status === 'exact' ? exact.value.numerator > 0n ? 'proven' : 'disproven'
    : lower !== null && lower > 0n ? 'proven' : 'unknown'
  const even: Truth = exact.status === 'exact'
    ? exact.value.denominator === 1n && exact.value.numerator % 2n === 0n ? 'proven' : 'disproven' : 'unknown'
  return { exact, integer, positive, even, lower, ...structure(expression),
    ordinalDepth: expression.kind === 'fgh' && isCanonicalOrdinal(expression.index) ? ordinalDepth(expression.index) : null }
}

// null means this inexpensive structural check cannot certify the natural domain.
type NaturalForm = 'positive' | 'nonnegative' | null
function naturalForm(expression: Expression): NaturalForm {
  let remaining = 512
  function visit(expression: Expression, depth: number): NaturalForm {
    if (--remaining < 0 || depth > 64) return null
    const form = (term: Expression) => visit(term, depth + 1)
    switch (expression.kind) {
      case 'integer': return expression.value > 0n ? 'positive' : expression.value === 0n ? 'nonnegative' : null
      case 'divide': case 'subtract': return null
      case 'busy': return expression.states >= 1n ? 'positive' : null
      case 'fgh': return expression.argument >= 0n && isCanonicalOrdinal(expression.index) ? 'positive' : null
      case 'ackermann': return expression.rank >= 0n && expression.argument >= 0n ? 'positive' : null
      case 'arrow': return expression.rank >= 1n && expression.base >= 2n && expression.height >= 1n ? 'positive' : null
      case 'hyper':
        if (expression.rank < 0n || expression.base < 0n || expression.height < 0n) return null
        if (expression.rank === 0n) return 'positive'
        if (expression.rank === 1n) return expression.base + expression.height > 0n ? 'positive' : 'nonnegative'
        if (expression.rank === 2n) return expression.base > 0n && expression.height > 0n ? 'positive' : 'nonnegative'
        return expression.base >= 2n ? 'positive' : null
      case 'chain': case 'tower':
        return expression.terms.length >= 2 && expression.terms.length <= 64 &&
          expression.terms.every(term => form(term) === 'positive') ? 'positive' : null
      case 'factorial': return form(expression.operand) ? 'positive' : null
      case 'power': {
        const base = form(expression.left)
        const exponent = form(expression.right)
        if (base === 'positive' && exponent) return 'positive'
        return base && exponent === 'positive' ? 'nonnegative' : null
      }
      case 'add': case 'multiply': {
        const a = form(expression.left)
        const b = form(expression.right)
        if (!a || !b) return null
        const positive = expression.kind === 'add' ? a === 'positive' || b === 'positive' : a === 'positive' && b === 'positive'
        return positive ? 'positive' : 'nonnegative'
      }
    }
  }
  return visit(expression, 0)
}
