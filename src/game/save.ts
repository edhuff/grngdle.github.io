import { badgeIds, badgeRule, type Badge, type BadgeFamily, type BadgeId } from './attributes'
import { newGame, progress, type Game, type Roll } from './game'
import { CLASSICAL_MAX, EXPANDED_MAX, GENERATOR_VERSION, VAST_MAX } from './generator'
import { depth, fraction, magnitude, rarities, type Expression } from './math'
import { effectsOf, meets, rankCost, researchById } from './research'

const maxSize = 1_000_000
const storageKey = (lab: boolean) => 'grngdle.save.' + (lab ? 'lab' : 'production')
const families = new Set(badgeIds.map(id => badgeRule(id).family))

function invalid(message = 'Malformed save data.'): never { throw new Error(message) }
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return invalid()
  return value as Record<string, unknown>
}
function count(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) return invalid()
  return value
}
function decimal(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,255})$/.test(value)) return invalid()
  return BigInt(value)
}
function bool(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalid()
}

function expressionOf(value: unknown, remaining = 2): Expression {
  const item = object(value)
  if (item.kind === 'integer') return { kind: 'integer', value: decimal(item.value) }
  if (remaining <= 0 || (item.kind !== 'add' && item.kind !== 'multiply')) return invalid()
  return { kind: item.kind, left: expressionOf(item.left, remaining - 1), right: expressionOf(item.right, remaining - 1) }
}

function rollOf(value: unknown, rolls: number, lifetime: bigint): Roll {
  const item = object(value)
  const source = item.source
  const expression = expressionOf(item.expression)
  switch (source) {
    case 'classical':
    case 'expanded':
    case 'vast': {
      if (expression.kind !== 'integer') return invalid()
      const [low, high] = source === 'classical' ? [0n, CLASSICAL_MAX]
        : source === 'expanded' ? [CLASSICAL_MAX + 1n, EXPANDED_MAX] : [EXPANDED_MAX + 1n, VAST_MAX]
      if (expression.value < low || expression.value > high) return invalid()
      break
    }
    case 'arithmetic':
    case 'nested': {
      const operand = (term: Expression) => term.kind === 'integer' && term.value >= 2n && term.value <= 999n
      if (expression.kind === 'integer' || !operand(expression.right)) return invalid()
      const left = expression.left
      if (source === 'arithmetic' ? !operand(left) : left.kind === 'integer' || !operand(left.left) || !operand(left.right)) return invalid()
      break
    }
    default: return invalid()
  }
  const rawProbability = object(item.probability)
  const probability = fraction(decimal(rawProbability.numerator), decimal(rawProbability.denominator))
  if (probability.numerator === 0n || probability.numerator > probability.denominator) return invalid()
  if (!Array.isArray(item.badges) || item.badges.length === 0 || item.badges.length > badgeIds.length) return invalid()
  const badges: Badge[] = item.badges.map(entry => {
    const raw = object(entry)
    if (!badgeIds.includes(raw.id as BadgeId)) return invalid()
    const reward = decimal(raw.reward)
    if (reward === 0n) return invalid()
    const id = raw.id as BadgeId
    const level = id === 'nested' ? count(raw.level, 2, depth(expression)) : undefined
    return { id, reward, ...(level ? { level } : {}) }
  })
  if (new Set(badges.map(badge => badge.id)).size !== badges.length) return invalid()
  const earned = decimal(item.earned)
  const bonus = decimal(item.bonus)
  if (earned > lifetime || earned !== bonus + badges.reduce((sum, badge) => sum + badge.reward, 0n)) return invalid()
  return { index: count(item.index, 1, rolls), expression, probability, source, badges, earned, bonus, generatorVersion: count(item.generatorVersion, 1, GENERATOR_VERSION) }
}

const encode = (_: string, value: unknown) => typeof value === 'bigint' ? value.toString() : value

export function exportSave(game: Game) {
  return JSON.stringify(game, encode)
}

function migrate(raw: Record<string, unknown>) {
  if (raw.schema === 1) return { ...raw, settings: { ...object(raw.settings), showBadgeOdds: false } }
  if (raw.schema !== 2 && raw.schema !== 3) return invalid('This save version is unsupported.')
  return raw
}

