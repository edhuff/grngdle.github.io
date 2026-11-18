import { useState } from 'react'
import { BarChart3, BookOpen, Check, ChevronRight, Fingerprint, FlaskConical, LockKeyhole, Zap } from 'lucide-react'
import type { BadgeFamily } from '../game/attributes'
import type { Game, Roll } from '../game/game'
import { generatorBands } from '../game/generator'
import { depth, integerText, magnitude, notation, oddsText, rarities } from '../game/math'
import { milestones } from '../game/progression'
import { classicalRoute, effectsOf, researchById, researchEra, owns, eras } from '../game/research'
import { BadgeCards, Empty, familyIcons, familyNames, RarityLabel } from './shared'

const collections = [
  { id: 'rarest', name: 'Rarest' }, { id: 'highest', name: 'Highest EP' }, { id: 'largest', name: 'Largest' }, { id: 'recent', name: 'Recent' },
] as const

export function Collection({ game }: { game: Game }) {
  const [category, setCategory] = useState<typeof collections[number]['id']>('rarest')
  const [selected, setSelected] = useState<number>()
  const list = game[category]
  const roll = list.find(item => item.index === selected) ?? list[0]
  const badges = Object.entries(game.discoveries) as [BadgeFamily, number][]
  return <>
    <div className="page-heading"><div><span className="era-pill"><BookOpen size={12} /> Discovery archive</span><h1>Collection<span>.</span></h1>
      <p>Revisit notable rolls, their original odds, and every badge family you’ve found.</p></div></div>
    <div className="records-layout">
      <section className="panel record-list">
        <div className="tabs" aria-label="Collection categories">{collections.map(entry => <button key={entry.id} aria-pressed={entry.id === category}
          onClick={() => { setCategory(entry.id); setSelected(undefined) }}>{entry.name}</button>)}</div>
        {list.length ? <div className="record-scroll">{list.map(item => <button key={item.index} className="record-row" aria-pressed={roll?.index === item.index} onClick={() => setSelected(item.index)}>
          <span className="record-index">#{item.index.toLocaleString()}</span><strong>{notation(item.expression)}</strong>
          <RarityLabel probability={item.probability} /><ChevronRight size={15} />
        </button>)}</div> : <Empty text="Roll to start your collection." />}
      </section>
      <section className="panel record-detail">
        {roll ? <RollDetail roll={roll} game={game} /> : <Empty text="Select a discovery to inspect it." />}
      </section>
    </div>
    <section className="panel families-panel">
      <header className="section-title"><div><Fingerprint size={17} /><h2>Discovered badge families</h2></div><span className="count-pill">{badges.length}</span></header>
      {badges.length ? <div className="family-list">{badges.map(([family, hits]) => {
        const Icon = familyIcons[family]
        return <div key={family}><Icon size={17} /><strong>{familyNames[family]}</strong><span>{hits.toLocaleString()} rolls</span></div>
      })}</div> : <Empty text="Badge families will appear as you discover them." />}
    </section>
  </>
}

function RollDetail({ roll, game }: { roll: Roll; game: Game }) {
  const expressions = roll.expression.kind !== 'integer'
  const value = magnitude(roll.expression)
  return <>
    <span className="eyebrow">DISCOVERY #{roll.index.toLocaleString()}</span>
    <h2>{notation(roll.expression)}</h2>
    <div className="record-meta"><RarityLabel probability={roll.probability} /><span>{oddsText(roll.probability)}</span><span className="earned">+{integerText(roll.earned)} EP</span></div>
    <p className="detail-subtitle">{expressions ? 'Odds for this ordered expression. Equivalent values can come from different rolls.' : 'Exact outcome odds for this integer.'} Generator v{roll.generatorVersion}.</p>
    {effectsOf(game.purchases).inspector && <div className="inspector"><strong>Roll inspector</strong>
      <span>Exact value {value === null ? 'undetermined' : integerText(value)} · Depth {depth(roll.expression)}</span></div>}
    <BadgeCards badges={roll.badges} odds={game.settings.showBadgeOdds} />
    {roll.bonus > 0n && <p className="reward-bonus">Research bonus <strong>+{integerText(roll.bonus)} EP</strong></p>}
  </>
}

const path = classicalRoute()
const bandNames = { classical: 'Classical integer', expanded: 'Expanded integer', vast: 'Arbitrary precision', arithmetic: 'Sum or product', nested: 'Nested expression' }

export function Statistics({ game }: { game: Game }) {
  const bands = generatorBands(effectsOf(game.purchases).generator)
  const completed = [...path].filter(id => owns(game.purchases, id)).length
  const stats = [
    { name: 'Manual rolls', value: game.rolls.toLocaleString(), icon: BarChart3 },
    { name: 'Lifetime EP', value: integerText(game.lifetime), icon: Zap },
    { name: 'Researched nodes', value: Object.keys(game.purchases).length.toLocaleString(), icon: FlaskConical },
    { name: 'Badge families', value: Object.keys(game.discoveries).length.toLocaleString(), icon: Fingerprint },
  ]
  return <>
    <div className="page-heading"><div><span className="era-pill"><BarChart3 size={12} /> Lab telemetry</span><h1>Statistics<span>.</span></h1>
      <p>Track your manual rolls, discoveries, and research milestones.</p></div></div>
    <div className="stats-grid">{stats.map(item => <section className="panel stat-tile" key={item.name}><item.icon size={18} /><strong>{item.value}</strong><span>{item.name}</span></section>)}</div>
    <div className="statistics-layout">
      <section className="panel stats-panel">
        <header className="section-title"><div><BarChart3 size={17} /><h2>Rarity distribution</h2></div></header>
        <div className="chart-list">{rarities.map(tier => <div key={tier.name}>
          <span style={{ color: tier.color }}>{tier.name}</span>
          <div className="meter"><i style={{ background: tier.color, width: (game.rolls ? game.distribution[tier.name] / game.rolls * 100 : 0) + '%' }} /></div>
          <strong>{game.distribution[tier.name].toLocaleString()}</strong>
        </div>)}</div>
      </section>
      <section className="panel stats-panel">
        <header className="section-title"><div><FlaskConical size={17} /><h2>Research milestones</h2></div></header>
        <div className="milestone-list"><div><strong>{eras[researchEra(game.purchases)]}</strong><span>{completed} / {path.size} Classical route studies</span></div>
          {milestones.map(({ id }) => <div key={id}>{owns(game.purchases, id) ? <Check size={15} className="earned" /> : <LockKeyhole size={15} />}
            <span>{researchById.get(id)?.title}</span></div>)}
        </div>
      </section>
    </div>
    <section className="panel stats-panel distribution-panel">
      <header className="section-title"><div><BarChart3 size={17} /><h2>Current generation distribution</h2></div></header>
      <div className="milestone-list">{bands.map(band => <div key={band.id}><strong>{bandNames[band.id]}</strong>
        <span>{band.weight.toString()}% of rolls · {integerText(band.outcomes)} possible outcomes</span></div>)}</div>
    </section>
  </>
}
