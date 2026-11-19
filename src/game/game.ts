import { badgeRule, type Badge, type BadgeFamily } from './attributes'
import { rarityEvent, rewards } from './economy'
import { generate, type GeneratorOptions, type Source, type WordSource } from './generator'
import { compareProbability, eventRarity, magnitude, rarities, rarityOf, type EventOdds, type Expression, type Fraction, type Rarity } from './math'
import { effectsOf, owns, rankCost, researchById, researchStatus, meets, type Purchases } from './research'

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
  schema: 5; lab: boolean; balance: bigint; lifetime: bigint; rolls: number
  purchases: Purchases; retainedResearch: string[]; discoveries: Partial<Record<BadgeFamily, number>>
  distribution: Record<Rarity, number>
  recent: Roll[]; rarest: Roll[]; highest: Roll[]; largest: Roll[]
  settings: Settings
}

export function newGame(lab = false): Game {
  return {
    schema: 5, lab, balance: 0n, lifetime: 0n, rolls: 0, purchases: {}, retainedResearch: [], discoveries: {},
    distribution: Object.fromEntries(rarities.map(tier => [tier.name, 0])) as Game['distribution'],
    recent: [], rarest: [], highest: [], largest: [],
    settings: { animations: true, reducedEffects: false, showBadgeOdds: false },
  }
}

export function progress(game: Game) {
  return { purchases: game.purchases, families: Object.keys(game.discoveries).length }
}

export const recentRollLimit = 90
const recordLimit = 12
const compareBig = (a: bigint, b: bigint) => a === b ? 0 : a > b ? -1 : 1
const insert = (existing: Roll[], roll: Roll, compare: (a: Roll, b: Roll) => number) =>
  [...existing, roll].sort((a, b) => compare(a, b) || a.index - b.index).slice(0, recordLimit)

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

export function manualRoll(game: Game, word?: WordSource): Game {
  const effects = effectsOf(game.purchases)
  const { expression, probability, version, source, configuration, ticket, event } = generate(effects.generator, word)
  const reward = rewards(expression, game.purchases, effects, source)
  const generation = { configuration, ticket, event: rarityEvent(source, reward.badges, event) }
  const roll: Roll = { index: game.rolls + 1, expression, probability, generatorVersion: version, source, generation, ...reward }
  const discoveries = { ...game.discoveries }
  for (const family of new Set(roll.badges.map(item => badgeRule(item.id).family))) {
    discoveries[family] = (discoveries[family] ?? 0) + 1
  }
  const tier = rollRarity(roll).name
  const value = magnitude(expression)
  return {
    ...game, rolls: roll.index, balance: game.balance + roll.earned, lifetime: game.lifetime + roll.earned, discoveries,
    distribution: { ...game.distribution, [tier]: game.distribution[tier] + 1 },
    recent: [roll, ...game.recent].slice(0, recentRollLimit),
    rarest: insert(game.rarest, roll, compareRarity),
    highest: insert(game.highest, roll, (a, b) => compareBig(a.earned, b.earned)),
    largest: value === null ? game.largest : insert(game.largest, roll, (a, b) => compareBig(magnitude(a.expression)!, magnitude(b.expression)!)),
  }
}

export function purchase(game: Game, id: string): Game {
  const item = researchById.get(id)
  if (!item || researchStatus(item, progress(game), game.balance, game.lab) !== 'available') return game
  const rank = owns(game.purchases, id)
  return { ...game, balance: game.balance - rankCost(item, rank, game.lab), purchases: { ...game.purchases, [id]: rank + 1 } }
}

export function refund(game: Game, id: string): Game {
  const item = researchById.get(id)
  const rank = owns(game.purchases, id)
  if (!item?.refundable || !rank) return game
  const purchases = { ...game.purchases }
  delete purchases[id]
  const nextProgress = { ...progress(game), purchases }
  // A finished study stays unlocked if its specialization is later refunded.
  const retainedResearch = Object.keys(purchases).filter(key => !meets(researchById.get(key)?.requires, nextProgress, game.lab))
  let returned = 0n
  for (let level = 0; level < rank; level++) returned += rankCost(item, level, game.lab)
  return { ...game, purchases, retainedResearch, balance: game.balance + returned }
}
