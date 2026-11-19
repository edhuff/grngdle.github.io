// Advanced clusters share the same data model as the Classical atlas.
import { all, any, countOf, found, node } from './requirements'
import { capacity, cluster, discount, ep, feature, generator, luck, pair, range, reward, sourceEP, type ResearchNode } from './model'

const keystone = { type: 'Keystone' } as const
const convergence = { type: 'Convergence' } as const
const magnitude = { doctrine: 'magnitude', refundable: true, type: 'Specialization' } as const
const rarity = { doctrine: 'rarity', refundable: true, type: 'Specialization' } as const
const economy = { doctrine: 'efficiency', refundable: true, type: 'Specialization' } as const

export const advancedStudies: ResearchNode[] = [
  ...cluster(1, 'Extended Decimal Ranges', 0, [
    ['eight-digit-integers', 'Eight-Digit Integers', 8500, 'expansion', 'Expand the upper bound of the expanded generator to 100 million.', range(8)],
    ['nine-digit-integers', 'Nine-Digit Integers', 16000, 'eight-digit-integers', 'Expand the upper bound to one billion.', range(9)],
    ['ten-digit-integers', 'Ten-Digit Integers', 28500, 'nine-digit-integers', 'Expand the upper bound to ten billion.', range(10)],
    ['twelve-digit-frontier', 'The Twelve-Digit Frontier', 45900, all(node('ten-digit-integers'), node('classical-bounds')), 'Expand the upper bound to one trillion and earn 5 extra EP on expanded rolls.', [range(12), sourceEP('expanded', 5)], keystone],
    ['expanded-survey', 'Expanded Integer Survey', 9400, 'expansion', 'Earn 3 additional EP on expanded integer rolls and retain 15 more recent rolls.', [sourceEP('expanded', 3), capacity('recent', 15)]],
    ['expanded-terminal-samples', 'Extended Sampling Audit', 11500, all(node('expanded-survey'), node('normalized-weights')), 'Add a point of weight to nonclassical integer bands and retain 10 more recent rolls.', [{ kind: 'anomaly', amount: 1 }, capacity('recent', 10)], convergence],
    ['decimal-fellowship', 'Extended Decimal Fellowship', 19500, countOf(2, 'nine-digit-integers', 'expanded-terminal-samples', 'decimal-doctrine'), 'Earn 6 additional EP on the expanded band and 2 EP on Even Decimal Length.', [sourceEP('expanded', 6), reward('lengths', 2)], keystone],
  ]),
  ...cluster(1, 'Doctrines', 7, [
    ['decimal-doctrine', 'Magnitude · Decimal Reach', 6700, 'magnitude-focus', 'While active, extend the expanded band to one billion and add 2 EP on expanded rolls.', [range(9), sourceEP('expanded', 2)], magnitude],
    ['rarity-tail-doctrine', 'Rarity · Tail Cohort', 6600, 'rarity-focus', 'Add three classical tickets for terminal digits 3 and 7 and 2 extra EP for Lucky Seven.', [luck(3, 3), luck(7, 3), reward('seven', 2)], rarity],
    ['economy-lab-doctrine', 'Economy · Laboratory Funding', 7200, 'efficiency-focus', 'Reduce the price of new Numerical Expansion purchases by 10%.', discount(1000, 0), economy],
  ]),
  ...cluster(2, 'Exact Arithmetic', 1, [
    ['subtraction-operands', 'Subtraction Operands', 18000, 'exact-operations', 'Increase the maximum operand of subtraction by 50 and its band weight by one.', generator('subtraction', { operandMax: 50, weight: 1 })],
    ['quotient-operands', 'Quotient Operands', 18500, 'exact-operations', 'Increase the maximum numerator and denominator of division by 75.', generator('division', { operandMax: 75 })],
    ['factorial-operands', 'Factorial Operands', 21500, 'exact-operations', 'Increase the largest factorial argument by 80.', generator('factorials', { operandMax: 80 })],
    ['natural-quotients', 'Integer Quotient Analysis', 21000, 'quotient-operands', 'Earn 6 extra EP when a quotient has an exact odd integer value.', pair('quotient', 'odd', 6)],
    ['signed-differences', 'Signed Difference Analysis', 22500, 'subtraction-operands', 'Earn 4 extra EP when subtraction produces an even integer.', pair('difference', 'even', 4)],
    ['factorial-archive', 'Factorial Archive', 30000, all(node('factorial-operands'), found('factorial', 2)), 'After observing two factorials, earn 7 more EP per factorial and retain six extra highest-EP records.', [reward('factorial', 7), capacity('highest', 6)], { ...keystone, challenge: true }],
    ['unrolled-grammar', 'Expression Outline', 23500, all(node('nesting'), node('radix-conversion')), 'Inspect the full ordered abstract syntax tree of generated expressions.', feature('expression-tree'), convergence],
    ['extended-arithmetic-review', 'Extended Arithmetic Review', 53000, countOf(2, 'natural-quotients', 'signed-differences', 'factorial-operands'), 'Earn 5 EP on subtraction and division rolls and 7 EP on factorial rolls.', [sourceEP('subtraction', 5), sourceEP('division', 5), sourceEP('factorials', 7)], keystone],
    ['exponential-foundations', 'Exponential Foundations', 68000, all(node('exponentiation'), node('unrolled-grammar')), 'Increase the powers band weight by two and award 6 extra EP for nested exponentiation.', [generator('powers', { weight: 2 }), pair('exponent', 'nested', 6)], keystone],
    ['decimal-bias-study', 'Zero-Biased Decimal Strings', 39000, 'digit-strings', 'Increase the zero weight of long decimal strings by three and their band weight by two.', generator('digits', { digitBias: 3, weight: 2 })],
    ['long-digit-census', 'Long Digit Census', 73500, all(node('digit-spectrum'), node('decimal-bias-study')), 'Increase the maximum integer length by eight and award 4 extra EP for the long integer badge.', [generator('digits', { complexity: 8 }), reward('longInteger', 4)], keystone],
  ]),
  ...cluster(2, 'Doctrines', 7, [
    ['power-operand-doctrine', 'Magnitude · Exponent Reach', 47500, all(node('decimal-doctrine'), node('exponentiation')), 'While active, increase the maximum power operand by six.', generator('powers', { operandMax: 6 }), magnitude],
    ['arithmetic-rarity-doctrine', 'Rarity · Unusual Arithmetic', 39800, all(node('rarity-tail-doctrine'), node('extended-arithmetic-review')), 'While active, add one division band weight and two factorial band weights.', [generator('division', { weight: 1 }), generator('factorials', { weight: 2 })], rarity],
    ['arithmetic-economy-doctrine', 'Economy · Notation Grants', 42900, all(node('economy-lab-doctrine'), node('exact-operations')), 'Reduce the price of new Mathematical Notation research by 8%.', discount(800, 1), economy],
  ]),
  ...cluster(3, 'Tower Composition', 2, [
    ['tower-termlimits', 'Tower Term Limits', 105000, 'power-towers', 'Increase maximum right-associated tower height by two.', generator('towers', { complexity: 2 })],
    ['tetration-bases', 'Tetration Bases', 125000, 'power-towers', 'Increase the maximum tetration base by four.', generator('tetration', { operandMax: 4 })],
    ['tetration-heights', 'Tetration Heights', 151000, 'tetration-bases', 'Raise the largest tetration stack height by three.', generator('tetration', { complexity: 3 })],
    ['tower-stack-analysis', 'Tower Stack Analysis', 119000, all(node('power-towers'), node('unrolled-grammar')), 'Inspect the ordered operands and right-association stages of explicit power towers.', feature('tower-stack')],
    ['tower-repeated-operands', 'Repeated Tower Operands', 142000, 'tower-termlimits', 'Award 10 extra EP for towers with repeated immediate operands.', pair('tower', 'repeatedOperand', 10)],
    ['tower-weight-study', 'Tower Frequency Study', 148000, 'tower-termlimits', 'Add three weight to exponent towers and one weight to tetration.', [generator('towers', { weight: 3 }), generator('tetration', { weight: 1 })]],
    ['tower-archive', 'Tower Archive', 165000, all(node('tower-weight-study'), found('tower', 4)), 'After observing four towers, retain eighteen more recent rolls and award 5 extra EP on towers.', [capacity('recent', 18), reward('tower', 5)], { ...keystone, challenge: true }],
    ['tower-convergence', 'Tower Convergence', 197000, countOf(2, 'tetration-heights', 'tower-repeated-operands', 'tower-archive'), 'Award 8 additional EP on tetration and a 5% EP bonus on all manual rolls.', [reward('tetrationHeight', 8), ep(500)], keystone],
  ]),
  ...cluster(3, 'Doctrines', 7, [
    ['tower-magnitude-doctrine', 'Magnitude · Composed Towers', 150000, all(node('power-operand-doctrine'), node('tower-termlimits')), 'While active, add two positions to maximum tower height and two to the maximum operand.', generator('towers', { complexity: 2, operandMax: 2 }), magnitude],
    ['tower-rarity-doctrine', 'Rarity · Tower Encounters', 152000, all(node('arithmetic-rarity-doctrine'), node('tower-weight-study')), 'While active, raise the tetration weight by three and award 6 extra EP on tetration.', [generator('tetration', { weight: 3 }), sourceEP('tetration', 6)], rarity],
    ['tower-economy-doctrine', 'Economy · Composition Grants', 141000, all(node('arithmetic-economy-doctrine'), node('power-towers')), 'Reduce the price of new Structural Complexity research by 8%.', discount(800, 2), economy],
  ]),
  ...cluster(4, 'Hyperoperation Theory', 1, [
    ['finite-rank-extension', 'Finite Rank Extension', 190000, 'hyperoperations', 'Extend the maximum finite hyperoperation rank by one.', generator('hyperoperations', { complexity: 1 })],
    ['hyperoperation-operands', 'Hyperoperation Operands', 195000, 'hyperoperations', 'Increase the largest base or height in the finite hyperoperation pool by four.', generator('hyperoperations', { operandMax: 4 })],
    ['knuth-operand-extension', 'Knuth Operand Extension', 207000, 'arrow-spectrum', 'Increase the largest Knuth base and right operand by eight.', generator('arrows', { operandMax: 8 })],
    ['knuth-weight-study', 'Arrow Frequency Study', 215000, 'arrow-spectrum', 'Add three band weight to Knuth up-arrows.', generator('arrows', { weight: 3 })],
    ['hyperoperation-record', 'Finite Rank Record', 245000, all(node('finite-rank-extension'), found('hyperRank', 3)), 'After observing three finite hyperoperations, earn 11 extra EP on that badge and keep eight more rarity records.', [reward('hyperRank', 11), capacity('rarest', 8)], { ...keystone, challenge: true }],
    ['hyperoperation-theory', 'Hyperoperation Theory', 302000, countOf(2, 'knuth-operand-extension', 'hyperoperation-operands', 'hyperoperation-record'), 'Add three band weight to finite hyperoperations and award 8 additional EP on Knuth up-arrows.', [generator('hyperoperations', { weight: 3 }), reward('arrows', 8)], keystone],
  ]),
  ...cluster(4, 'Doctrines', 7, [
    ['rank-magnitude-doctrine', 'Magnitude · Higher Ranks', 220000, all(node('tower-magnitude-doctrine'), node('finite-rank-extension')), 'While active, extend finite hyperoperation ranks by one and maximum Knuth arrow count by two decimal orders.', [generator('hyperoperations', { complexity: 1 }), generator('arrows', { complexity: 2 })], magnitude],
    ['arrow-rarity-doctrine', 'Rarity · Arrow Encounters', 222000, all(node('tower-rarity-doctrine'), node('knuth-weight-study')), 'While active, add four band weight and 7 EP per up-arrow roll.', [generator('arrows', { weight: 4 }), sourceEP('arrows', 7)], rarity],
    ['hyperoperation-economy-doctrine', 'Economy · High-Rank Grants', 225000, all(node('tower-economy-doctrine'), node('hyperoperations')), 'Reduce the price of new Probability Theory research by 8%.', discount(800, 4), economy],
  ]),
  ...cluster(5, 'Recursive Foundations', 2, [
    ['conway-chain-length', 'Outer Chain Length', 307000, 'conway-chains', 'Extend the maximum Conway chain length by two.', generator('chains', { complexity: 2 })],
    ['conway-chain-operands', 'Conway Chain Operands', 328000, 'conway-chains', 'Increase the maximum positive integer in Conway chains by three.', generator('chains', { operandMax: 3 })],
    ['nested-chain-incentive', 'Chain Composition Incentive', 341000, 'conway-chain-length', 'Award 14 extra EP when a Conway chain contains a nested expression.', pair('chain', 'nested', 14)],
    ['chain-sampling', 'Recursive Sampling', 355000, 'conway-chain-operands', 'Add four generator weight to Conway chains and seven EP per chain.', [generator('chains', { weight: 4 }), sourceEP('chains', 7)]],
    ['recursive-foundations', 'Recursive Foundations', 425000, all(node('nested-chain-incentive'), any(node('chain-sampling'), node('hyperoperation-theory'))), 'Add one position to maximum Conway chain length and 7% to the EP bonus on all manual rolls.', [generator('chains', { complexity: 1 }), ep(700)], keystone],
  ]),
  ...cluster(5, 'Doctrines', 7, [
    ['chain-magnitude-doctrine', 'Magnitude · Chain Reach', 390000, all(node('rank-magnitude-doctrine'), node('conway-chain-length')), 'While active, increase the maximum Conway chain length and operand by one each.', generator('chains', { complexity: 1, operandMax: 1 }), magnitude],
    ['chain-rarity-doctrine', 'Rarity · Recursive Encounters', 400000, all(node('arrow-rarity-doctrine'), node('chain-sampling')), 'While active, increase Conway chain band weight by three and award 10 extra EP on nested chains.', [generator('chains', { weight: 3 }), pair('chain', 'nested', 10)], rarity],
    ['recursive-economy-doctrine', 'Economy · Survey Funding', 372000, all(node('hyperoperation-economy-doctrine'), node('conway-chains')), 'Reduce the price of new Discovery Engineering research by 10%.', discount(1000, 8), economy],
  ]),
  ...cluster(6, 'Ordinal Foundations', 6, [
    ['ordinal-coefficients', 'Ordinal Coefficients', 470000, 'ordinal-hierarchy', 'Increase the maximum ordinal coefficient and hierarchy input by three.', generator('hierarchy', { operandMax: 3 })],
    ['ordinal-index-depth', 'Ordinal Exponent Range', 490000, 'ordinal-hierarchy', 'Increase the largest finite exponent in ordinal polynomial and iterated omega indices by one.', generator('hierarchy', { complexity: 1 })],
    ['cantor-normal-form', 'Cantor Normal Form', 482000, all(node('ordinal-hierarchy'), node('unrolled-grammar')), 'Inspect ordered exponents and coefficients of ordinal indices in Collection.', feature('ordinal-index')],
    ['limit-approximants', 'Fundamental Sequence Inspection', 520000, 'cantor-normal-form', 'For a documented limit index, inspect the first four fundamental-sequence approximants.', feature('limit-approximants')],
    ['ordinal-observatory', 'Ordinal Observatory', 515000, all(node('ordinal-index-depth'), found('ordinal', 3)), 'After three documented ordinal-indexed rolls, earn 12 extra EP for the Ordinal Index Depth badge and keep fifteen more recent rolls.', [reward('ordinal', 12), capacity('recent', 15)], { ...keystone, challenge: true }],
    ['ordinal-sampling', 'Ordinal Sampling', 545000, 'ordinal-coefficients', 'Add five band weight to fast-growing hierarchy forms.', generator('hierarchy', { weight: 5 })],
    ['ordinal-foundations', 'Ordinal Foundations', 660000, countOf(2, 'ordinal-observatory', 'ordinal-sampling', 'recursive-foundations'), 'Add one to the largest finite ordinal exponent and award 10 EP for every hierarchy roll.', [generator('hierarchy', { complexity: 1 }), sourceEP('hierarchy', 10)], keystone],
  ]),
  ...cluster(6, 'Doctrines', 7, [
    ['ordinal-magnitude-doctrine', 'Magnitude · Larger Index Terms', 610000, all(node('chain-magnitude-doctrine'), node('ordinal-coefficients')), 'While active, increase the maximum ordinal coefficient and hierarchy input by five.', generator('hierarchy', { operandMax: 5 }), magnitude],
    ['ordinal-rarity-doctrine', 'Rarity · Ordinal Encounters', 635000, all(node('chain-rarity-doctrine'), node('ordinal-sampling')), 'While active, add four band weight to the fast-growing hierarchy and earn 9 more EP per hierarchy roll.', [generator('hierarchy', { weight: 4 }), sourceEP('hierarchy', 9)], rarity],
    ['ordinal-economy-doctrine', 'Economy · Proof Grants', 605000, all(node('recursive-economy-doctrine'), node('ordinal-hierarchy')), 'Reduce the price of new Mathematical Analysis research by 10%.', discount(1000, 6), economy],
  ]),
  ...cluster(7, 'Computability and Growth', 6, [
    ['busy-state-frontier', 'Busy Beaver State Frontier', 745000, 'extreme-googology', 'Increase the maximum generated Busy Beaver state count by twenty.', generator('busy', { operandMax: 20 })],
    ['ackermann-inputs', 'Ackermann Inputs', 775000, 'extreme-googology', 'Extend Ackermann–Péter input by eight and rank by two.', generator('ackermann', { operandMax: 8, complexity: 2 })],
    ['busy-computation-survey', 'Busy Beaver Computation Survey', 810000, all(node('busy-state-frontier'), found('busy', 3)), 'After observing three Busy Beaver forms, earn 15 extra EP on their state badge and retain twelve more rarity records.', [reward('busy', 15), capacity('rarest', 12)], { ...keystone, challenge: true }],
    ['ackermann-frequency', 'Ackermann Sampling', 850000, 'ackermann-inputs', 'Add four band weight and 12 EP on Ackermann–Péter rolls.', [generator('ackermann', { weight: 4 }), sourceEP('ackermann', 12)]],
    ['computability-convergence', 'Computability Convergence', 1200000, countOf(2, 'busy-computation-survey', 'ackermann-frequency', 'ordinal-foundations'), 'Add four band weight to Busy Beaver forms and 11% to the EP bonus on all manual rolls.', [generator('busy', { weight: 4 }), ep(1100)], keystone],
  ]),
  ...cluster(7, 'Doctrines', 7, [
    ['busy-magnitude-doctrine', 'Magnitude · Machine Frontier', 990000, all(node('ordinal-magnitude-doctrine'), node('busy-state-frontier')), 'While active, extend the maximum Busy Beaver state count by thirty and the largest Ackermann–Péter rank by two.', [generator('busy', { operandMax: 30 }), generator('ackermann', { complexity: 2 })], magnitude],
    ['busy-rarity-doctrine', 'Rarity · Machine Encounters', 1010000, all(node('ordinal-rarity-doctrine'), node('busy-state-frontier')), 'While active, add four Busy Beaver band weight and award 17 extra EP on that band.', [generator('busy', { weight: 4 }), sourceEP('busy', 17)], rarity],
    ['frontier-economy-doctrine', 'Economy · Frontier Endowment', 1020000, all(node('ordinal-economy-doctrine'), node('computability-convergence')), 'Reduce the price of all new research by 5% and increase the EP bonus by 15% of base EP.', [discount(500), ep(1500)], economy],
  ]),
]
