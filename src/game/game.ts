import { badgeRule, type Badge, type BadgeFamily, type BadgeId } from './attributes'
import { rarityEvent, rewards } from './economy'
import { generate, type GeneratorOptions, type Source, type WordSource } from './generator'
import { compareProbability, eventRarity, magnitude, rarities, rarityOf, type EventOdds, type Expression, type Fraction, type Rarity } from './math'
import { effectsOf, owns, purchaseCost, rankCost, researchById, researchStatus, meets, type Purchases } from './research'

export type Roll = {
  index: number
  expression: Expression
  probability: Fraction
  generatorVersion: number
  source: Source
  generation?: { configuration: GeneratorOptions; ticket: bigint; event: EventOdds }
  badges: Badge[]
  earned: bigint
  bonus: bigint
}
export type Settings = { animations: boolean; reducedEffects: boolean; showBadgeOdds: boolean }
export type Game = {
  schema: 6; lab: boolean; balance: bigint; lifetime: bigint; rolls: number
  purchases: Purchases; retainedResearch: string[]; discoveries: Partial<Record<BadgeFamily, number>>
  payments: Record<string, bigint[]>; bookmarks: string[]; legacyRange: boolean
  observations: Partial<Record<BadgeId, { count: number; first: number }>>
  sourceCounts: Partial<Record<Source, number>>
  distribution: Record<Rarity, number>
  recent: Roll[]; rarest: Roll[]; highest: Roll[]; largest: Roll[]
  settings: Settings
}

export function newGame(lab = false): Game {
  return {
    schema: 6, lab, balance: 0n, lifetime: 0n, rolls: 0, purchases: {}, retainedResearch: [], discoveries: {},
    payments: {}, bookmarks: [], legacyRange: false, observations: {}, sourceCounts: {},
    distribution: Object.fromEntries(rarities.map(tier => [tier.name, 0])) as Game['distribution'],
    recent: [], rarest: [], highest: [], largest: [],
    settings: { animations: true, reducedEffects: false, showBadgeOdds: false },
  }
}

export function progress(game: Game) {
  return { purchases: game.purchases, families: Object.keys(game.discoveries).length, lifetime: game.lifetime, badges: Object.fromEntries(Object.entries(game.observations).map(([id, hit]) => [id, hit.count])) }
}

const compareBig = (a: bigint, b: bigint) => a === b ? 0 : a > b ? -1 : 1
function insert(existing: Roll[], roll: Roll, compare: (a: Roll, b: Roll) => number, limit: number) {
  if (existing.length >= limit && compare(roll, existing[limit - 1]) >= 0) return existing
  const index = existing.findIndex(other => compare(roll, other) < 0)
  if (index < 0) return [...existing, roll].slice(0, limit)
  return [...existing.slice(0, index), roll, ...existing.slice(index, limit - 1)]
}

const magnitudes = new WeakMap<Roll, bigint>()
function recordMagnitude(roll: Roll) {
  const cached = magnitudes.get(roll)
  if (cached !== undefined) return cached
  const value = magnitude(roll.expression)
  if (value !== null) magnitudes.set(roll, value)
  return value
}

export function rollRarity(roll: Roll) {
  return roll.generation ? eventRarity(roll.generation.event.probability) : rarityOf(roll.probability)
}

function compareRarity(a: Roll, b: Roll) {
  const tier = rarities.indexOf(rollRarity(b)) - rarities.indexOf(rollRarity(a))
  if (tier) return tier
  const scope = (roll: Roll) => !roll.generation ? 2 : roll.generation.event.scope === 'Current pool' ? 0 : 1
  return scope(a) - scope(b) || compareProbability(
    a.generation?.event.probability ?? a.probability, b.generation?.event.probability ?? b.probability,
  )
}

const rankings: Record<'rarest' | 'highest' | 'largest', (a: Roll, b: Roll) => number> = {
  rarest: compareRarity,
  highest: (a, b) => compareBig(a.earned, b.earned),
  largest: (a, b) => compareBig(recordMagnitude(a)!, recordMagnitude(b)!),
}

export function sortRecords(rows: Roll[], category: keyof typeof rankings) {
  return rows.sort((a, b) => rankings[category](a, b) || a.index - b.index)
}

