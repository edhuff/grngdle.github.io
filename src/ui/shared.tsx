import type { CSSProperties } from 'react'
import { ArrowDownUp, Binary, Braces, CircleDivide, Fingerprint, Hash, Layers2, Orbit, ScanLine, Shapes, Sparkles } from 'lucide-react'
import { badgeReference, badgeRule, type Badge } from '../game/attributes'
import { integerText, oddsText, rarityOf, type Fraction } from '../game/math'

export function Mark() {
  return <img className="brand-mark" src={import.meta.env.BASE_URL + 'pages-assets/mark.svg'} alt="" width="38" height="38" />
}

export function RarityLabel({ probability }: { probability: Fraction }) {
  const tier = rarityOf(probability)
  return <span className="rarity" style={{ '--rarity': tier.color } as CSSProperties}><i />{tier.name}</span>
}

export const familyIcons = {
  parity: ArrowDownUp, divisibility: CircleDivide, digits: Binary, prime: Fingerprint, sequence: Hash,
  mirror: ScanLine, rhythm: Layers2, powers: Shapes, structure: Braces, landmarks: Orbit,
}
export const familyNames = {
  parity: 'Parity', divisibility: 'Divisibility', digits: 'Digit patterns', prime: 'Primes', sequence: 'Sequences',
  mirror: 'Symmetry', rhythm: 'Repeating patterns', powers: 'Perfect powers', structure: 'Expression structure', landmarks: 'Landmarks',
}

export function BadgeCards({ badges, odds }: { badges: Badge[]; odds: boolean }) {
  return <div className="badge-grid">{badges.map(badge => {
    const rule = badgeRule(badge.id)
    const Icon = familyIcons[rule.family]
    const probability = odds ? badgeReference(badge.id) : null
    return <article className="badge-card" key={badge.id}>
      <div className="badge-icon"><Icon size={17} /></div>
      <div><strong>{rule.name}{badge.level ? ' ' + badge.level : ''}</strong>
        <p>{rule.description}</p>
        {probability && <small>{oddsText(probability)} · Classical reference</small>}
      </div>
      <span className="earned">+{integerText(badge.reward)} EP</span>
    </article>
  })}</div>
}

export function Empty({ text }: { text: string }) {
  return <div className="empty-state"><Sparkles size={18} /><span>{text}</span></div>
}
