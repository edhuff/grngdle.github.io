import { rewardFor, type BadgeId } from './attributes'
import { badgePayout, evaluateRewards, rollBonus, type RewardEffects } from './economy'
import { packedSignatures, signatureBadges, signatureCount } from './generation/classical-signatures'
import { baseTerminalTickets } from './generation/domains'
import { distribution, seededWords, uniformBelow, type Band } from './generator'
import { addProbability, fraction, type Fraction } from './math'
import { researchProperties } from './research-properties'

export type EPOdds = { method: 'exact' | 'estimated'; probability: Fraction }
type Histogram = Map<bigint, bigint>
const sampleSize = 2048
let signatures: Uint32Array | undefined

function classicalSignatures() {
  if (signatures) return signatures
  const bytes = atob(packedSignatures)
  let cursor = 0
  function read() {
    let value = 0n
    let shift = 0n
    for (;;) {
      const byte = bytes.charCodeAt(cursor++)
      value |= BigInt(byte & 127) << shift
      if (byte < 128) return value
      shift += 7n
    }
  }
  const rows = new Uint32Array(signatureCount * 3)
  let key = 0n
  for (let i = 0; i < rows.length; i += 3) {
    key += read()
    rows[i] = Number(key & 0xffffffffn)
    rows[i + 1] = Number(key >> 32n)
    rows[i + 2] = Number(read())
  }
  signatures = rows
  return rows
}

function increment(histogram: Histogram, earned: bigint, tickets: bigint) {
  histogram.set(earned, (histogram.get(earned) ?? 0n) + tickets)
}

function classicalHistogram(effects: RewardEffects) {
  const signatureBits = new Map<BadgeId, number>(signatureBadges.map((id, index) => [id, index + 4]))
  const payout = signatureBadges.map(id => {
    if (id === 'rhythm' && !effects.families.includes('rhythm')) return 0n
    if (id === 'square' && !effects.families.includes('powers')) return 0n
    if (Object.hasOwn(researchProperties, id) && !effects.properties.has(id as keyof typeof researchProperties)) return 0n
    return badgePayout(id, rewardFor(id), effects)
  })
  const pairs = effects.pairs.flatMap(pair => {
    const [left, right] = pair.badges.map(id => signatureBits.get(id) ?? -1)
    if (left < 0 || right < 0 || payout[left - 4] === 0n || payout[right - 4] === 0n) return []
    const mask = (1n << BigInt(left)) | (1n << BigInt(right))
    return [{ low: Number(mask & 0xffffffffn) | 0, high: Number(mask >> 32n) | 0, amount: pair.amount }]
  })
  const histogram: Histogram = new Map()
  const rows = classicalSignatures()
  const weights = Array.from({ length: 10 }, (_, digit) => baseTerminalTickets + BigInt(effects.generator.terminal?.[digit] ?? 0))
  let previousLow = 0
  let previousHigh = 0
  let earned = 0n
  for (let i = 0; i < rows.length; i += 3) {
    const low = rows[i] & ~15
    const high = rows[i + 1] | 0
    if (low !== previousLow || high !== previousHigh) {
      let subtotal = 0n
      for (let mask = low; mask; mask &= mask - 1) subtotal += payout[31 - Math.clz32(mask & -mask) - 4]
      for (let mask = high; mask; mask &= mask - 1) subtotal += payout[59 - Math.clz32(mask & -mask)]
      let synergy = 0n
      for (const pair of pairs) {
        if ((low & pair.low) === pair.low && (high & pair.high) === pair.high) synergy += pair.amount
      }
      earned = subtotal + rollBonus(subtotal, synergy, 'classical', effects)
      previousLow = low
      previousHigh = high
    }
    increment(histogram, earned, BigInt(rows[i + 2]) * weights[rows[i] & 15])
  }
  return histogram
}

function bandHistogram(band: Band, effects: RewardEffects) {
  const histogram: Histogram = new Map()
  // These generators pay their structure badges only, and alternate root operators.
  const structureOnly = band.id === 'arithmetic' || band.id === 'nested'
  const tickets = structureOnly ? 2n : band.domain.tickets
  const estimated = tickets > BigInt(sampleSize)
  const draws = estimated ? BigInt(sampleSize) : tickets
  const seed = [...band.id].reduce((value, letter) => Math.imul(value, 33) ^ letter.charCodeAt(0), 0x4550)
  const words = seededWords(seed)
  for (let i = 0n; i < draws; i++) {
    const expression = band.domain.at(estimated ? uniformBelow(tickets, words) : i)
    increment(histogram, evaluateRewards(expression, effects, band.id).earned, 1n)
  }
  return { histogram, estimated }
}

function tailTable(histogram: Histogram, estimated: boolean) {
  const scores = [...histogram.keys()].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
  // One extra sample in the upper tail keeps an unseen payout from reading as impossible.
  let total = estimated ? 1n : 0n
  const tails = scores.map(() => 0n)
  for (let i = scores.length - 1; i >= 0; i--) {
    total += histogram.get(scores[i])!
    tails[i] = total
  }
  return { total, scores, tails, estimated }
}

function atLeast(table: ReturnType<typeof tailTable>, earned: bigint) {
  let low = 0
  let high = table.scores.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (table.scores[middle] < earned) low = middle + 1
    else high = middle
  }
  return table.tails[low] ?? (table.estimated ? 1n : 0n)
}

export function otherPayoutTables(effects: RewardEffects) {
  return distribution(effects.generator).bands.slice(1).map(band => {
    const { histogram, estimated } = bandHistogram(band, effects)
    return { weight: band.weight, ...tailTable(histogram, estimated) }
  })
}

export function buildPayoutProfile(effects: RewardEffects, otherTables = otherPayoutTables(effects)) {
  const { bands, total } = distribution(effects.generator)
  const classical = { weight: bands[0].weight, ...tailTable(classicalHistogram(effects), false) }
  const tables = [classical, ...otherTables]
  const method: EPOdds['method'] = tables.some(table => table.estimated) ? 'estimated' : 'exact'
  return { method, tables, total }
}

export type PayoutProfile = ReturnType<typeof buildPayoutProfile>
const profiles = new WeakMap<RewardEffects, (earned: bigint) => EPOdds>()

export function cachePayoutProfile(effects: RewardEffects, profile: PayoutProfile) {
  const odds = new Map<bigint, EPOdds>()
  const { method, tables, total } = profile
  const lookup = (earned: bigint): EPOdds => {
    const cached = odds.get(earned)
    if (cached) return cached
    const probability = tables.reduce((sum, table) => addProbability(sum,
      fraction(atLeast(table, earned) * table.weight, table.total * total)), fraction(0n, 1n))
    const result = { method, probability }
    odds.set(earned, result)
    return result
  }
  profiles.set(effects, lookup)
  return lookup
}

export function hasPayoutProfile(effects: RewardEffects) {
  return profiles.has(effects)
}

/** Chance of a payout at least this large under the current research. */
export function epOdds(earned: bigint, effects: RewardEffects) {
  const profile = profiles.get(effects) ?? cachePayoutProfile(effects, buildPayoutProfile(effects))
  return profile(earned)
}
