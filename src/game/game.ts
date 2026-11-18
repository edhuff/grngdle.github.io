import { badgeRule, type Badge, type BadgeFamily } from './attributes'
import { rewards } from './economy'
import { generate, type WordSource } from './generator'
import { compareProbability, magnitude, rarities, rarityOf, type Expression, type Fraction, type Rarity } from './math'
import { effectsOf, owns, rankCost, researchById, researchStatus, meets, type Purchases } from './research'

export type Roll = {
  index: number
  expression: Expression
  probability: Fraction
  generatorVersion: number
  source: ReturnType<typeof generate>['source']
  badges: Badge[]
  earned: bigint
  bonus: bigint
}
export type Settings = { animations: boolean; reducedEffects: boolean; showBadgeOdds: boolean }
export type Game = {
  schema: 2; lab: boolean; balance: bigint; lifetime: bigint; rolls: number
  purchases: Purchases; discoveries: Partial<Record<BadgeFamily, number>>
  distribution: Record<Rarity, number>
  recent: Roll[]; rarest: Roll[]; highest: Roll[]; largest: Roll[]
  settings: Settings
}

export function newGame(lab = false): Game {
  return {
    schema: 2, lab, balance: 0n, lifetime: 0n, rolls: 0, purchases: {}, discoveries: {},
    distribution: Object.fromEntries(rarities.map(tier => [tier.name, 0])) as Game['distribution'],
    recent: [], rarest: [], highest: [], largest: [],
    settings: { animations: true, reducedEffects: false, showBadgeOdds: false },
  }
}

export function progress(game: Game) {
  return { purchases: game.purchases, rolls: game.rolls, families: Object.keys(game.discoveries).length }
}

const recordLimit = 12
const compareBig = (a: bigint, b: bigint) => a === b ? 0 : a > b ? -1 : 1
const insert = (existing: Roll[], roll: Roll, compare: (a: Roll, b: Roll) => number) =>
  [...existing, roll].sort((a, b) => compare(a, b) || a.index - b.index).slice(0, recordLimit)

export function manualRoll(game: Game, word?: WordSource): Game {
  const effects = effectsOf(game.purchases)
  const { expression, probability, version, source } = generate(effects.generator, word)
  const reward = rewards(expression, game.purchases, effects)
  const roll: Roll = { index: game.rolls + 1, expression, probability, generatorVersion: version, source, ...reward }
  const discoveries = { ...game.discoveries }
  for (const family of new Set(roll.badges.map(item => badgeRule(item.id).family))) {
    discoveries[family] = (discoveries[family] ?? 0) + 1
  }
  const tier = rarityOf(probability).name
  const value = magnitude(expression)
  return {
    ...game, rolls: roll.index, balance: game.balance + roll.earned, lifetime: game.lifetime + roll.earned, discoveries,
    distribution: { ...game.distribution, [tier]: game.distribution[tier] + 1 },
    recent: [roll, ...game.recent].slice(0, effects.history),
    rarest: insert(game.rarest, roll, (a, b) => compareProbability(a.probability, b.probability)),
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
  if (Object.keys(purchases).some(key => !meets(researchById.get(key)?.requires, nextProgress, game.lab))) return game
  let returned = 0n
  for (let level = 0; level < rank; level++) returned += rankCost(item, level, game.lab)
  return { ...game, purchases, balance: game.balance + returned }
}
