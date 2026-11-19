import type { CSSProperties } from 'react'
import { badgeReference, badgeRule, type Badge } from '../game/attributes'
import { integerText, oddsText, type rarities } from '../game/math'

export function Mark() {
  return <img className="brand-mark" src={import.meta.env.BASE_URL + 'pages-assets/mark.svg'} alt="" width="29" height="29" />
}

export function RarityLabel({ tier }: { tier: typeof rarities[number] }) {
  return <span className="rarity" style={{ '--rarity': tier.color } as CSSProperties}>{tier.name}</span>
}

export const familyNames = {
  parity: 'Parity', divisibility: 'Divisibility', digits: 'Digit patterns', prime: 'Primes', sequence: 'Sequences',
  mirror: 'Symmetry', rhythm: 'Repeating patterns', powers: 'Perfect powers', structure: 'Expression structure', landmarks: 'Landmarks',
}

export function BadgeCards({ badges, odds }: { badges: Badge[]; odds: boolean }) {
  return <div className="badge-grid">{badges.map(badge => {
    const rule = badgeRule(badge.id)
    const probability = odds ? badgeReference(badge.id) : null
    return <article className="badge-card" key={badge.id}>
      <div><strong>{rule.name}{badge.level ? ' ' + badge.level : ''}{badge.metric === undefined ? '' : ' · ' + integerText(badge.metric)}</strong>
        <p>{rule.description}</p>
        {probability && <small>{oddsText(probability)} · Classical reference</small>}
      </div>
      {badge.reward > 0n && <span className="earned">+{integerText(badge.reward)} EP</span>}
    </article>
  })}</div>
}

export function Empty({ text }: { text: string }) {
  return <p className="empty-state">{text}</p>
}