export function importSave(text: string, lab = false): Game {
  if (text.length > maxSize) return invalid('The save file exceeds 1 MB.')
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { return invalid('The file is not valid JSON.') }
  const raw = migrate(object(parsed))
  if (raw.lab !== lab) return invalid('This save belongs to a different game mode.')
  const rolls = count(raw.rolls)
  const lifetime = decimal(raw.lifetime)
  const savedBalance = decimal(raw.balance)
  const legacyPricing = raw.schema === 1 || raw.schema === 2
  if (rolls === 0 ? lifetime !== 0n : lifetime < BigInt(rolls)) return invalid()
  const purchases: Game['purchases'] = {}
  let savedSpent = 0n
  let currentSpent = 0n
  let specializations = 0
  for (const [id, value] of Object.entries(object(raw.purchases))) {
    const item = researchById.get(id)
    if (!item) return invalid()
    const rank = count(value, 1, item.max ?? 1)
    purchases[id] = rank
    for (let level = 0; level < rank; level++) {
      savedSpent += rankCost(item, level, lab, legacyPricing ? item.legacyCost : item.cost)
      currentSpent += rankCost(item, level, lab)
    }
    if (item.refundable) specializations++
  }
  if (specializations > 1 || savedBalance + savedSpent !== lifetime) return invalid('Research spending does not match lifetime EP.')
  const discoveries: Game['discoveries'] = {}
  for (const [key, value] of Object.entries(object(raw.discoveries))) {
    if (!families.has(key as BadgeFamily)) return invalid()
    discoveries[key as BadgeFamily] = count(value, 1, rolls)
  }
  if (rolls && discoveries.parity === undefined) return invalid()
  const distribution = newGame(lab).distribution
  const rawDistribution = object(raw.distribution)
  for (const tier of rarities) distribution[tier.name] = count(rawDistribution[tier.name], 0, rolls)
  if (Object.values(distribution).reduce((sum, entry) => sum + entry, 0) !== rolls) return invalid()
  const seen = new Map<number, string>()
  const readRolls = (key: string, cap: number) => {
    const list = raw[key]
    if (!Array.isArray(list) || list.length > cap || (rolls > 0 && list.length === 0)) return invalid()
    const decoded = list.map(item => rollOf(item, rolls, lifetime))
    if (new Set(decoded.map(item => item.index)).size !== decoded.length) return invalid()
    for (const roll of decoded) {
      const serialized = JSON.stringify(roll, encode)
      if (seen.has(roll.index) && seen.get(roll.index) !== serialized) return invalid()
      seen.set(roll.index, serialized)
    }
    return decoded
  }
  const recent = readRolls('recent', effectsOf(purchases).history)
  if (recent.some((roll, index) => roll.index !== rolls - index)) return invalid()
  const rarest = readRolls('rarest', 12)
  const highest = readRolls('highest', 12)
  const largest = readRolls('largest', 12)
  if (largest.some(roll => magnitude(roll.expression) === null)) return invalid()
  const settings = object(raw.settings)
  const game: Game = {
    schema: 3, lab, rolls, lifetime, balance: lifetime - currentSpent, purchases, discoveries, distribution, recent, rarest, highest, largest,
    settings: { animations: bool(settings.animations), reducedEffects: bool(settings.reducedEffects), showBadgeOdds: bool(settings.showBadgeOdds) },
  }
  if (Object.keys(purchases).some(id => !meets(researchById.get(id)?.requires, progress(game), lab))) {
    return invalid('Research prerequisites are missing.')
  }
  return game
}

export function loadLocal(lab: boolean): { game: Game; warning?: string } {
  try {
    const saved = localStorage.getItem(storageKey(lab))
    return { game: saved ? importSave(saved, lab) : newGame(lab) }
  } catch {
    return { game: newGame(lab), warning: 'Your local save could not be loaded.' }
  }
}

export function saveLocal(game: Game) {
  try {
    localStorage.setItem(storageKey(game.lab), exportSave(game))
    return true
  } catch {
    return false
  }
}
