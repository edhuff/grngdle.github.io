import { rewards } from '../src/game/economy'
import { manualRoll, newGame, progress, purchase } from '../src/game/game'
import { generate, seededWords } from '../src/game/generator'
import { milestones } from '../src/game/progression'
import { classicalRoute, dependencies, effectsOf, owns, research, researchById, researchRoute, researchStatus } from '../src/game/research'

const samples = Number(process.argv[2] ?? 250_000)
const runs = Number(process.argv[3] ?? 8)
const secondsPerRoll = Number(process.argv[4] ?? 7.5)
const laterRuns = Number(process.argv[5] ?? Math.min(runs, 3))
if (![samples, runs, laterRuns].every(value => Number.isSafeInteger(value) && value > 0)
    || laterRuns > runs || !Number.isFinite(secondsPerRoll) || secondsPerRoll <= 0) {
  throw new Error('Usage: npm run balance -- [base samples] [trials] [active seconds per roll] [trials continuing past Classical]')
}

const baseWords = seededWords(42)
const baseEffects = effectsOf({})
let baseIncome = 0n
for (let index = 0; index < samples; index++) {
  const { expression } = generate(baseEffects.generator, baseWords)
  baseIncome += rewards(expression, {}, baseEffects).earned
}

const compareCost = (a: typeof research[number], b: typeof research[number]) => a.cost < b.cost ? -1 : a.cost > b.cost ? 1 : 0
const strategies = [
  { name: 'Gateway route', extras: ['classical-bounds'], skip: 'distribution-audit' },
  { name: 'Badge investments', extras: ['squarefree-sieve', 'decimal-analysis', 'digit-census', 'prime-premium', 'paired-positions', 'distribution-audit'], skip: 'classical-bounds' },
  { name: 'Collection and odds', extras: ['classical-bounds', 'badge-index', 'decimal-seven-luck', 'rolling-register', 'expanded-survey'], skip: 'distribution-audit' },
]
// Pick a paid path through each later gateway. The alternatives still have
// their real costs and discovery requirements when a trial chooses them.
const directPaths: Record<string, string[]> = {
  arithmetic: ['efficiency-focus'],
  hyperoperations: ['power-towers', 'tetration-heights'],
  'conway-chains': ['arrow-spectrum', 'knuth-weight-study'],
  'ordinal-hierarchy': ['conway-chains', 'chain-sampling'],
  'extreme-googology': ['ordinal-hierarchy', 'ordinal-sampling'],
}
const keystonePaths: Record<string, string[]> = {
  ...directPaths,
  hyperoperations: ['power-towers', 'tower-convergence'],
  'conway-chains': ['arrow-spectrum', 'hyperoperation-theory'],
  'ordinal-hierarchy': ['conway-chains', 'recursive-foundations'],
  'extreme-googology': ['ordinal-hierarchy', 'ordinal-foundations'],
}

function laterCandidates(target: string, purchases: Parameters<typeof owns>[0], paths: Record<string, string[]>) {
  const planned = new Set<string>()
  function visit(id: string) {
    if (planned.has(id) || owns(purchases, id)) return
    planned.add(id)
    const item = researchById.get(id)!
    const requirements = paths[id] ?? dependencies(item.requires)
    requirements.forEach(visit)
  }
  visit(target)
  planned.delete(target)
  return research.filter(item => planned.has(item.id)).sort(compareCost)
}
const results = milestones.map(() => [] as number[])
const summary = strategies.map(() => ({ rolls: [] as number[], meanIncome: [] as number[], intervals: [] as number[] }))
const maxRolls = 320_000

for (let seed = 0; seed < runs; seed++) {
  const strategyIndex = seed % strategies.length
  const strategy = strategies[strategyIndex]
  const word = seededWords((seed + 1) * 1024 + 17)
  const stageZero = new Set(classicalRoute())
  for (const id of strategy.extras) for (const study of researchRoute(id)) stageZero.add(study)
  stageZero.delete(strategy.skip)
  stageZero.delete('expansion')
  let candidates = research.filter(item => stageZero.has(item.id) && item.region === 0).sort(compareCost)
  let game = newGame()
  let stage = 0
  let lastStudy = 0
  for (let index = 0; index < maxRolls && stage < milestones.length; index++) {
    game = manualRoll(game, word)
    const target = researchById.get(milestones[stage])!
    let current = progress(game)
    for (const item of candidates) {
      const repeats = stage === 0 && item.id === 'compound'
      if (owns(game.purchases, item.id) >= (repeats ? item.max! : 1)) continue
      if (researchStatus(item, current, game.balance) !== 'available') continue
      game = purchase(game, item.id)
      current = progress(game)
      if (stage === 0) {
        summary[strategyIndex].intervals.push(game.rolls - lastStudy)
        lastStudy = game.rolls
      }
    }
    if (researchStatus(target, current, game.balance) !== 'available') continue
    game = purchase(game, target.id)
    results[stage].push(game.rolls)
    if (stage === 0) {
      summary[strategyIndex].rolls.push(game.rolls)
      summary[strategyIndex].meanIncome.push(Number(game.lifetime) / game.rolls)
      if (seed >= laterRuns) break
    }
    stage++
    if (stage < milestones.length) candidates = laterCandidates(milestones[stage], game.purchases, strategyIndex === 2 ? keystonePaths : directPaths)
  }
}
const median = (data: number[]) => {
  const values = [...data].sort((a, b) => a - b)
  return values.length ? (values[Math.floor((values.length - 1) / 2)] + values[Math.floor(values.length / 2)]) / 2 : null
}
const hours = (rolls: number | null) => rolls === null ? 'Unreached' : (rolls * secondsPerRoll / 3600).toFixed(1)

console.log(`Uniform Classical yield over ${samples.toLocaleString()} seeded outcomes: ${(Number(baseIncome) / samples).toFixed(3)} EP per roll`)
console.log(`Production prices, ${secondsPerRoll} active seconds per roll, up to ${maxRolls.toLocaleString()} rolls per trial`)
console.table(strategies.map((strategy, i) => ({
  strategy: strategy.name, trials: summary[i].rolls.length, expansionRolls: median(summary[i].rolls),
  expansionHours: hours(median(summary[i].rolls)),
  medianEPPerRoll: median(summary[i].meanIncome)?.toFixed(2),
  medianPurchaseMinutes: ((median(summary[i].intervals) ?? 0) * secondsPerRoll / 60).toFixed(1),
})))
console.table(milestones.map((milestone, i) => {
  const values = results[i].sort((a, b) => a - b)
  return { milestone, reached: values.length, minRolls: values[0], medianRolls: median(values), maxRolls: values.at(-1), medianHours: hours(median(values)) }
}))
if (results.some((trials, i) => trials.length !== (i === 0 ? runs : laterRuns))) process.exitCode = 1
