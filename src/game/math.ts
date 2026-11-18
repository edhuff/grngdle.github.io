export type Fraction = { numerator: bigint; denominator: bigint }

export function fraction(numerator: bigint, denominator: bigint): Fraction {
  if (numerator < 0n || denominator <= 0n) throw new RangeError('Invalid probability')
  let a = numerator
  let b = denominator
  while (b !== 0n) [a, b] = [b, a % b]
  return { numerator: numerator / a, denominator: denominator / a }
}

export function compareProbability(a: Fraction, b: Fraction): number {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator
  return difference === 0n ? 0 : difference > 0n ? 1 : -1
}

export const rarities = [
  { name: 'Common', odds: 0n, color: '#a9aec5' },
  { name: 'Uncommon', odds: 2_000_000n, color: '#7de0af' },
  { name: 'Rare', odds: 10_000_000n, color: '#7bc8ff' },
  { name: 'Epic', odds: 100_000_000n, color: '#bc9aff' },
  { name: 'Legendary', odds: 1_000_000_000n, color: '#ffce78' },
  { name: 'Mythic', odds: 100_000_000_000n, color: '#ff8ab8' },
  { name: 'Transcendent', odds: 10n ** 16n, color: '#65eadb' },
  { name: 'Singularity', odds: 10n ** 23n, color: '#ff9b83' },
] as const
export type Rarity = typeof rarities[number]['name']

export function rarityOf(probability: Fraction) {
  return rarities.findLast(tier => probability.numerator * tier.odds <= probability.denominator) ?? rarities[0]
}

export const integerText = (value: bigint) => value.toLocaleString('en-US')

export function oddsText({ numerator, denominator }: Fraction) {
  if (numerator === 0n) return '0'
  if (denominator % numerator === 0n) return '1 in ' + integerText(denominator / numerator)
  return integerText(numerator) + ' in ' + integerText(denominator)
}

export type Expression =
  | { kind: 'integer'; value: bigint }
  | { kind: 'add' | 'multiply'; left: Expression; right: Expression }

export const integer = (value: bigint): Expression => ({ kind: 'integer', value })

export function notation(expression: Expression): string {
  if (expression.kind === 'integer') return integerText(expression.value)
  const left = expression.left.kind === 'integer' ? notation(expression.left) : '(' + notation(expression.left) + ')'
  const right = expression.right.kind === 'integer' ? notation(expression.right) : '(' + notation(expression.right) + ')'
  return left + (expression.kind === 'add' ? ' + ' : ' × ') + right
}

export function magnitude(expression: Expression, budget = 15): bigint | null {
  if (budget < 0) return null
  if (expression.kind === 'integer') return expression.value
  const left = magnitude(expression.left, budget - 1)
  const right = magnitude(expression.right, budget - 1)
  if (left === null || right === null) return null
  const value = expression.kind === 'add' ? left + right : left * right
  return value.toString().length <= 256 ? value : null
}

export function depth(expression: Expression): number {
  if (expression.kind === 'integer') return 0
  return 1 + Math.max(depth(expression.left), depth(expression.right))
}
