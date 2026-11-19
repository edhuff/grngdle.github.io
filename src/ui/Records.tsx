import { useMemo, useState } from 'react'
import { Check, ChevronRight, LockKeyhole } from 'lucide-react'
import { badgeReference, badgeRule, type BadgeFamily, type BadgeId } from '../game/attributes'
import { rollRarity, type Game, type Roll } from '../game/game'
import { generatorBands, sourceNames } from '../game/generator'
import { equivalentOdds } from '../game/generation/odds'
import { inspectInteger } from '../game/inspection'
import { fundamentalSequence } from '../game/math/ordinal'
import { ordinalText } from '../game/math/render'
import { children } from '../game/math/ast'
import { analyze } from '../game/math/analysis'
import { type Expression, compactOddsText, fraction, integerText, notation, oddsText, rarities } from '../game/math'
import { milestones } from '../game/progression'
import { classicalRoute, clusterProgress, effectsOf, researchById, researchEra, owns, eras, revealedResearch } from '../game/research'
import { BadgeCards, Empty, epOddsText, familyNames, RarityLabel } from './shared'

const collections = [
  { id: 'rarest', name: 'Rarest' }, { id: 'highest', name: 'Highest EP' }, { id: 'largest', name: 'Largest exact integers' }, { id: 'recent', name: 'Recent' },
] as const

