import { all, any, countOf, earned, found, node } from './requirements'
import { badgeEP, capacity, cluster, discount, ep, feature, luck, pair, property, reward, sourceEP } from './model'

export const classicalClusters = ['Numerical Properties', 'Digit Pattern Analysis', 'EP Economics', 'Probability & Luck',
  'Discovery & Collection', 'Mathematical Analysis', 'Convergence & Gateways'] as const

// Existing save IDs are kept in their original research definitions.
export const classicalLegacyClusters: Record<string, typeof classicalClusters[number]> = Object.fromEntries([
  ['catalog squares classifier atlas operators', 0],
  ['place-value radix repetition motifs symmetry pattern-model', 1],
  ['yield compound synergy capital', 2],
  ['odds distribution variance tail-model', 3],
  ['measurement bounds invariants verification notation syntax grammar boundaries horizon', 5],
  ['fieldwork peer-review synthesis classical-review expansion', 6],
].flatMap(([ids, group]) => (ids as string).split(' ').map(id => [id, classicalClusters[group as number]])))

const key = { type: 'Keystone' } as const
const converge = { type: 'Convergence' } as const
const foundation = { type: 'Foundation' } as const
const challenge = { type: 'Keystone', challenge: true } as const

export const classicalStudies = [
  // 19 new + 5 original
  ...cluster(0, classicalClusters[0], 3, [
    ['octal-divisibility', 'Binary Divisibility', 36, 'catalog', 'Discover positive multiples of eight.', property('eight'), foundation],
    ['eleven-test', 'Alternating Divisibility Test', 54, 'octal-divisibility', 'Recognize multiples of eleven.', property('eleven')],
    ['modular-thirteen', 'Residues Modulo Thirteen', 93, 'eleven-test', 'Recognize multiples of thirteen.', property('thirteen')],
    ['wheel-factorization', 'Thirty-Spoke Wheel', 110, 'operators', 'Recognize integers coprime to 30.', property('coprimeThirty')],
    ['residue-classes', 'Residual Classes', 150, 'wheel-factorization', 'Award a badge for remainder 5 modulo 12.', property('centeredResidue')],
    ['cube-recognition', 'Cube Recognition', 115, 'squares', 'Award a badge for exact cubes.', property('cube')],
    ['biquadrates', 'Biquadrates', 240, 'cube-recognition', 'Recognize perfect fourth powers.', property('fourthPower')],
    ['triangular-array', 'Triangular Arrays', 78, 'catalog', 'Recognize triangular numbers, including zero.', property('triangular')],
    ['rectangular-array', 'Pronic Arrays', 154, 'triangular-array', 'Recognize products of consecutive nonnegative integers.', property('pronic')],
    ['mersenne-form', 'Mersenne Form', 370, 'biquadrates', 'Recognize one less than a power of two.', property('mersenne')],
    ['prime-decomposition', 'Prime Decomposition', 98, 'catalog', 'Recognize integers with exactly two prime factors counted with multiplicity.', property('semiprime'), foundation],
    ['squarefree-sieve', 'Squarefree Sieve', 4400, 'fundamental-theorem', 'Recognize integers greater than one with no repeated prime factors.', property('squareFree')],
    ['fundamental-theorem', 'Fundamental Theorem of Arithmetic', 2450, all(node('prime-decomposition'), node('bounds')), 'Display exact prime factorizations through ten million and recognize sphenic integers.', [feature('factorization'), property('sphenic')], key],
    ['exponent-support', 'Powerful Integers', 385, 'squarefree-sieve', 'Recognize integers with every prime exponent at least two.', property('powerful')],
    ['smooth-factorization', 'Smooth Factorization', 390, 'fundamental-theorem', 'Recognize composite numbers whose prime factors are all at most five.', property('smooth')],
    ['six-divisor-study', 'Six-Divisor Classification', 480, 'fundamental-theorem', 'Recognize integers with exactly six positive divisors.', property('sixDivisors')],
    ['aliquot-balance', 'Aliquot Abundance', 490, 'six-divisor-study', 'Recognize integers whose proper divisors sum to more than the integer itself.', property('abundant')],
    ['perfect-number-study', 'Perfect Numbers', 780, 'aliquot-balance', 'Recognize positive integers equal to the sum of their proper divisors.', property('perfect')],
    ['amicable-pairs', 'Amicable Pairs', 1150, all(node('perfect-number-study'), node('spectrum-of-divisors')), 'Recognize amicable integers when both divisor sums are provable. Add 8 EP to the badge.', [property('amicable'), reward('amicable', 8)], key],
  ]),
  // 18 new + 6 original
  ...cluster(0, classicalClusters[1], 3, [
    ['zero-runs', 'Zero Runs', 26, 'repetition', 'Recognize adjacent zeros.', property('zeroPair')],
    ['digit-census', 'Distinct Digit Census', 64, 'repetition', 'Recognize decimals with at least four distinct positions and no repeated digits.', property('permutation')],
    ['decimal-endpoints', 'Matching Endpoints', 140, 'symmetry', 'Recognize matching terminal digits in a nonpalindrome.', property('endpoints')],
    ['proper-mirror', 'Proper Substring Mirror', 180, 'symmetry', 'Recognize an interior or terminal three-digit mirror inside a longer decimal.', property('palChunk')],
    ['mirror-centres', 'Mirror Centres', 320, 'proper-mirror', 'Recognize four-digit palindromic blocks built from two digits.', property('centreFour')],
    ['double-mirror', 'Paired Mirrors', 540, all(node('proper-mirror'), node('mirror-centres')), 'Recognize two disjoint three-digit mirrored blocks.', property('palindromePair')],
    ['pair-recurrence', 'Pair Recurrence', 790, 'motifs', 'Recognize a two-digit block that occurs twice without overlap.', property('repeatedPair')],
    ['alternating-parity', 'Alternating Parity', 215, 'pair-recurrence', 'Recognize longer alternating sequences of odd and even digits.', property('alternating')],
    ['interleaved-periods', 'Interleaved Periods', 460, 'pair-recurrence', 'Recognize two alternating decimal digits across the whole number.', property('interleaved')],
    ['rise-order', 'Strict Increasing Order', 108, 'radix', 'Recognize strictly increasing decimals of at least three digits.', property('rising')],
    ['fall-order', 'Strict Decreasing Order', 115, 'radix', 'Recognize strictly decreasing decimals of at least three digits.', property('falling')],
    ['second-differences', 'Two-Step Differences', 235, any(node('rise-order'), node('fall-order')), 'Recognize three consecutive positions with a common difference of ±2.', property('twoStep')],
    ['balanced-blocks', 'Balanced Blocks', 365, 'digit-census', 'Recognize even-length decimals with equal digit sums on both halves.', property('balanced')],
    ['reverse-modulus', 'Reverse Congruence', 520, all(node('decimal-endpoints'), node('odds')), 'Recognize multiples of seven whose decimal reversal is also divisible by seven.', property('reverseMultiple')],
    ['paired-positions', 'Even Decimal Length', 7900, 'balanced-blocks', 'Recognize even-length decimals of at least four digits.', property('lengths')],
    ['alternating-checksum', 'Alternating Checksum', 380, all(node('alternating-parity'), node('eleven-test')), 'Recognize decimals with equal digit sums on alternating positions.', property('alternatingSum')],
    ['pattern-synthesis', 'Pattern Synthesis', 3460, all(node('pattern-model'), node('pair-recurrence')), 'Earn 4 extra EP when both Digit Rhythm and Echoing Pair occur.', pair('rhythm', 'repeatedPair', 4), key],
    ['periodic-proof', 'Periods in the Wild', 760, all(node('interleaved-periods'), found('interleaved', 3)), 'After observing three Interleaved Tracks, add 8 EP to that badge and 2 EP to Digit Rhythm.', [reward('interleaved', 8), reward('rhythm', 2)], challenge],
  ]),
  // 18 new + 4 original
  ...cluster(0, classicalClusters[2], 5, [
    ['prime-premium', 'Prime Premium', 38, 'yield', '+1 EP for a Prime badge.', reward('prime', 1)],
    ['repetition-rate', 'Repetition Rate', 425, 'yield', '+1 EP for Double Take.', reward('repeat', 1)],
    ['divisor-dividend', 'Divisor Dividend', 125, 'compound', '+2 EP when Triple and Quinary both match.', pair('three', 'five', 2)],
    ['square-stipend', 'Square Stipend', 114, 'squares', '+2 EP for Perfect Square.', reward('square', 2)],
    ['mirror-premium', 'Mirror Premium', 208, 'repetition-rate', '+3 EP for a Palindrome.', reward('palindrome', 3)],
    ['repdigit-premium', 'Repdigit Premium', 225, 'repetition-rate', '+4 EP for a Repdigit.', reward('uniform', 4)],
    ['sequence-fellowship', 'Sequence Fellowship', 315, 'peer-review', '+7 EP for Fibonacci and +3 EP for Lucas numbers.', [reward('fibonacci', 7), reward('lucas', 3)]],
    ['digit-dividend', 'Digit Dividend', 1300, all(node('repetition-rate'), node('synergy')), '+2 EP when Double Take and Triple both match.', pair('repeat', 'three', 2), converge],
    ['prime-and-pattern', 'Prime and Pattern', 415, all(node('prime-premium'), node('digit-census')), '+4 EP for a number with Prime and No Repeats.', pair('prime', 'permutation', 4), converge],
    ['factor-royalties', 'Factor Royalties', 380, 'prime-decomposition', '+1 EP for Semiprime and +2 EP for Sphenic.', [reward('semiprime', 1), reward('sphenic', 2)]],
    ['mirror-divisibility', 'Mirror and Checksum', 690, all(node('mirror-premium'), node('eleven-test')), '+6 EP when Palindrome and Elevens both match.', pair('palindrome', 'eleven', 6), converge],
    ['lucky-pair', 'Lucky Pair', 315, 'divisor-dividend', '+3 EP when Lucky Seven and Quinary both match.', pair('seven', 'five', 3)],
    ['sequence-funding', 'Sequence Funding', 480, all(node('sequence-fellowship'), node('second-differences')), '+1 EP on sequence badges.', badgeEP('sequence')],
    ['coincidence-premium', 'Sequence Coincidences', 860, all(node('cube-recognition'), node('triangular-array')), '+8 EP when a number is both Triangular and a Perfect Cube.', pair('triangular', 'cube', 8), converge],
    ['reagent-rebate', 'Research Reagents', 330, 'capital', 'Reduce the EP cost of new Attribute Science purchases by 4%.', discount(400, 3)],
    ['review-budget', 'Review Budget', 450, 'capital', 'Reduce the EP cost of new Mathematical Analysis purchases by 4%.', discount(400, 6)],
    ['classical-endowment', 'Classical Endowment', 3230, 'digit-dividend', '+8% of base EP on manual rolls.', ep(800), key],
    ['patronage', 'Joint Patronage', 1220, all(node('classical-endowment'), node('reagent-rebate'), node('review-budget'), earned(12_000n)), 'Reduce the EP price of new research by 2%.', discount(200), key],
  ]),
  // 14 new + 4 original
  ...cluster(0, classicalClusters[3], 4, [
    ['probability-notebook', 'Probability Notebook', 50, 'odds', 'Inspect reference frequencies for the badges on a retained roll.', feature('reference-odds'), foundation],
    ['normalized-weights', 'Normalized Weights', 138, 'distribution', 'Inspect the historical generator pool and exact weight of each band.', feature('pool-breakdown'), foundation],
    ['decimal-zero-luck', 'Terminal Zero Sampling', 195, 'normalized-weights', 'Add two classical tickets to each integer ending in 0. Every integer starts with sixteen.', luck(0, 2)],
    ['decimal-three-luck', 'Terminal Three Sampling', 218, 'normalized-weights', 'Add three classical tickets to each integer ending in 3.', luck(3, 3)],
    ['decimal-seven-luck', 'Terminal Seven Sampling', 245, 'normalized-weights', 'Add three classical tickets to each integer ending in 7.', luck(7, 3)],
    ['zero-weight-calibration', 'Zero Weight Calibration', 500, 'decimal-zero-luck', 'Add two more classical tickets per rank to each number ending in 0.', luck(0, 2), { max: 3 }],
    ['three-weight-calibration', 'Three Weight Calibration', 525, 'decimal-three-luck', 'Add two more classical tickets per rank to each number ending in 3.', luck(3, 2), { max: 3 }],
    ['seven-weight-calibration', 'Seven Weight Calibration', 565, 'decimal-seven-luck', 'Add two more classical tickets per rank to each number ending in 7.', luck(7, 2), { max: 3 }],
    ['symmetric-tail', 'Symmetric Terminal Pair', 420, 'distribution', 'Add three classical tickets each to terminal digits 1 and 9.', [luck(1, 3), luck(9, 3)]],
    ['even-tail', 'Even Terminal Pair', 455, 'distribution', 'Add three classical tickets each to terminal digits 2 and 8.', [luck(2, 3), luck(8, 3)]],
    ['mirror-sampling', 'Mirror Sampling', 730, all(node('symmetric-tail'), node('decimal-endpoints')), 'Add 3 EP for a Matching Ends badge and one classical ticket each for terminal digits 1, 5, and 9.', [reward('endpoints', 3), luck(1, 1), luck(5, 1), luck(9, 1)], converge],
    ['joint-sampling', 'Joint Sampling', 864, all(node('even-tail'), node('octal-divisibility')), 'Add a classical ticket for terminal digits 0, 4 and 6. Add 2 EP when Octal Multiple and Triple match.', [luck(0, 1), luck(4, 1), luck(6, 1), pair('eight', 'three', 2)], converge],
    ['rare-event-incentive', 'Rare Event Incentive', 590, 'variance', '+2 EP for palindromes and +12 EP for Constant Echo.', [reward('palindrome', 2), reward('constant', 12)]],
    ['competing-tails', 'Competing Tails', 1250, countOf(2, 'mirror-sampling', 'joint-sampling', 'seven-weight-calibration'), 'Increase the weight of every unlocked nonclassical integer band by one point and add two classical tickets for terminal digit 7.', [{ kind: 'anomaly', amount: 1 }, luck(7, 2)], key],
  ]),
  // 18 new
  ...cluster(0, classicalClusters[4], 8, [
    ['discovery-ledger', 'Discovery Ledger', 29, 'yield', 'Show counts of individual observed badges in Collection.', feature('badge-ledger'), foundation],
    ['rolling-register', 'Rolling Register', 68, 'discovery-ledger', 'Retain 15 additional recent rolls.', capacity('recent', 15)],
    ['badge-index', 'Badge Index', 98, 'discovery-ledger', 'Filter collection records by a discovered badge.', feature('badge-filter')],
    ['source-index', 'Generator Index', 135, 'badge-index', 'Filter collection records by their generator band.', feature('source-filter')],
    ['source-census', 'Generator Census', 178, 'source-index', 'Show recorded roll counts by generator in Statistics.', feature('source-ledger')],
    ['first-observations', 'First Observations', 162, 'discovery-ledger', 'Display the first recorded roll index for each observed badge.', feature('first-discovery')],
    ['archive-lookup', 'Archive Lookup', 210, 'rolling-register', 'Search retained records by roll index or rendered notation.', feature('record-search')],
    ['rarity-dossier', 'Rarity Dossier', 230, 'rolling-register', 'Keep six more entries in the rarity records.', capacity('rarest', 6)],
    ['reward-dossier', 'Reward Dossier', 260, 'rolling-register', 'Keep six more entries in the highest-EP records.', capacity('highest', 6)],
    ['magnitude-dossier', 'Magnitude Dossier', 290, 'rolling-register', 'Keep six more entries in the largest proven integer records.', capacity('largest', 6)],
    ['longitudinal-sampling', 'Longitudinal Sampling', 320, 'archive-lookup', 'Retain 10 more recent rolls per rank.', capacity('recent', 10), { max: 3 }],
    ['mirrors-in-catalog', 'Mirrors in the Catalog', 390, all(node('first-observations'), found('palindrome', 2)), 'After recording two palindromes, retain eight more rarity records and earn 2 additional EP per palindrome.', [capacity('rarest', 8), reward('palindrome', 2)], challenge],
    ['scored-observations', 'Scored Observations', 450, all(node('reward-dossier'), node('prime-premium')), 'Keep ten more highest-EP rolls and earn 2 extra EP on Squarefree.', [capacity('highest', 10), reward('squareFree', 2)]],
    ['extreme-observations', 'Extreme Observations', 500, all(node('magnitude-dossier'), node('horizon')), 'Retain twelve more exact integer records.', capacity('largest', 12)],
    ['generational-sampling', 'Generational Sampling', 530, all(node('source-census'), node('normalized-weights')), 'Retain twenty more recent rolls and earn 1 additional EP from the expanded generator when it unlocks.', [capacity('recent', 20), sourceEP('expanded', 1)], converge],
    ['pattern-indexing', 'Pattern Indexing', 610, all(node('badge-index'), node('repeated-motifs-proof')), 'Extend the rarity archive by ten entries. Earn 3 additional EP on Echoing Pair.', [capacity('rarest', 10), reward('repeatedPair', 3)], converge],
    ['record-crosscheck', 'Record Crosscheck', 700, countOf(2, 'rarity-dossier', 'reward-dossier', 'magnitude-dossier'), 'Retain fifteen more recent rolls and four more entries in each ranked collection.', [capacity('recent', 15), capacity('rarest', 4), capacity('highest', 4), capacity('largest', 4)], converge],
    ['classical-archive', 'Classical Archive', 1350, all(node('record-crosscheck'), node('archive-lookup'), node('first-observations')), 'Retain 35 more recent rolls and eight more entries in each ranked collection.', [capacity('recent', 35), capacity('rarest', 8), capacity('highest', 8), capacity('largest', 8)], key],
  ]),
  // 7 new + 9 original
  ...cluster(0, classicalClusters[5], 6, [
    ['decimal-analysis', 'Decimal Analysis', 72, 'measurement', 'Show decimal digit sums in the roll inspector and recognize Harshad numbers.', [feature('digit-sum'), property('harshad')], foundation],
    ['spectrum-of-divisors', 'Spectrum of Divisors', 185, 'fundamental-theorem', 'Show exact positive divisor counts and proper-divisor sums through ten million.', [feature('divisor-count'), feature('divisor-sum')]],
    ['radix-conversion', 'Radix Conversion', 123, 'measurement', 'Show binary and hexadecimal forms for proven integers.', feature('numeral-bases')],
    ['residue-inspection', 'Residue Inspection', 192, all(node('radix-conversion'), node('operators')), 'Show least nonnegative residues modulo 3, 7, 8, 11 and 13.', feature('residue-table')],
    ['decimal-inventory', 'Decimal Inventory', 259, 'decimal-analysis', 'Show a frequency table of the decimal digits and their reversal.', [feature('digit-inventory'), feature('decimal-reversal')]],
    ['lucas-analysis', 'Recurrence Identification', 290, all(node('bounds'), node('triangular-array')), 'Recognize Lucas numbers and show proven Fibonacci and Lucas indices in the inspector.', [property('lucas'), feature('sequence-indices')]],
    ['classical-bounds', 'Decimal Orders of Magnitude', 2150, 'verification', 'Show the decimal order interval for exact nonzero integers and recognize nontrivial automorphic numbers.', [feature('decimal-bounds'), property('automorphic')], key],
  ]),
  // 13 new + 5 original
  ...cluster(0, classicalClusters[6], 7, [
    ['arithmetic-of-digits', 'Arithmetic of Digits', 410, all(node('decimal-analysis'), node('operators')), 'Recognize self-dividing decimals with no zero digits.', property('polydigit'), converge],
    ['repeated-motifs-proof', 'Repeated Motifs in Practice', 354, all(node('pair-recurrence'), found('repeatedPair', 2)), 'After observing two Echoing Pairs, earn 2 extra EP on that badge and retain six more rarity records.', [reward('repeatedPair', 2), capacity('rarest', 6)], challenge],
    ['coprime-evidence', 'Coprime Evidence', 445, all(node('wheel-factorization'), node('prime-decomposition')), '+2 EP for a semiprime whose prime factors are coprime to 30.', pair('semiprime', 'coprimeThirty', 2), converge],
    ['triangular-squares', 'Triangular Squares', 750, all(node('triangular-array'), node('square-stipend')), '+10 EP for an integer that is both a square and a triangular number.', pair('triangular', 'square', 10), converge],
    ['parallel-sequences', 'Parallel Recurrences', 690, all(node('lucas-analysis'), node('sequence-fellowship')), '+6 EP for expressions whose integer value appears in both the Fibonacci and Lucas sequences.', pair('fibonacci', 'lucas', 6), converge],
    ['distribution-audit', 'Distribution Audit', 1300, all(node('odds'), node('decimal-analysis')), '+1 EP when Triple and Harshad both match.', pair('three', 'harshad', 1), converge],
    ['classical-synthesis', 'Classical Synthesis', 9700, all(node('synthesis'), node('classical-review'), node('fundamental-theorem'), node('pattern-synthesis'), node('classical-endowment'), countOf(1, 'classical-bounds', 'distribution-audit')), 'Increase the EP bonus on manual rolls by 14% of base EP. Complete the final prerequisite for Beyond a Million.', ep(1400), key],
    ['landmark-exhibition', 'Landmark Exhibition', 1150, all(node('parallel-sequences'), found('fibonacci', 1)), 'After a documented Fibonacci discovery, earn 8 extra EP for Fibonacci and 6 for Lucas numbers.', [reward('fibonacci', 8), reward('lucas', 6)], challenge],
    ['metrical-digit-synthesis', 'Metrical Digit Synthesis', 810, all(node('arithmetic-of-digits'), node('balanced-blocks')), '+5 EP when Self-Dividing and Balanced Halves both match.', pair('polydigit', 'balanced', 5), converge],
    ['factor-and-form', 'Factor and Form', 920, all(node('coprime-evidence'), node('pattern-synthesis'), node('squarefree-sieve')), '+4 EP when Squarefree and Echoing Pair both match.', pair('squareFree', 'repeatedPair', 4), converge],
    ['joint-observatory', 'Joint Observatory', 1040, all(node('distribution-audit'), node('record-crosscheck')), 'Keep twelve more recent rolls and reduce new Discovery purchases by 5%.', [capacity('recent', 12), discount(500, 8)], converge],
    ['symmetry-and-remainders', 'Symmetry and Remainders', 1020, all(node('reverse-modulus'), node('residue-inspection')), '+4 EP when a Reversible Seven is also a multiple of thirteen. Unlock the Thirteens badge.', [property('thirteen'), pair('reverseMultiple', 'thirteen', 4)], converge],
    ['classical-fellowship', 'Classical Fellowship', 1620, all(node('classical-synthesis'), countOf(2, 'joint-observatory', 'factor-and-form', 'symmetry-and-remainders', 'metrical-digit-synthesis')), 'Reduce the cost of new research by 2% and boost base EP by 6%.', [discount(200), ep(600)], key],
  ]),
]
