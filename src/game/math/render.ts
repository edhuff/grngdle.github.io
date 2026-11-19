import type { BinaryKind, Expression } from './ast'
import type { Ordinal } from './ordinal'
import type { Fraction } from './probability'

export const integerText = (value: bigint) => value.toLocaleString('en-US')
const symbols: Record<BinaryKind, string> = { add: '+', subtract: '−', multiply: '×', divide: '÷', power: '^' }
const literalLimit = 1n << 1024n
const outputLimit = 4096

function literal(n: bigint, grouped = false): string {
  if (n <= -literalLimit || n >= literalLimit) return '…'
  return grouped ? integerText(n) : String(n)
}

function formatter() {
  let remaining = 384
  function ordinal(value: Ordinal, level = 0): string {
    if (level > 32 || (remaining -= value.length) < 0) return '…'
    return value.map(({ exponent, coefficient }) => {
      if (!exponent.length) return literal(coefficient)
      const first = exponent[0]
      const one = exponent.length === 1 && first.exponent.length === 0 && first.coefficient === 1n
      const omega = one ? 'ω' : 'ω^(' + ordinal(exponent, level + 1) + ')'
      return coefficient === 1n ? omega : omega + '·' + literal(coefficient)
    }).join(' + ') || '0'
  }

  function visit(expression: Expression, level = 0): string {
    if (level > 32 || --remaining < 0) return '…'
    const grouped = (term: Expression) => term.kind === 'integer' && term.value >= 0n
      ? visit(term, level + 1) : '(' + visit(term, level + 1) + ')'
    switch (expression.kind) {
      case 'integer': return literal(expression.value, true)
      case 'add': case 'subtract': case 'multiply': case 'divide': case 'power':
        return grouped(expression.left) + ' ' + symbols[expression.kind] + ' ' + grouped(expression.right)
      case 'factorial': return grouped(expression.operand) + '!'
      case 'tower': case 'chain': {
        const operator = expression.kind === 'tower' ? ' ^ ' : ' → '
        return expression.terms.slice(0, 64).map(grouped).join(operator) + (expression.terms.length > 64 ? operator + '…' : '')
      }
      case 'hyper':
        if (expression.rank <= 6n && expression.rank >= 4n) return literal(expression.base) + ' ' + '↑'.repeat(Number(expression.rank - 2n)) + ' ' + literal(expression.height)
        return 'H_' + literal(expression.rank) + '(' + literal(expression.base) + ', ' + literal(expression.height) + ')'
      case 'arrow': return literal(expression.base) + ' ↑^{' + literal(expression.rank) + '} ' + literal(expression.height)
      case 'fgh': return 'F_{' + ordinal(expression.index) + '}(' + literal(expression.argument) + ')'
      case 'busy': return (expression.variant === 'steps' ? 'S' : 'Σ') + '(' + literal(expression.states) + ')'
      case 'ackermann': return 'A(' + literal(expression.rank) + ', ' + literal(expression.argument) + ')'
    }
  }
  return { ordinal, visit }
}

const trim = (s: string) => s.length > outputLimit ? s.slice(0, outputLimit - 1) + '…' : s
export const ordinalText = (value: Ordinal): string => trim(formatter().ordinal(value))
export const notation = (expression: Expression): string => trim(formatter().visit(expression))

export function oddsText({ numerator, denominator }: Fraction) {
  if (numerator === 0n) return '0'
  if (denominator % numerator === 0n) return '1 in ' + integerText(denominator / numerator)
  return integerText(numerator) + ' in ' + integerText(denominator)
}

export function compactOddsText(odds: Fraction) {
  const text = oddsText(odds)
  if (text.length <= 42) return text
  // State the scale of a long denominator while exposing the full ratio in the inspector.
  const digits = odds.denominator.toString().length
  const numerator = odds.numerator.toString()
  return (numerator.length <= 12 ? integerText(odds.numerator) : '[' + numerator.length + '-digit numerator]') +
    ' in [' + digits + '-digit denominator]'
}
