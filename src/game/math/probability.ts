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

export function addProbability(a: Fraction, b: Fraction): Fraction {
  return fraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator)
}

export function multiplyProbability(a: Fraction, b: Fraction): Fraction {
  return fraction(a.numerator * b.numerator, a.denominator * b.denominator)
}

export type EventOdds = { label: string; scope: 'Classical integers' | 'Current pool'; probability: Fraction }

// Thresholds for observed attributes, separate from legacy exact-outcome rankings.
export function eventRarity(probability: Fraction) {
  const thresholds = [1n, 10n, 100n, 1000n, 10_000n, 100_000n, 1_000_000n, 100_000_000n]
  const index = thresholds.findLastIndex(bound => probability.numerator * bound <= probability.denominator)
  return rarities[Math.max(0, index)]
}
