import type { CSSProperties } from 'react'
import { ArrowRight, Dices, History, Orbit, ScanLine, Sparkles, Target, Zap } from 'lucide-react'
import { type Game } from '../game/game'
import { generatorBands } from '../game/generator'
import { integerText, notation, oddsText, rarities, rarityOf } from '../game/math'
import { milestones } from '../game/progression'
import { disciplines, effectsOf, eras, owns, researchById, researchEra, rollGoal } from '../game/research'
import { BadgeCards, RarityLabel } from './shared'

type Props = {
  game: Game; rolling: boolean; onRoll: () => void; onResearch: () => void; onCollection: () => void
}

export function Play({ game, rolling, onRoll, onResearch, onCollection }: Props) {
  const roll = game.recent[0]
  const era = researchEra(game.purchases)
  const title = roll ? notation(roll.expression) : '— — —'
  const tier = roll ? rarityOf(roll.probability) : rarities[0]
  const tierIndex = rarities.indexOf(tier)
  const bands = generatorBands(effectsOf(game.purchases).generator)
  const nextMilestone = milestones.find(item => !owns(game.purchases, item.id))
  const goal = nextMilestone && researchById.get(nextMilestone.id)
  const target = nextMilestone ? rollGoal(nextMilestone.rolls, game.lab) : 1
  const progress = Math.min(100, game.rolls / target * 100)
  return <>
    <div className="page-heading play-heading">
      <div>
        <span className="era-pill"><i /> Era {['0', 'I', 'II'][era]} <b>·</b> {eras[era]}</span>
        <h1>Roll chamber<span>.</span></h1>
        <p>Roll to discover mathematical attributes and earn Expression Points.</p>
      </div>
      <div className="source-label"><Orbit size={17} /><div><strong>{bands.length === 1 ? '0 — 1,000,000' : bands.length + ' active generators'}</strong><small>{bands.length === 1 ? 'UNIFORM INTEGER RANGE' : 'MIXED DISTRIBUTION'}</small></div></div>
    </div>
    <div className="play-grid">
      <div className="play-main">
        <section className="panel chamber" aria-label="Roll chamber">
          <div className={"chamber-grid" + (rolling && tierIndex >= 4 && !game.settings.reducedEffects ? " high-tier" : "")} aria-hidden="true" />
          <div className="chamber-orbit" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="chamber-top"><span><i /> GENERATOR ONLINE</span><span>ROLL #{String(game.rolls).padStart(4, '0')}</span></div>
          <div className="chamber-body">
            <div className="eyebrow chamber-caption">{roll ? (roll.expression.kind === 'integer' ? 'GENERATED INTEGER' : 'GENERATED EXPRESSION') : 'AWAITING FIRST ROLL'}</div>
            <div className={'result-number' + (!roll ? ' standby' : '') + (title.length > 17 ? ' compact' : '') +
              (roll && rolling ? ' sequential' : '') + (rolling && !game.settings.reducedEffects && tierIndex >= 2 ? ' rare-reveal' : '')}
              key={roll?.index ?? 0} aria-live="polite" aria-label={roll ? title : 'No rolls yet'}
              style={{ '--rarity': tier.color, '--flare': 20 + 10 * tierIndex + 'px' } as CSSProperties} data-testid="roll-number">
              {roll ? [...title].map((character, index) => <span aria-hidden="true" key={index}
                style={{ '--delay': Math.min(index, 29) * 14 + 'ms' } as CSSProperties}>{character === ' ' ? '\u00A0' : character}</span>) : title}
            </div>
            <div className="result-meta">
              {roll ? <><RarityLabel probability={roll.probability} /><span className="rule-line" /><span title={roll.expression.kind === 'integer' ? 'Exact integer outcome probability' : 'Exact ordered expression probability'}>{oddsText(roll.probability)}</span></>
                : <span>Rarity and odds appear after your roll</span>}
            </div>
            <button className="roll-button" onClick={onRoll} disabled={rolling}
              onKeyDown={event => { if (event.repeat) event.preventDefault() }}>
              <Dices size={21} strokeWidth={2.4} />{rolling ? 'REVEALING' : 'ROLL'}
            </button>
            <div className="roll-caption">One click, one roll</div>
          </div>
          <div className="chamber-footer">
            <span><ScanLine size={14} /> {roll?.expression.kind && roll.expression.kind !== 'integer' ? 'SYMBOLIC EXPRESSION' : 'INTEGER SAMPLE'}</span>
            <span className={roll ? 'earned' : ''}><Zap size={14} /> {roll ? '+' + integerText(roll.earned) + ' EP earned' : '— EP earned'}</span>
          </div>
        </section>
        <section className="panel attribute-panel">
          <header className="section-title"><div><Sparkles size={17} /><h2>Matched attributes</h2></div>{roll && <span className="count-pill">{roll.badges.length} found</span>}</header>
          {roll
            ? <><BadgeCards badges={roll.badges} odds={game.settings.showBadgeOdds} />
              {roll.bonus > 0n && <p className="reward-bonus">Research bonus <strong>+{integerText(roll.bonus)} EP</strong></p>}</>
            : <div className="empty-attributes"><div className="ghost-glyph"><ScanLine size={24} /></div><div><strong>No attributes yet</strong><p>Your first roll will reveal the patterns hiding in its digits.</p></div></div>}
        </section>
      </div>
      <aside className="play-side">
        <section className="panel history-panel">
          <header className="section-title"><div><History size={17} /><h2>Recent rolls</h2></div><span className="count-pill">{game.recent.length}</span></header>
          {game.recent.length ? <ul className="history-list">{game.recent.slice(0, 5).map(item => <li key={item.index}>
            <div><strong title={notation(item.expression)}>{notation(item.expression)}</strong><RarityLabel probability={item.probability} /></div>
            <span className="earned">+{integerText(item.earned)} EP</span>
          </li>)}</ul> : <div className="empty-history"><div className="history-die"><Dices size={25} /></div><strong>No rolls recorded</strong><p>Your latest discoveries will appear here.</p></div>}
          <button className="panel-link" onClick={onCollection}>Open collection <ArrowRight size={15} /></button>
        </section>
        <section className="panel goal-panel">
          <header className="section-title"><div><Target size={17} /><h2>{goal ? 'Next breakthrough' : 'Research'}</h2></div></header>
          <div className="goal-content">
            <small>{goal ? disciplines[goal.discipline].name.toUpperCase() : 'PROTOTYPE MILESTONES'}</small>
            <h3>{goal?.title ?? 'All generators unlocked'}</h3>
            <p>{goal?.description ?? 'Explore the remaining branches or collect more discoveries.'}</p>
            {goal && <><div className="meter" role="progressbar" aria-label="Manual roll requirement" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(game.rolls, target)}><i style={{ width: progress + '%' }} /></div>
              <div className="meter-label"><span>Manual rolls</span><span>{game.rolls.toLocaleString()} / {target.toLocaleString()}</span></div></>}
          </div>
          <button className="panel-link" onClick={onResearch}>Explore research <ArrowRight size={15} /></button>
        </section>
      </aside>
    </div>
  </>
}