export function Collection({ game }: { game: Game }) {
  const [category, setCategory] = useState<typeof collections[number]['id']>('rarest')
  const [selected, setSelected] = useState<number>()
  const [badgeFilter, setBadgeFilter] = useState<BadgeId | ''>('')
  const [sourceFilter, setSourceFilter] = useState<Roll['source'] | ''>('')
  const [query, setQuery] = useState('')
  const { features } = effectsOf(game.purchases, game.legacyRange)
  const observations = (Object.keys(game.observations) as BadgeId[]).sort((a, b) => badgeRule(a).name.localeCompare(badgeRule(b).name))
  const list = game[category].filter(item => (!badgeFilter || !features.has('badge-filter') || item.badges.some(badge => badge.id === badgeFilter)) &&
    (!sourceFilter || !features.has('source-filter') || sourceFilter === item.source) && (!query || !features.has('record-search') ||
      String(item.index).includes(query.replace(/^#/, '')) || notation(item.expression).toLowerCase().includes(query.toLowerCase())))
  const roll = list.find(item => item.index === selected) ?? list[0]
  const badges = Object.entries(game.discoveries) as [BadgeFamily, number][]
  return <>
    <header className="page-heading"><h1>Collection</h1></header>
    <div className="records-layout">
      <section className="record-list">
        <div className="tabs" aria-label="Collection categories">{collections.map(entry => <button key={entry.id} aria-pressed={entry.id === category}
          onClick={() => { setCategory(entry.id); setSelected(undefined) }}>{entry.name}</button>)}</div>
        {(features.has('badge-filter') || features.has('source-filter') || features.has('record-search')) && <div className="record-filters">
          {features.has('badge-filter') && <select aria-label="Filter by badge" value={badgeFilter} onChange={event => setBadgeFilter(event.target.value as BadgeId | '')}>
            <option value="">All badges</option>{observations.map(id => <option key={id} value={id}>{badgeRule(id).name}</option>)}</select>}
          {features.has('source-filter') && <select aria-label="Filter by generator" value={sourceFilter} onChange={event => setSourceFilter(event.target.value as Roll['source'] | '')}>
            <option value="">All generators</option>{(Object.keys(game.sourceCounts) as Roll['source'][]).map(id => <option key={id} value={id}>{sourceNames[id]}</option>)}</select>}
          {features.has('record-search') && <input type="search" aria-label="Search records" placeholder="Roll or notation" value={query} onChange={event => setQuery(event.target.value)} />}
        </div>}
        {list.length ? <div className="record-scroll">{list.map(item => <button key={item.index} className="record-row" aria-pressed={roll?.index === item.index} onClick={() => setSelected(item.index)}>
          <span className="record-index">#{item.index.toLocaleString()}</span><strong>{notation(item.expression)}</strong>
          <RarityLabel tier={rollRarity(item)} /><ChevronRight size={15} />
        </button>)}</div> : <Empty text={game[category].length ? "No rolls match these filters." : "Roll to start your collection."} />}
      </section>
      {roll && <section className="record-detail"><RollDetail roll={roll} game={game} /></section>}
    </div>
    <section className="families-panel">
      <header className="section-title"><h2>Discovered badge families</h2><span>{badges.length}</span></header>
      {badges.length ? <div className="family-list">{badges.map(([family, hits]) =>
        <div key={family}><strong>{familyNames[family]}</strong><span>{hits.toLocaleString()} {hits === 1 ? 'roll' : 'rolls'}</span></div>
      )}</div> : <Empty text="No badge families discovered yet." />}
    </section>
    {features.has('badge-ledger') && <section className="families-panel">
      <header className="section-title"><h2>Badge observations</h2><span>{observations.length}</span></header>
      {observations.length ? <div className="family-list">{observations.map(id => <div key={id}>
        <strong>{badgeRule(id).name}</strong><span>{game.observations[id]!.count.toLocaleString()} recorded
          {features.has('first-discovery') && ' · first #' + game.observations[id]!.first.toLocaleString()}</span>
      </div>)}</div> : <Empty text="Roll to record badge observations." />}
    </section>}
  </>
}

function ExpressionTree({ expression }: { expression: Expression }) {
  const terms = children(expression)
  if (!terms.length) return <div className="expression-tree">{notation(expression)}</div>
  return <details className="expression-tree"><summary>{expression.kind} · {terms.length} operands</summary>
    {terms.map((term, index) => <ExpressionTree key={index} expression={term} />)}
  </details>
}

function FundamentalApproximants({ index }: { index: Parameters<typeof fundamentalSequence>[0] }) {
  return <div className="analysis-facts"><strong>Fundamental-sequence terms</strong>
    {[0n, 1n, 2n, 3n].map(n => <span key={String(n)}>λ[{String(n)}] = {ordinalText(fundamentalSequence(index, n))}</span>)}
  </div>
}

function RollDetail({ roll, game }: { roll: Roll; game: Game }) {
  const { features } = effectsOf(game.purchases, game.legacyRange)
  const expressions = roll.expression.kind !== 'integer'
  const facts = useMemo(() => analyze(roll.expression), [roll])
  const event = roll.generation?.event
  const equivalent = useMemo(() => roll.generation
    ? equivalentOdds(roll.generation.configuration, roll.expression, roll.probability) : null, [roll])
  const exact = facts.exact.status === 'exact' ? facts.exact.value : null
  const value = exact
    ? integerText(exact.numerator) + (exact.denominator === 1n ? '' : ' / ' + integerText(exact.denominator))
    : 'Unknown'
  const annotation = exact?.denominator === 1n ? inspectInteger(exact.numerator, features) : []
  const historicalBands = features.has('pool-breakdown') && roll.generation ? generatorBands(roll.generation.configuration) : []
  const historicalTotal = historicalBands.reduce((sum, band) => sum + band.weight, 0n)
  const references = features.has('reference-odds') ? roll.badges.flatMap(item => {
    const probability = badgeReference(item.id)
    return probability ? [[badgeRule(item.id).name, probability] as const] : []
  }) : []
  const bound = facts.lower?.toString()
  const lower = bound && (bound.length > 32 ? '10^' + (bound.length - 1) : integerText(facts.lower!))
  return <>
    <span className="record-index">Roll #{roll.index.toLocaleString()}</span>
    <h2>{notation(roll.expression)}</h2>
    <div className="record-meta"><RarityLabel tier={rollRarity(roll)} /><span className="earned">+{integerText(roll.earned)} EP</span></div>
    <p className="detail-subtitle">{expressions ? 'Odds for this ordered expression.' : 'Exact outcome odds for this integer.'} Generator v{roll.generatorVersion}.</p>
    <div className="inspector"><strong>Roll inspector</strong>
      {roll.epOdds ? <span>Chance of earning {integerText(roll.earned)} EP or more · {epOddsText(roll.epOdds)}
        {roll.epOdds.method === 'estimated' ? ' (estimated)' : ' (' + oddsText(roll.epOdds.probability) + ')'}</span>
        : <span>Recorded before EP-based rarity</span>}
      <span>Exact {expressions ? 'expression' : 'integer'} odds {oddsText(roll.probability)}</span>
      {event && <span>Roll event · {event.label} · {event.scope} · {oddsText(event.probability)}</span>}
      {equivalent && <span title={equivalent.status === 'unknown' ? oddsText(equivalent.atLeast) : undefined}>Equivalent-value odds {equivalent.status === 'exact' ? oddsText(equivalent.probability) : 'unknown (at least ' + compactOddsText(equivalent.atLeast) + ')'}</span>}
      <span>Exact value {value}{lower && ' · Proven lower bound ' + lower}</span>
      <span>Depth {facts.depth} · AST nodes {facts.nodes}{facts.ordinalDepth === null ? '' : ' · Ordinal depth ' + facts.ordinalDepth}</span>
      {expressions && <span>Integer {facts.integer} · Positive {facts.positive} · Even {facts.even}</span>}
      {!!annotation.length && <details><summary>Integer analysis</summary><div className="analysis-facts">
        {annotation.map(([label, result]) => <span key={label}>{label} · {result}</span>)}
      </div></details>}
      {!!historicalBands.length && <details><summary>Historical generator weights</summary><div className="analysis-facts">
        {historicalBands.map(band => <span key={band.id}>{sourceNames[band.id]} · {oddsText(fraction(band.weight, historicalTotal))}</span>)}
        {roll.generation?.configuration.terminal && <span>Extra tickets by final digit 0–9 · {roll.generation.configuration.terminal.join(', ')}</span>}
      </div></details>}
      {!!references.length && <details><summary>Uniform Classical badge frequencies</summary><div className="analysis-facts">
        {references.map(([name, probability]) => <span key={name}>{name} · {oddsText(probability)}</span>)}
      </div></details>}
      {roll.expression.kind === 'tower' && features.has('tower-stack') && <details><summary>Right-associated tower</summary><div className="analysis-facts">
        {roll.expression.terms.map((term, i, terms) => <span key={i}>Level {i + 1} · {notation(term)}{i + 1 < terms.length ? ' raised to the levels above' : ' at the top'}</span>)}
      </div></details>}
      {roll.expression.kind === 'fgh' && features.has('ordinal-index') && <details><summary>Cantor normal form</summary><div className="analysis-facts">
        {roll.expression.index.length === 0 ? <span>Zero ordinal</span> : roll.expression.index.map((term, i) =>
          <span key={i}>Term {i + 1} · exponent {ordinalText(term.exponent)} · coefficient {integerText(term.coefficient)}</span>)}
        {features.has('limit-approximants') && !!roll.expression.index.at(-1)?.exponent.length &&
          <FundamentalApproximants index={roll.expression.index} />}
      </div></details>}
      {expressions && features.has('expression-tree') && <details><summary>Expression tree</summary><ExpressionTree expression={roll.expression} /></details>}
    </div>
    <BadgeCards badges={roll.badges} odds={game.settings.showBadgeOdds} />
    {roll.bonus > 0n && <p className="reward-bonus">Research bonus <strong>+{integerText(roll.bonus)} EP</strong></p>}
  </>
}

const path = classicalRoute()

export function Statistics({ game }: { game: Game }) {
  const { generator, features } = effectsOf(game.purchases, game.legacyRange)
  const bands = generatorBands(generator)
  const total = bands.reduce((sum, band) => sum + band.weight, 0n)
  const completed = [...path].filter(id => owns(game.purchases, id)).length
  const revealed = revealedResearch(game.purchases)
  const ratedRolls = game.rolls - game.unratedRolls
  const stats = [
    { name: 'Manual rolls', value: game.rolls.toLocaleString() },
    { name: 'Lifetime EP', value: integerText(game.lifetime) },
    { name: 'Researched nodes', value: Object.keys(game.purchases).length.toLocaleString() },
    { name: 'Badge families', value: Object.keys(game.discoveries).length.toLocaleString() },
  ]
  return <>
    <header className="page-heading"><h1>Statistics</h1></header>
    <dl className="stats-grid">{stats.map(item => <div className="stat-tile" key={item.name}><dt>{item.name}</dt><dd>{item.value}</dd></div>)}</dl>
    <div className="statistics-layout">
      <section className="stats-panel">
        <header className="section-title"><h2>Rarity distribution</h2></header>
        {!!game.unratedRolls && <p className="detail-subtitle">{game.unratedRolls.toLocaleString()} rolls recorded before EP-based rarity.</p>}
        <div className="chart-list">{rarities.map(tier => <div key={tier.name}>
          <span style={{ color: tier.color }}>{tier.name}</span>
          <div className="meter"><i style={{ background: tier.color, width: (ratedRolls ? game.distribution[tier.name] / ratedRolls * 100 : 0) + '%' }} /></div>
          <strong>{game.distribution[tier.name].toLocaleString()}</strong>
        </div>)}</div>
      </section>
      <section className="stats-panel">
        <header className="section-title"><h2>Research milestones</h2></header>
        <div className="milestone-list"><div><strong>{eras[researchEra(game.purchases)]}</strong><span>{completed} / {path.size} Classical gateway candidates studied</span></div>
          {milestones.filter(id => revealed.has(id)).map(id => <div key={id}>{owns(game.purchases, id) ? <Check size={15} className="earned" /> : <LockKeyhole size={15} />}
            <span>{researchById.get(id)?.title}</span></div>)}
        </div>
      </section>
    </div>
    <section className="stats-panel distribution-panel">
      <header className="section-title"><h2>Generation distribution</h2></header>
      <div className="milestone-list">{bands.map(band => <div key={band.id}><strong>{sourceNames[band.id]}</strong>
        <span>{oddsText(fraction(band.weight, total))} rolls · {integerText(band.outcomes)} possible outcomes</span></div>)}</div>
    </section>
    {!!Object.keys(game.purchases).length && <section className="stats-panel distribution-panel">
      <header className="section-title"><h2>Research clusters</h2></header>
      <div className="milestone-list">{clusterProgress(game.purchases).map(cluster => <div key={cluster.region + '/' + cluster.name}>
        <strong>{cluster.name}</strong><span>{cluster.mastered} / {cluster.total} mastered · {eras[cluster.region]}</span></div>)}</div>
    </section>}
    {features.has('source-ledger') && <section className="stats-panel distribution-panel">
      <header className="section-title"><h2>Recorded rolls by generator</h2></header>
      <div className="milestone-list">{(Object.entries(game.sourceCounts) as [Roll['source'], number][]).map(([source, count]) =>
        <div key={source}><strong>{sourceNames[source]}</strong><span>{count.toLocaleString()}</span></div>)}</div>
    </section>}
  </>
}
