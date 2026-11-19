import { rewards } from '../src/game/economy'
import { manualRoll, newGame, progress, purchase } from '../src/game/game'
import { generate, seededWords } from '../src/game/generator'
import { milestones as progressionMilestones } from '../src/game/progression'
import { classicalRoute, effectsOf, owns, rankCost, research, researchById, researchStatus } from '../src/game/research'

const milestones = progressionMilestones.slice(0, 4)
const samples = Number(process.argv[2] ?? 250_000)
const runs = Number(process.argv[3] ?? 8)
const secondsPerRoll = Number(process.argv[4] ?? 7.5)
if (![samples, runs].every(value => Number.isSafeInteger(value) && value > 0)
    || !Number.isFinite(secondsPerRoll) || secondsPerRoll <= 0) {
  throw new Error('Usage: npm run balance -- [base samples] [progression trials] [active seconds per roll]')
}

const baseWords = seededWords(42)
const baseEffects = effectsOf({})
let baseIncome = 0n
for (let index = 0; index < samples; index++) {
  const { expression } = generate(baseEffects.generator, baseWords)
  baseIncome += rewards(expression, {}, baseEffects).earned
}

const route = classicalRoute()
const choices = research.filter(item => route.has(item.id) && item.id !== 'expansion')
  .sort((a, b) => a.cost < b.cost ? -1 : a.cost > b.cost ? 1 : 0)
choices.push(...[milestones[0], 'efficiency-focus', ...milestones.slice(1)].map(id => researchById.get(id)!))
const results = milestones.map(() => [] as number[])
const routedIncome: number[] = []

for (let seed = 1; seed <= runs; seed++) {
  const word = seededWords(seed * 1024 + 17)
  let game = newGame()
  for (let index = 0; index < 100_000 && !milestones.every(id => owns(game.purchases, id)); index++) {
    game = manualRoll(game, word)
    for (const item of choices) {
      const rank = owns(game.purchases, item.id)
      if (rankCost(item, rank) > game.balance || researchStatus(item, progress(game), game.balance) !== 'available') continue
      game = purchase(game, item.id)
      const milestone = milestones.indexOf(item.id as typeof milestones[number])
      if (milestone >= 0) {
        results[milestone].push(game.rolls)
        if (milestone === 0) routedIncome.push(Number(game.lifetime) / game.rolls)
      }
    }
  }
}

console.log(`Classical yield across ${samples.toLocaleString()} seeded draws: ${(Number(baseIncome) / samples).toFixed(3)} EP/roll`)
if (routedIncome.length) console.log(`Average yield through first expansion: ${(routedIncome.reduce((a, b) => a + b, 0) / routedIncome.length).toFixed(3)} EP/roll`)
console.log(`Production research in ${runs} seeded trials at ${secondsPerRoll} seconds per manual roll`)
console.table(milestones.map((milestone, index) => {
  const values = results[index].sort((a, b) => a - b)
  const median = (values[Math.floor((values.length - 1) / 2)] + values[Math.floor(values.length / 2)]) / 2
  return { milestone, reached: values.length,
    minRolls: values[0], medianRolls: median || 'unreached', maxRolls: values.at(-1),
    medianHours: median ? (median * secondsPerRoll / 3600).toFixed(1) : '—' }
}))
if (results.some(milestone => milestone.length !== runs)) process.exitCode = 1
