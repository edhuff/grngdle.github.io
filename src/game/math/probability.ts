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
  { name: 'Common', odds: 1n, color: '#a9aec5' },
  { name: 'Uncommon', odds: 10n, color: '#7de0af' },
  { name: 'Rare', odds: 100n, color: '#7bc8ff' },
  { name: 'Epic', odds: 1000n, color: '#bc9aff' },
  { name: 'Legendary', odds: 10_000n, color: '#ffce78' },
  { name: 'Mythic', odds: 100_000n, color: '#ff8ab8' },
  { name: 'Transcendent', odds: 1_000_000n, color: '#65eadb' },
  { name: 'Singularity', odds: 100_000_000n, color: '#ff9b83' },
] as const
export type Rarity = typeof rarities[number]['name']

export function epRarity(probability: Fraction) {
  return rarities.findLast(tier => probability.numerator * tier.odds <= probability.denominator) ?? rarities[0]
}

export function addProbability(a: Fraction, b: Fraction): Fraction {
  return fraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator)
}

export function multiplyProbability(a: Fraction, b: Fraction): Fraction {
  return fraction(a.numerator * b.numerator, a.denominator * b.denominator)
}

export type EventOdds = { label: string; scope: 'Classical integers' | 'Current pool'; probability: Fraction }
