import { depth, integer, type Expression } from './ast'
import { finiteOrdinal, fundamentalSequence, isCanonicalOrdinal, predecessor, type Ordinal } from './ordinal'

export type Rational = { numerator: bigint; denominator: bigint }
export type Evaluation = { status: 'exact'; value: Rational } | { status: 'unknown'; reason: 'budget' | 'domain' | 'unestablished' }
export const exactBitLimit = 1024
const cap = (1n << BigInt(exactBitLimit)) - 1n
const abs = (n: bigint) => n < 0n ? -n : n

function rational(numerator: bigint, denominator = 1n): Rational {
  let a = abs(numerator)
  let b = abs(denominator)
  while (b) [a, b] = [b, a % b]
  const sign = denominator < 0n ? -1n : 1n
  return { numerator: sign * numerator / a, denominator: abs(denominator) / a }
}

class Stop extends Error {
  constructor(readonly reason: 'budget' | 'domain' | 'unestablished') { super(reason) }
}

export function evaluate(expression: Expression, operations = 1500): Evaluation {
  let remaining = Math.min(operations, 10_000)
  function step(level: number) {
    if (--remaining < 0 || level > 64) throw new Stop('budget')
  }
  function checked(n: bigint) {
    if (abs(n) > cap) throw new Stop('budget')
    return n
  }
  function power(base: bigint, exponent: bigint) {
    if (exponent < 0n) throw new Stop('domain')
    let result = 1n
    for (let n = exponent; n; n >>= 1n) {
      step(0)
      if (n & 1n) result = checked(result * base)
      if (n > 1n) base = checked(base * base)
    }
    return result
  }
  function hyper(base: bigint, rank: bigint, height: bigint, level: number): bigint {
    step(level)
    if (base < 0n || height < 0n || rank < 0n) throw new Stop('domain')
    if (rank === 0n) return checked(height + 1n)
    if (rank === 1n) return checked(base + height)
    if (rank === 2n) return checked(base * height)
    if (base < 2n) throw new Stop('domain')
    if (rank === 3n) return power(base, height)
    if (height === 0n) return 1n
    if (height === 1n) return base
    if (base === 2n && height === 2n) return 4n
    if (rank > 64n) throw new Stop('budget')
    let result = 1n
    for (let index = 0n; index < height; index++) {
      result = hyper(base, rank - 1n, result, level + 1)
    }
    return result
  }
  function chain(terms: readonly bigint[], level: number): bigint {
    step(level)
    const stop = terms.indexOf(1n)
    if (stop >= 0) return stop ? chain(terms.slice(0, stop), level + 1) : 1n
    if (terms.length === 1) return terms[0]
    if (terms.length === 2) return power(terms[0], terms[1])
    const prefix = terms.slice(0, -2)
    const [p, q] = terms.slice(-2)
    const inner = chain([...prefix, p - 1n, q], level + 1)
    return chain([...prefix, inner, q - 1n], level + 1)
  }
  function fast(index: Ordinal, n: bigint, level: number): bigint {
    step(level)
    if (n === 0n) return 1n
    if (!index.length) return checked(n + 1n)
    const previous = predecessor(index)
    if (previous === null) return fast(fundamentalSequence(index, n), n, level + 1)
    if (!previous.length) return checked(2n * n + 1n)
    let result = n
    for (let count = 0n; count <= n; count++) result = fast(previous, result, level + 1)
    return result
  }
  function ackermann(rank: bigint, n: bigint, level: number): bigint {
    step(level)
    if (rank === 0n) return checked(n + 1n)
    if (rank === 1n) return checked(n + 2n)
    if (rank === 2n) return checked(2n * n + 3n)
    if (rank === 3n) return checked(power(2n, n + 3n) - 3n)
    if (rank > 64n) throw new Stop('budget')
    if (n === 0n) return ackermann(rank - 1n, 1n, level + 1)
    return ackermann(rank - 1n, ackermann(rank, n - 1n, level + 1), level + 1)
  }
  function natural(value: Rational, minimum = 0n) {
    if (value.denominator !== 1n || value.numerator < minimum) throw new Stop('domain')
    return value.numerator
  }
  function visit(term: Expression, level = 0): Rational {
    step(level)
    const inner = (child: Expression) => visit(child, level + 1)
    switch (term.kind) {
      case 'integer': return rational(checked(term.value))
      case 'factorial': {
        const n = natural(inner(term.operand))
        let result = 1n
        for (let i = 2n; i <= n; i++) {
          step(level)
          result = checked(result * i)
        }
        return rational(result)
      }
      case 'tower': {
        if (term.terms.length < 2 || term.terms.length > 64) throw new Stop('domain')
        const terms = term.terms.map(child => natural(inner(child), 1n))
        return rational(terms.reduceRight((result, base) => power(base, result)))
      }
      case 'chain': {
        if (term.terms.length < 2 || term.terms.length > 64) throw new Stop('domain')
        const terms: bigint[] = []
        for (const child of term.terms) {
          const value = natural(inner(child), 1n)
          terms.push(value)
          if (value === 1n) break
        }
        return rational(chain(terms, level + 1))
      }
      case 'hyper': case 'arrow':
        if (term.kind === 'arrow' && (term.rank < 1n || term.height < 1n)) throw new Stop('domain')
        return rational(hyper(checked(term.base), checked(term.kind === 'arrow' ? term.rank + 2n : term.rank), checked(term.height), level + 1))
      case 'fgh':
        if (term.argument < 0n || !isCanonicalOrdinal(term.index)) throw new Stop('domain')
        return rational(fast(term.index, term.argument, level + 1))
      case 'ackermann':
        if (term.rank < 0n || term.argument < 0n) throw new Stop('domain')
        return rational(ackermann(term.rank, term.argument, level + 1))
      case 'busy': {
        if (term.states < 1n) throw new Stop('domain')
        if (term.states > 4n) throw new Stop('unestablished')
        const table = term.variant === 'steps' ? [1n, 6n, 21n, 107n] : [1n, 4n, 6n, 13n]
        return rational(table[Number(term.states - 1n)])
      }
      default: {
        const a = inner(term.left)
        const b = inner(term.right)
        if (term.kind === 'power') {
          const n = natural(b)
          if (a.numerator === 0n && n === 0n) throw new Stop('domain')
          return rational(power(a.numerator, n), power(a.denominator, n))
        }
        if (term.kind === 'divide' && b.numerator === 0n) throw new Stop('domain')
        const [numerator, denominator] = term.kind === 'add' || term.kind === 'subtract'
          ? [a.numerator * b.denominator + (term.kind === 'add' ? 1n : -1n) * b.numerator * a.denominator, a.denominator * b.denominator]
          : term.kind === 'multiply' ? [a.numerator * b.numerator, a.denominator * b.denominator]
            : [a.numerator * b.denominator, a.denominator * b.numerator]
        const value = rational(numerator, denominator)
        return rational(checked(value.numerator), checked(value.denominator))
      }
    }
  }
  try { return { status: 'exact', value: visit(expression) } }
  catch (error) {
    if (!(error instanceof Stop)) throw error
    return { status: 'unknown', reason: error.reason }
  }
}

export function magnitude(expression: Expression, depthBudget?: number): bigint | null {
  if (depthBudget !== undefined && depth(expression) > depthBudget) return null
  const result = evaluate(expression)
  return result.status === 'exact' && result.value.denominator === 1n ? result.value.numerator : null
}

// These rules preserve the domain and do not assume symbolic operands are nonzero.
export function simplify(expression: Expression): Expression {
  const exact = evaluate(expression)
  if (exact.status === 'exact') {
    const { numerator, denominator } = exact.value
    return denominator === 1n ? integer(numerator) : { kind: 'divide', left: integer(numerator), right: integer(denominator) }
  }
  if ((expression.kind === 'add' || expression.kind === 'subtract') && expression.right.kind === 'integer' && expression.right.value === 0n) return expression.left
  if ((expression.kind === 'multiply' || expression.kind === 'divide' || expression.kind === 'power') &&
      expression.right.kind === 'integer' && expression.right.value === 1n) return expression.left
  return expression
}

export function finiteFastGrowing(index: bigint, argument: bigint): Expression {
  return { kind: 'fgh', index: finiteOrdinal(index), argument }
}
