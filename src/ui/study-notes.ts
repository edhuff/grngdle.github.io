import { badgeRule, type BadgeFamily } from '../game/attributes'
import { baseTerminalTickets, terminalTicketPool } from '../game/generation/domains'
import type { AdvancedFamily } from '../game/generation/config'
import { CLASSICAL_MAX, sourceNames } from '../game/generator'
import { effectsOf, owns, type Purchases, type ResearchNode } from '../game/research'
import type { Feature } from '../game/research/model'

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 2, minimumFractionDigits: 2 })
const alternatives = new Intl.ListFormat('en', { type: 'disjunction' })

const familyExamples: Record<BadgeFamily, string> = {
  parity: 'Every whole number has either the Even or Odd badge, so this pays on every starting-range roll.',
  divisibility: 'A number can match multiple badges, such as Triple for multiples of 3 and Quinary for multiples of 5. Each paying match gets the bonus.',
  digits: 'An example is Double Take, which you get when two equal digits sit next to each other, as in 1224.',
  prime: 'A prime number, such as 13, can be divided evenly only by 1 and itself.',
  sequence: 'An example is Stepping Stones, which you get for digits that go up or down by 1 three in a row, as in 123 or 765.',
  mirror: 'A palindrome reads the same forwards and backwards, as in 1221.',
  rhythm: 'Digit Rhythm looks for a block of digits that repeats across the whole number, as in 1212.',
  powers: 'An example is Perfect Square because 49 is 7 × 7.',
  structure: 'These badges describe how a mathematical expression is built, such as whether it uses multiplication or a power.',
  landmarks: 'These badges recognize notable numbers, such as 314159 for the first six digits of π.',
}

const generatorExamples: Record<AdvancedFamily, string> = {
  digits: 'The result is one whole number with many digits. Its first digit is always 1 through 9.',
  subtraction: 'A subtraction can produce a negative result, as in 3 − 5 = −2.',
  division: 'A division can produce a fraction, as in 3 ÷ 2 = 1½. The second number is always nonzero.',
  factorials: 'The exclamation mark means multiply the whole numbers from 1 up to the given number. For example, 4! = 1 × 2 × 3 × 4.',
  powers: 'A power repeats multiplication. For example, 2³ = 2 × 2 × 2. When exponents are stacked, the top power comes first.',
  towers: 'Read powers from the top of the stack first. A tower of 2, 3, and 2 means 2 raised to (3²), so the result is 512.',
  tetration: 'Tetration stacks copies of the same number as powers. For example, a stack of three 2s means 2 raised to (2²), giving 16.',
  hyperoperations: 'This extends the sequence of repeated operations beyond powers and tetration. Pentation repeats the tetration step.',
  arrows: 'One up-arrow means a power. Two up-arrows stack powers. More arrows describe higher levels of repeated operations.',
  chains: 'A chain of two entries is a power, so 2 → 3 means 2³. Longer chains follow Conway’s rule for reducing the entries.',
  hierarchy: 'The index picks a growth rule and the argument is the number you feed into it. Ordinals extend the idea of position beyond the finite whole numbers.',
  busy: 'Busy Beaver results ask how many steps or written ones a halting machine can achieve with a given number of states.',
  ackermann: 'The first input chooses how rapidly the function grows. Even small increases to that input can produce enormous results.',
}

const featureNotes: Partial<Record<Feature, string>> = {
  'pool-breakdown': 'In Collection, open a roll and expand Historical generator weights. It shows how likely each kind of result was when you made that roll.',
  'reference-odds': 'In Collection, open a roll to see how often its badges would appear if every number from 0 to 1,000,000 were equally likely.',
  factorization: 'Prime factors are prime numbers that multiply to make a number. For example, 12 = 2 × 2 × 3.',
  'divisor-count': 'A divisor divides a number evenly. For example, 12 has six positive divisors because 1, 2, 3, 4, 6, and 12 all divide it.',
  'divisor-sum': 'The proper divisors of a number are its smaller positive divisors. For example, 6 has a proper-divisor sum of 1 + 2 + 3 = 6.',
  'sequence-indices': 'An index tells you where a number appears in a sequence. The first positions are numbered from zero.',
  'decimal-bounds': 'This shows the powers of ten that bracket the size of a number. For example, 625 is between 10² and 10³.',
  'expression-tree': 'The tree breaks up a calculation so you can see what goes together. For example, (2 + 3) × 4 has the sum grouped on one side of the multiplication.',
}

