import { all, node } from './requirements'
import { cluster, discount, ep, generator, luck, pair, range, reward, sourceEP } from './model'

const magnitude = { doctrine: 'magnitude', refundable: true, type: 'Specialization' } as const
const rarity = { doctrine: 'rarity', refundable: true, type: 'Specialization' } as const
const economy = { doctrine: 'efficiency', refundable: true, type: 'Specialization' } as const

export const doctrineStudies = [
  ...cluster(1, 'Doctrines', 7, [
    ['magnitude-range-survey', 'Magnitude · Boundary Survey', 9200, 'decimal-doctrine', 'Extend the expanded band through ten billion while this doctrine is active.', range(10), magnitude],
    ['magnitude-value-records', 'Magnitude · Integer Record Funding', 13700, all(node('decimal-doctrine'), node('magnitude-dossier')), 'Earn 4 extra EP on the expanded integer band while this doctrine is active.', sourceEP('expanded', 4), magnitude],
    ['rarity-prime-tails', 'Rarity · Prime Candidate Tails', 9800, 'rarity-tail-doctrine', 'Add four classical tickets to each value ending in 1 or 9 and earn an extra EP on Prime.', [luck(1, 4), luck(9, 4), reward('prime', 1)], rarity],
    ['rarity-mirror-register', 'Rarity · Palindrome Register', 13300, all(node('rarity-tail-doctrine'), node('proper-mirror')), 'Award 5 more EP for palindromes and 3 more EP for Double Centre.', [reward('palindrome', 5), reward('centreFour', 3)], rarity],
    ['economy-divisibility-aid', 'Economy · Divisibility Funding', 7400, 'economy-lab-doctrine', 'Award 3 extra EP on manual rolls that are multiples of both three and seven.', pair('three', 'seven', 3), economy],
    ['economy-archive-aid', 'Economy · Archive Funding', 12000, all(node('economy-lab-doctrine'), node('reagent-rebate')), 'Reduce the cost of new Attribute Science purchases by another 7% while active.', discount(700, 3), economy],
  ]),
  ...cluster(2, 'Doctrines', 7, [
    ['magnitude-factorial-reach', 'Magnitude · Factorial Reach', 42500, all(node('decimal-doctrine'), node('factorial-operands')), 'Increase the largest generated factorial argument by one hundred.', generator('factorials', { operandMax: 100 }), magnitude],
    ['magnitude-long-integer-reach', 'Magnitude · Long Integer Reach', 54500, all(node('magnitude-range-survey'), node('digit-strings')), 'Increase maximum decimal string length by twelve.', generator('digits', { complexity: 12 }), magnitude],
    ['rarity-exact-quotients', 'Rarity · Exact Quotients', 39600, all(node('arithmetic-rarity-doctrine'), node('natural-quotients')), '+8 EP when a division has an exact even integer value.', pair('quotient', 'even', 8), rarity],
    ['rarity-rare-exponents', 'Rarity · Deep Exponents', 56000, all(node('arithmetic-rarity-doctrine'), node('exponentiation')), 'Add three band weight to powers and award 5 EP for nested powers.', [generator('powers', { weight: 3 }), pair('exponent', 'nested', 5)], rarity],
    ['economy-signed-accounts', 'Economy · Signed Accounts', 38900, all(node('arithmetic-economy-doctrine'), node('signed-differences')), 'Award four extra EP on subtraction and five on division rolls.', [sourceEP('subtraction', 4), sourceEP('division', 5)], economy],
    ['economy-extended-margin', 'Economy · Expanded Margins', 48500, all(node('economy-divisibility-aid'), node('expanded-survey')), 'Add 9 EP per expanded integer and 4 EP per long decimal string.', [sourceEP('expanded', 9), sourceEP('digits', 4)], economy],
  ]),
  ...cluster(3, 'Doctrines', 7, [
    ['magnitude-tetration-bases', 'Magnitude · Higher Tetration Bases', 160000, all(node('tower-magnitude-doctrine'), node('tetration-bases')), 'Increase the maximum tetration base by seven.', generator('tetration', { operandMax: 7 }), magnitude],
    ['magnitude-tetration-height', 'Magnitude · Higher Tetration Stacks', 184000, all(node('magnitude-tetration-bases'), node('tetration-heights')), 'Increase the maximum tetration height by three.', generator('tetration', { complexity: 3 }), magnitude],
    ['rarity-variable-towers', 'Rarity · Variable Towers', 163000, 'tower-rarity-doctrine', 'Add four band weight to the variable-height power tower generator.', generator('towers', { weight: 4 }), rarity],
    ['rarity-tower-catalog', 'Rarity · Repeated Tower Catalog', 177000, all(node('rarity-variable-towers'), node('tower-repeated-operands')), 'Earn 10 extra EP for repeated tower operands and 3 more EP on any tower roll.', [pair('tower', 'repeatedOperand', 10), sourceEP('towers', 3)], rarity],
    ['economy-tower-payoff', 'Economy · Stack Dividends', 155000, 'tower-economy-doctrine', 'Pay 18 additional EP on tetration and 12 on power towers.', [sourceEP('tetration', 18), sourceEP('towers', 12)], economy],
    ['economy-fractional-yield', 'Economy · Symbolic Yield', 175000, all(node('economy-tower-payoff'), node('unrolled-grammar')), '+10% of base EP on all manual rolls while this doctrine is active.', ep(1000), economy],
  ]),
  ...cluster(4, 'Doctrines', 7, [
    ['magnitude-hyperoperation-base', 'Magnitude · Large Hyperoperation Bases', 245000, all(node('rank-magnitude-doctrine'), node('hyperoperation-operands')), 'Increase the maximum base or height of finite hyperoperations by twelve.', generator('hyperoperations', { operandMax: 12 }), magnitude],
    ['magnitude-expanded-up-arrows', 'Magnitude · Extended Arrow Orders', 274000, all(node('rank-magnitude-doctrine'), node('knuth-operand-extension')), 'Increase the maximum up-arrow count by four decimal orders.', generator('arrows', { complexity: 4 }), magnitude],
    ['rarity-finite-rank-cohort', 'Rarity · Finite Rank Cohort', 242000, all(node('arrow-rarity-doctrine'), node('hyperoperation-record')), 'Add four band weight to finite hyperoperations and award 9 EP on their rank badge.', [generator('hyperoperations', { weight: 4 }), reward('hyperRank', 9)], rarity],
    ['rarity-arrow-records', 'Rarity · Arrow Record Tables', 261000, 'arrow-rarity-doctrine', 'Award 10 additional EP on the arrow badge and 5 EP on the tetration badge.', [reward('arrows', 10), reward('tetrationHeight', 5)], rarity],
    ['economy-high-rank-payout', 'Economy · High-Rank Payout', 248000, 'hyperoperation-economy-doctrine', 'Pay 22 additional EP on finite hyperoperations and 17 on up-arrows.', [sourceEP('hyperoperations', 22), sourceEP('arrows', 17)], economy],
    ['economy-experimental-discount', 'Economy · Protocol Grants', 276000, all(node('economy-high-rank-payout'), node('hyperoperation-theory')), 'Reduce the price of new Convergence research by 7%.', discount(700, 7), economy],
  ]),
  ...cluster(5, 'Doctrines', 7, [
    ['magnitude-longest-chains', 'Magnitude · Extended Chains', 480000, all(node('chain-magnitude-doctrine'), node('recursive-foundations')), 'Add two positions to maximum Conway chain length.', generator('chains', { complexity: 2 }), magnitude],
    ['rarity-recursive-archive', 'Rarity · Recursive Archive', 475000, all(node('chain-rarity-doctrine'), node('recursive-foundations')), 'Award 15 extra EP on chains and 6 more when their immediate operands repeat.', [sourceEP('chains', 15), pair('chain', 'repeatedOperand', 6)], rarity],
    ['economy-recursive-payoff', 'Economy · Recursive Payoff', 490000, 'recursive-economy-doctrine', 'Pay 30 additional EP on Conway chains when this doctrine is active.', sourceEP('chains', 30), economy],
  ]),
  ...cluster(6, 'Doctrines', 7, [
    ['magnitude-ordinal-exponents', 'Magnitude · Larger Ordinal Exponents', 705000, all(node('ordinal-magnitude-doctrine'), node('ordinal-foundations')), 'Increase the largest finite ordinal exponent by three.', generator('hierarchy', { complexity: 3 }), magnitude],
    ['rarity-ordinal-dossier', 'Rarity · Ordinal Dossier', 722000, all(node('ordinal-rarity-doctrine'), node('ordinal-observatory')), 'Award 18 extra EP for the Ordinal Index Depth badge and add one hierarchy band weight.', [reward('ordinal', 18), generator('hierarchy', { weight: 1 })], rarity],
    ['economy-transfinite-stipend', 'Economy · Transfinite Stipend', 701000, 'ordinal-economy-doctrine', 'Pay 35 extra EP per fast-growing hierarchy roll.', sourceEP('hierarchy', 35), economy],
  ]),
  ...cluster(7, 'Doctrines', 7, [
    ['magnitude-ackermann-reach', 'Magnitude · Ackermann Reach', 1100000, all(node('busy-magnitude-doctrine'), node('ackermann-inputs')), 'Increase the maximum Ackermann–Péter rank by two and argument by forty.', generator('ackermann', { complexity: 2, operandMax: 40 }), magnitude],
    ['magnitude-unproven-frontier', 'Magnitude · State Frontier', 1410000, all(node('busy-magnitude-doctrine'), node('busy-computation-survey')), 'Increase the maximum Busy Beaver state count by sixty.', generator('busy', { operandMax: 60 }), magnitude],
    ['rarity-machine-archive', 'Rarity · Machine Archive', 1200000, all(node('busy-rarity-doctrine'), node('busy-computation-survey')), 'Award 20 more EP on the Busy Beaver States badge and add one band weight to Busy Beaver forms.', [reward('busy', 20), generator('busy', { weight: 1 })], rarity],
    ['rarity-extreme-encounters', 'Rarity · Extreme Encounters', 1370000, all(node('busy-rarity-doctrine'), node('ackermann-frequency')), 'Add three weight each to Busy Beaver and Ackermann–Péter forms.', [generator('busy', { weight: 3 }), generator('ackermann', { weight: 3 })], rarity],
    ['economy-frontier-payoff', 'Economy · Endgame Dividends', 1230000, 'frontier-economy-doctrine', 'Pay 35 additional EP on Busy Beaver and 30 on Ackermann–Péter forms.', [sourceEP('busy', 35), sourceEP('ackermann', 30)], economy],
    ['economy-grand-grant', 'Economy · Grand Research Grant', 1480000, all(node('frontier-economy-doctrine'), node('economy-transfinite-stipend')), 'Apply a further 4% discount to new research purchases.', discount(400), economy],
  ]),
]
