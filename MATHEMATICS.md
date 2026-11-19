# Mathematical generation engine

Every game roll is a single manual action. The browser uses cryptographic 32-bit words and unbiased rejection sampling. Tests and the offline simulator can inject seeded words. Research adds bands to the pool while retaining positive weight for earlier bands.

## Generation and research

| Research | Added outcomes |
| --- | --- |
| Starting pool | Each integer from 0 through 1,000,000 with equal probability |
| Terminal sampling studies | Extra tickets for selected final digits within the Classical band |
| Beyond a Million and Extended Decimal Ranges | An uncommon uniform band from 1,000,001 through 10,000,000, extendable to 10¹² |
| Arbitrary Precision | A second disjoint uniform band from above the current expanded upper bound through 10²⁴ |
| Expression Grammar and Nested Arithmetic | Ordered sums and products, then depth-two combinations of them |
| Exact Operations | Signed differences, rational quotients with nonzero denominators, and factorials |
| Long Integers and Digit Spectrum | Decimal strings starting at 26 digits. Length is uniform over the unlocked range, leading digits are uniform from 1 to 9, and later zero digits can receive extra weight |
| Exponentiation and Tower Operands | Simple and right-nested powers with configurable operand bounds and depth |
| Power Towers | Variable-height right-associated towers and tetration |
| Hyperoperations and Arrow Spectrum | Pentation, hexation, and higher finite ranks, plus Knuth up-arrows with BigInt arrow counts. Each Arrow Spectrum rank extends the count range by three decimal orders |
| Conway Chained Arrows | Variable-length chains of positive integers and chains with a nested positive chain |
| Ordinal Hierarchy | Finite and transfinite indices for the fast-growing hierarchy below ε₀ |
| Extreme Googology | The steps and ones versions of Busy Beaver, plus Ackermann–Péter functions |

The vast band includes 10²⁴. The weighted length band starts at 10²⁵, so the intervals and digit grammar have no overlapping integer outcomes. Bands define their own weight, operand bounds, and structural limits. Ranked products and disjoint syntax variants make exactly enumerated grammar sizes possible. More complex grammars can be added through the band registry without changing save mechanics or the research UI.

## Conventions and supported analysis

- **Arithmetic and towers.** Quotients are reduced signed rationals. Factorials use natural inputs, with 0! = 1. Powers have natural exponents, and 0⁰ is outside the evaluator's domain. A power tower associates to the right.
- **Hyperoperations.** H₀(a,b) = b+1, H₁ is addition, H₂ multiplication, and H₃ exponentiation. For r ≥ 4, Hᵣ(a,0) = 1 and Hᵣ(a,b+1) = Hᵣ₋₁(a,Hᵣ(a,b)). Generation uses bases a ≥ 2. Knuth's a ↑ᵏ b for positive k and b is Hₖ₊₂(a,b). The display writes arbitrary finite counts as `↑^{k}`.
- **Conway chains.** Positive chains use ordinary Conway chained arrows. A single entry is itself and a pair is a power. A 1 terminates the chain, so X → 1 → Y reduces to X. With nonempty X and p,q ≥ 2, X → p → q reduces to X → (X → (p−1) → q) → (q−1). A parenthesized chain in a generated term supplies a positive integer.
- **Ordinals and the hierarchy.** Indices use descending Cantor normal form below ε₀ with positive natural coefficients. The ordinal module supports comparison, addition, multiplication, and fundamental sequences. With the trailing ω-power split off, ω^(β+1)[n] = ω^β·(n+1), and ω^λ[n] = ω^(λ[n]) when λ is a limit. The hierarchy is F₀(n) = n+1, Fₐ₊₁(n) = Fₐ iterated n+1 times at n, and Fλ(n) = Fλ[n](n).
- **Extreme functions.** S(n) maximizes steps and Σ(n) maximizes final ones among halting deterministic two-symbol Turing machines with n working states on a blank tape and one separate halt state. The transition into halt counts as a step and may write a symbol. The evaluator includes tabulated exact values for n = 1 through 4. Larger n remain symbolic in this implementation, even when additional exact results are known externally. Ackermann–Péter uses A(0,n) = n+1, A(m+1,0) = A(m,1), and A(m+1,n+1) = A(m,A(m+1,n)).

Exact evaluation has a 1,024-bit result limit and separate operation and recursion budgets. Large hyperoperations, Conway chains, hierarchy terms, and Ackermann expressions often exceed them. The engine generates and renders those expressions symbolically, simplifies exact or safe identity cases, and derives lower bounds when justified. It can prove exact comparisons, equality of identical valid natural expressions, and comparisons where a certified lower bound exceeds an exact value. Other comparisons are unknown. The largest-integer collection ranks exact integers. Primality is certified by deterministic witnesses below 2⁶⁴, with some composite cases checked above that bound. Researched integer factorization and divisor statistics are exact for positive integers through 10,000,000. For amicability, both members must be within this factorization bound for the badge to be awarded.

## Probabilities, rarity, and saves

- **Exact expression odds** are band weight divided by total pool weight, multiplied by the conditional mass of that AST. Uniform grammars use exact counts of ordered ASTs. Weighted digit strings use the product of the actual digit masses and length mass. BigInt fractions retain the full ratio.
- **Equivalent-value odds** sum contributions from all active bands, accounting for distinct ASTs that evaluate to the same integer or rational. Range, digit, sum/product, difference, and quotient bands use closed counts. Small other bands are enumerated under a fixed budget. If a contribution remains unproved, the inspector shows unknown with a certified minimum.
- **EP rarity** uses the upper tail `P(total EP ≥ rolled EP)` under the research active at the time of the roll. It sums the payout distribution of every enabled generator weighted by that generator’s share of the pool. Equal payouts share odds and higher payouts have equal or lower odds within that setup. Uncommon starts at 10%, Rare at 1%, and Epic at 0.1%.
- **Payout distributions** use exact counts for the starting range, joined by badge combination and final digit so bonuses and terminal weights can be applied to the live research. Small domains are enumerated. The original expression generators have two equally likely payout cases determined by their root operator. Larger domains use 2,048 deterministic ticket samples apiece in a browser worker, with one extra observation placed in the upper tail to keep an unseen payout from appearing impossible. Such estimates have limited resolution at extreme rarities. Probability calculations leave the game’s rolls and currency untouched.
- **Roll events** provide additional context in Collection. They track events such as a matching badge in the Classical range, a chosen range, or an expression’s shape. Terminal sampling assigns sixteen base tickets to each Classical integer and extra tickets according to its final digit. Exact integer and badge odds account for every ticket.
- **EP** uses the original Classical rewards. Research adds badge payouts, pair bonuses, source bonuses and EP multipliers. The legacy sum/product grammars retain structural payouts, with integer-result badges shown as annotations. New expressions can award both structural and exact-integer badges. Structural measures use BigInt and scale by their decimal order for EP.
- **Historical records** store the generator version, exact expression and roll-event odds, generator configuration, replay ticket, and exact or estimated EP tail at the time of the roll. Imports replay v2 tickets to verify the AST and exact expression odds. Legacy records keep their payout and expression and appear as unrated because their full payout distribution was never stored. V1 records lack the configuration used for equivalent-value odds.

Run `npm test` for mathematical and integration tests. Run `npm run validate:generation` for the seeded offline frequency check. The browser exposes individual manual rolls.