function endingChance(extras: readonly number[], digits: ReadonlySet<number>) {
  const pool = terminalTicketPool(CLASSICAL_MAX, extras)
  const matching = pool.endings.reduce((sum, item) => digits.has(Number(item.digit)) ? sum + (baseTerminalTickets + item.extra) * item.count : sum, 0n)
  return percent.format(Number(matching) / Number(pool.tickets))
}

export function studyNotes(study: ResearchNode, purchases: Purchases) {
  const notes = new Set<string>()
  const luck = study.effects.filter(effect => effect.kind === 'luck')
  if (luck.length) {
    const current = effectsOf(purchases).generator.terminal ?? []
    const next = Array.from({ length: 10 }, (_, digit) => current[digit] ?? 0)
    for (const effect of luck) next[effect.digit] += effect.amount
    const digits = new Set(luck.map(effect => effect.digit))
    const label = alternatives.format([...digits].sort((a, b) => a - b).map(String))
    const chance = endingChance(current, digits)
    notes.add(`Think of a ticket as a copy of a number in the draw. Every whole number from 0 to 1,000,000 starts with ${baseTerminalTickets} tickets, so adding copies makes that number more likely to appear.`)
    const outcome = owns(purchases, study.id) < (study.max ?? 1)
      ? `The chance of a roll in that range ending in ${label} goes from ${chance} to ${endingChance(next, digits)} with the next purchase.`
      : `With your current research, ${chance} of rolls in that range end in ${label}.`
    notes.add(outcome + ' Tickets change how often you see different badges. You earn EP from the badges on the result you roll.')
  }

  for (const effect of study.effects) {
    switch (effect.kind) {
      case 'familyEP': notes.add(familyExamples[effect.family]); break
      case 'family': notes.add(familyExamples[effect.family]); break
      case 'badgeEP':
      case 'property': {
        const badge = badgeRule(effect.id)
        notes.add(`${badge.name} · ${badge.description}.`)
        if (effect.kind === 'property') notes.add('A matching result earns EP from its new badge.')
        break
      }
      case 'ep': notes.add('This percentage applies to the total EP earned from badges on a roll. Percentage bonuses add together and bonus EP is rounded down to a whole point.'); break
      case 'pair': notes.add('Both badges must earn EP on the same roll. The study then adds the pair bonus on top of the badge rewards.'); break
      case 'sourceEP': notes.add(`This bonus pays on top of badge EP when the roll comes from the ${sourceNames[effect.source].toLowerCase()} pool.`); break
      case 'anomaly': notes.add('Once a larger integer range is unlocked, it takes a bigger share of rolls from the starting range. The EP you earn depends on what you roll.'); break
      case 'range': notes.add('This raises the largest number the expanded range can produce. The starting range still appears on its own rolls.'); break
      case 'unlock': {
        if (effect.feature === 'wide' || effect.feature === 'vast') notes.add('Each roll first picks a range or result type. The new range gets a share of rolls and the starting range remains in the pool.')
        if (effect.feature === 'arithmetic') notes.add('You can roll written calculations such as 8 + 3 or 8 × 3. These rolls pay for badges that describe the calculation itself.')
        if (effect.feature === 'nesting') notes.add('A nested expression puts one calculation inside another, as in (2 + 3) × 4. Its depth counts the levels of calculation.')
        break
      }
      case 'generator': {
        if (!effect.tuning) notes.add(generatorExamples[effect.family])
        else {
          if (effect.tuning.weight) notes.add('The game picks a result type first. A higher weight gives that type a bigger share of rolls.')
          if (effect.tuning.digitBias) notes.add('Extra weight for zero makes it more frequent after the first digit. That can make badges for patterns with zeros appear more often.')
          if (effect.tuning.operandMax) notes.add('An operand is a number used in a calculation. For example, 3 and 4 are the operands in 3 × 4.')
          if (effect.tuning.complexity && effect.family !== 'digits') notes.add(generatorExamples[effect.family])
        }
        break
      }
      case 'discount': notes.add('The discount applies when you buy a new study or rank in an eligible discipline. The price rounds up to a whole EP.'); break
      case 'feature': {
        const note = featureNotes[effect.id]
        if (note) notes.add(note)
        break
      }
    }
  }
  return [...notes]
}
