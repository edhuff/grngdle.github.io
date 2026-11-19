import { useEffect, type CSSProperties } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { badgeRule } from '../game/attributes'
import { progress, rollRarity, type Game } from '../game/game'
import { compactOddsText, integerText, notation, oddsText } from '../game/math'
import { milestones } from '../game/progression'
import { eras, owns, rankCost, researchById, researchEra, researchStatus } from '../game/research'
import { BadgeCards, RarityLabel } from './shared'

type Props = { game: Game; rolling: boolean; onRoll: () => void; onResearch: (id: string) => void }

function RollNumber({ text, rolling }: { text: string; rolling: boolean }) {
  const numberStyle = {
    '--number-max': Math.min(96, 1050 / text.length) + 'px',
    '--number-fit': 132 / Math.max(7, text.length) + 'vw',
  } as CSSProperties

  return <div className="result-number" style={numberStyle} data-testid="roll-number" aria-label={text === '—' ? 'No rolls yet' : text}>
    {rolling ? <span className="reel-number" aria-hidden="true">{Array.from(text, (character, index) => {
      if (!/^[0-9]$/.test(character)) return <span key={index}>{character === ' ' ? '\u00a0' : character}</span>
      return <span className="digit-slot" key={index} style={{ '--delay': Math.min(index, 6) * 12 + 'ms' } as CSSProperties}>
        <span className="digit-reel">
          <span>{(Number(character) + 7) % 10}</span>
          <span>{(Number(character) + 3) % 10}</span>
          <span>{character}</span>
        </span>
      </span>
    })}</span> : text}
  </div>
}

export function Play({ game, rolling, onRoll, onResearch }: Props) {
  const roll = game.recent[0]
  const era = researchEra(game.purchases)
  const title = roll ? notation(roll.expression) : '—'
  const visibleRoll = rolling ? game.recent[1] : roll
  const rarity = visibleRoll ? rollRarity(visibleRoll) : undefined
  const milestoneId = milestones.find(id => !owns(game.purchases, id))
  const milestone = milestoneId ? researchById.get(milestoneId) : undefined
  const ready = milestone && researchStatus(milestone, progress(game), game.balance, game.lab) === 'available'

  useEffect(() => {
    function handleSpace(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof Element && event.target.closest('button, input, select, textarea, a, summary, [contenteditable]')) return
      event.preventDefault()
      if (!event.repeat) onRoll()
    }

    window.addEventListener('keydown', handleSpace)
    return () => window.removeEventListener('keydown', handleSpace)
  }, [onRoll])

  return <div className="play">
    <section aria-labelledby="roll-heading">
      <h1 className="visually-hidden" id="roll-heading">Roll chamber</h1>
      <div className={'roll-display' + (rolling ? ' is-rolling' : '') + (!rolling && rarity && rarity.name !== 'Common' ? ' has-rarity' : '')}
        style={{ '--roll-accent': rarity?.color } as CSSProperties}>
        <div className="display-header">
          <span>{eras[era]}</span>
          {era === 0 && <span className="display-range">0–1,000,000</span>}
        </div>
        <RollNumber key={roll?.index} text={title} rolling={rolling} />
        <div className="result-meta" aria-hidden="true">
          {visibleRoll ? <>
            <RarityLabel tier={rollRarity(visibleRoll)} />
            <span title={oddsText(visibleRoll.probability)}>{compactOddsText(visibleRoll.probability)}</span>
            <strong className="earned">+{integerText(visibleRoll.earned)} EP</strong>
          </> : <span>{rolling ? '\u00a0' : 'Roll to start'}</span>}
        </div>
        <span className="visually-hidden" role="status">{!rolling && visibleRoll
          ? title + '. ' + rarity?.name + '. Exact roll odds ' + compactOddsText(visibleRoll.probability) + '. Earned ' + integerText(visibleRoll.earned) + ' EP.'
          : ''}</span>
      </div>

      <button className="roll-button" onClick={onRoll} aria-label="Roll" aria-keyshortcuts="Space" aria-disabled={rolling || undefined}
        onKeyDown={event => { if (event.repeat) event.preventDefault() }}>
        <span>Roll</span><kbd aria-hidden="true">Space</kbd>
      </button>
    </section>

    <div className="roll-notes">
      {visibleRoll && <details className="roll-details">
        <summary aria-label="Roll attribute details">
          <span className="roll-badges">{visibleRoll.badges.map(badge => <span key={badge.id}>{badgeRule(badge.id).name}</span>)}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <BadgeCards badges={visibleRoll.badges} odds={game.settings.showBadgeOdds} />
        {visibleRoll.bonus > 0n && <p className="reward-bonus">Research bonus <strong>+{integerText(visibleRoll.bonus)} EP</strong></p>}
      </details>}
    </div>

    {milestone && <button className="roll-milestone" aria-label="Explore research" onClick={() => onResearch(milestone.id)}>
      <span className="milestone-label"><small>Next research</small><strong>{milestone.title}</strong></span>
      <span className={ready ? 'milestone-cost earned' : 'milestone-cost'}>{ready ? 'Ready' : integerText(rankCost(milestone, 0, game.lab)) + ' EP'}</span>
      <ArrowUpRight size={15} aria-hidden="true" />
    </button>}
  </div>
}