export function manualRoll(game: Game, word?: WordSource): Game {
  const effects = effectsOf(game.purchases, game.legacyRange)
  const { expression, probability, version, source, configuration, ticket, event } = generate(effects.generator, word)
  const reward = rewards(expression, game.purchases, effects, source)
  const generation = { configuration, ticket, event: rarityEvent(source, reward.badges, event, configuration.terminal) }
  const roll: Roll = { index: game.rolls + 1, expression, probability, generatorVersion: version, source, generation, ...reward }
  const discoveries = { ...game.discoveries }
  for (const family of new Set(roll.badges.map(item => badgeRule(item.id).family))) {
    discoveries[family] = (discoveries[family] ?? 0) + 1
  }
  const observations = { ...game.observations }
  for (const { id } of roll.badges) {
    const previous = observations[id]
    observations[id] = { count: (previous?.count ?? 0) + 1, first: previous?.first ?? roll.index }
  }
  const sourceCounts = { ...game.sourceCounts, [source]: (game.sourceCounts[source] ?? 0) + 1 }
  const { capacities } = effects
  const tier = rollRarity(roll).name
  const value = recordMagnitude(roll)
  return {
    ...game, rolls: roll.index, balance: game.balance + roll.earned, lifetime: game.lifetime + roll.earned, discoveries, observations, sourceCounts,
    distribution: { ...game.distribution, [tier]: game.distribution[tier] + 1 },
    recent: [roll, ...game.recent].slice(0, capacities.recent),
    rarest: insert(game.rarest, roll, rankings.rarest, capacities.rarest),
    highest: insert(game.highest, roll, rankings.highest, capacities.highest),
    largest: value === null ? game.largest : insert(game.largest, roll, rankings.largest, capacities.largest),
  }
}

export function purchase(game: Game, id: string): Game {
  const item = researchById.get(id)
  if (!item || researchStatus(item, progress(game), game.balance, game.lab) !== 'available') return game
  const rank = owns(game.purchases, id)
  const price = purchaseCost(item, game.purchases, game.lab)
  const history = game.payments[id] ?? Array.from({ length: rank }, (_, level) => rankCost(item, level, game.lab))
  const purchases = { ...game.purchases, [id]: rank + 1 }
  const retainedResearch = game.retainedResearch.length
    ? game.retainedResearch.filter(key => !meets(researchById.get(key)?.requires, { ...progress(game), purchases }, game.lab))
    : game.retainedResearch
  return { ...game, balance: game.balance - price, purchases, retainedResearch,
    payments: { ...game.payments, [id]: [...history, price] } }
}

export function refund(game: Game, id: string): Game {
  const item = researchById.get(id)
  const rank = owns(game.purchases, id)
  if (!item?.refundable || !item.doctrine || !rank) return game
  const purchases = { ...game.purchases }
  const payments = { ...game.payments }
  const removesPath = item.effects.some(effect => effect.kind === 'specialize')
  let returned = 0n
  // A doctrine refund also removes investments that depend on it.
  const removed = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const key of Object.keys(purchases)) {
      const candidate = researchById.get(key)!
      if (candidate.doctrine !== item.doctrine || removed.has(key)) continue
      const kept = Object.fromEntries(Object.entries(purchases).filter(([owned]) => !removed.has(owned)))
      if (removesPath || !meets(candidate.requires, { ...progress(game), purchases: kept }, game.lab)) {
        removed.add(key)
        changed = true
      }
    }
  }
  for (const key of removed) {
    const candidate = researchById.get(key)!
    const paid = payments[key] ?? Array.from({ length: owns(purchases, key) }, (_, level) => rankCost(candidate, level, game.lab))
    returned += paid.reduce((sum, price) => sum + price, 0n)
    delete purchases[key]
    delete payments[key]
  }
  const nextProgress = { ...progress(game), purchases }
  const retainedResearch = Object.keys(purchases).filter(key => !meets(researchById.get(key)?.requires, nextProgress, game.lab))
  return { ...game, purchases, payments, retainedResearch, balance: game.balance + returned }
}

export function toggleBookmark(game: Game, id: string): Game {
  if (!researchById.has(id)) return game
  return { ...game, bookmarks: game.bookmarks.includes(id) ? game.bookmarks.filter(key => key !== id) : [...game.bookmarks, id] }
}
