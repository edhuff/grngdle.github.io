import type { CSSProperties } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { badgeRule } from '../game/attributes'
import { progress, type Game } from '../game/game'
import { integerText, notation, oddsText, rarities, rarityOf } from '../game/math'
import { milestones } from '../game/progression'
import { eras, owns, rankCost, researchById, researchEra, researchStatus } from '../game/research'
import { BadgeCards, RarityLabel } from './shared'

type Props = { game: Game; rolling: boolean; onRoll: () => void; onResearch: (id: string) => void }

export function Play({ game, rolling, onRoll, onResearch }: Props) {
  const roll = game.recent[0]
  const era = researchEra(game.purchases)
  const title = roll ? notation(roll.expression) : '—'
  const tier = roll ? rarityOf(roll.probability) : rarities[0]
  const tierIndex = rarities.indexOf(tier)
  const milestoneId = milestones.find(id => !owns(game.purchases, id))
  const milestone = milestoneId ? researchById.get(milestoneId) : undefined
  const ready = milestone && researchStatus(milestone, progress(game), game.balance, game.lab) === 'available'

  return <div className="play">
    <section className="roll-chamber" aria-labelledby="roll-heading">
      <p className="roll-era">{eras[era]}{era === 0 && <span> · 0–1,000,000</span>}</p>
      <h1 id="roll-heading">Roll chamber</h1>
      <div className="roll-readout">
        <div className={'result-number' + (title.length > 17 ? ' compact' : '') +
          (roll && rolling ? ' sequential' : '') + (rolling && !game.settings.reducedEffects && tierIndex >= 2 ? ' rare-reveal' : '')}
          key={roll?.index ?? 0} aria-live="polite" aria-label={roll ? title : 'No rolls yet'}
          style={{ '--rarity': tier.color } as CSSProperties} data-testid="roll-number">
          {roll ? [...title].map((character, index) => <span aria-hidden="true" key={index}
            style={{ '--delay': Math.min(index, 29) * 14 + 'ms' } as CSSProperties}>{character === ' ' ? '\u00A0' : character}</span>) : title}
        </div>
        <div className="result-meta">
          {roll && <><RarityLabel probability={roll.probability} /><span>{oddsText(roll.probability)}</span>
            <span className="earned">+{integerText(roll.earned)} EP</span></>}
        </div>
      </div>
      <button className="roll-button" onClick={onRoll} disabled={rolling}
        onKeyDown={event => { if (event.repeat) event.preventDefault() }}>
        {rolling ? 'REVEALING' : 'ROLL'}
      </button>
    </section>

    {roll && <details className="roll-details">
      <summary aria-label="Roll attribute details">
        <span className="roll-badges">{roll.badges.map(badge => <span key={badge.id}>{badgeRule(badge.id).name}</span>)}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <BadgeCards badges={roll.badges} odds={game.settings.showBadgeOdds} />
      {roll.bonus > 0n && <p className="reward-bonus">Research bonus <strong>+{integerText(roll.bonus)} EP</strong></p>}
    </details>}

    {milestone && <button className="roll-milestone" aria-label="Explore research" onClick={() => onResearch(milestone.id)}>
      <span className="milestone-label"><small>Next milestone</small><strong>{milestone.title}</strong></span>
      <span className={ready ? 'milestone-cost earned' : 'milestone-cost'}>{ready ? 'Ready to research' : integerText(rankCost(milestone, 0, game.lab)) + ' EP'}</span>
      <ArrowRight size={17} aria-hidden="true" />
    </button>}
  </div>
}
