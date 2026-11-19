import { useState } from 'react'
import { Check, ChevronRight, LockKeyhole } from 'lucide-react'
import type { BadgeFamily } from '../game/attributes'
import type { Game, Roll } from '../game/game'
import { generatorBands } from '../game/generator'
import { depth, integerText, magnitude, notation, oddsText, rarities } from '../game/math'
import { milestones } from '../game/progression'
import { classicalRoute, effectsOf, researchById, researchEra, owns, eras } from '../game/research'
import { BadgeCards, Empty, familyNames, RarityLabel } from './shared'

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
    <header className="page-heading"><h1>Collection</h1></header>
    <div className="records-layout">
      <section className="record-list">
        <div className="tabs" aria-label="Collection categories">{collections.map(entry => <button key={entry.id} aria-pressed={entry.id === category}
          onClick={() => { setCategory(entry.id); setSelected(undefined) }}>{entry.name}</button>)}</div>
        {list.length ? <div className="record-scroll">{list.map(item => <button key={item.index} className="record-row" aria-pressed={roll?.index === item.index} onClick={() => setSelected(item.index)}>
          <span className="record-index">#{item.index.toLocaleString()}</span><strong>{notation(item.expression)}</strong>
          <RarityLabel probability={item.probability} /><ChevronRight size={15} />
        </button>)}</div> : <Empty text="Roll to start your collection." />}
      </section>
      {roll && <section className="record-detail"><RollDetail roll={roll} game={game} /></section>}
    </div>
    <section className="families-panel">
      <header className="section-title"><h2>Discovered badge families</h2><span>{badges.length}</span></header>
      {badges.length ? <div className="family-list">{badges.map(([family, hits]) =>
        <div key={family}><strong>{familyNames[family]}</strong><span>{hits.toLocaleString()} {hits === 1 ? 'roll' : 'rolls'}</span></div>
      )}</div> : <Empty text="No badge families discovered yet." />}
    </section>
  </>
}

function RollDetail({ roll, game }: { roll: Roll; game: Game }) {
  const expressions = roll.expression.kind !== 'integer'
  const value = magnitude(roll.expression)
  return <>
    <span className="record-index">Roll #{roll.index.toLocaleString()}</span>
    <h2>{notation(roll.expression)}</h2>
    <div className="record-meta"><RarityLabel probability={roll.probability} /><span>{oddsText(roll.probability)}</span><span className="earned">+{integerText(roll.earned)} EP</span></div>
    <p className="detail-subtitle">{expressions ? 'Odds for this ordered expression. Equivalent values can come from different rolls.' : 'Exact outcome odds for this integer.'} Generator v{roll.generatorVersion}.</p>
    <div className="inspector"><strong>Roll inspector</strong>
      <span>Exact value {value === null ? 'undetermined' : integerText(value)} · Depth {depth(roll.expression)}</span></div>
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
        <div className="chart-list">{rarities.map(tier => <div key={tier.name}>
          <span style={{ color: tier.color }}>{tier.name}</span>
          <div className="meter"><i style={{ background: tier.color, width: (game.rolls ? game.distribution[tier.name] / game.rolls * 100 : 0) + '%' }} /></div>
          <strong>{game.distribution[tier.name].toLocaleString()}</strong>
        </div>)}</div>
      </section>
      <section className="stats-panel">
        <header className="section-title"><h2>Research milestones</h2></header>
        <div className="milestone-list"><div><strong>{eras[researchEra(game.purchases)]}</strong><span>{completed} / {path.size} Classical route studies</span></div>
          {milestones.map(id => <div key={id}>{owns(game.purchases, id) ? <Check size={15} className="earned" /> : <LockKeyhole size={15} />}
            <span>{researchById.get(id)?.title}</span></div>)}
        </div>
      </section>
    </div>
    <section className="stats-panel distribution-panel">
      <header className="section-title"><h2>Generation distribution</h2></header>
      <div className="milestone-list">{bands.map(band => <div key={band.id}><strong>{bandNames[band.id]}</strong>
        <span>{band.weight.toString()}% of rolls · {integerText(band.outcomes)} possible outcomes</span></div>)}</div>
    </section>
  </>
}
