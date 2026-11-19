# gRNGdle

A manual RNG collection game about the mathematics of large numbers. Start with a uniform integer from **0 through 1,000,000**, discover mathematical properties, and spend Expression Points (EP) on research. The playable atlas contains **264 studies across nine disciplines and eight eras**, including the full **140-study Classical Era**.

## Play on GitHub Pages

Open [gRNGdle](https://edhuff.github.io/grngdle.github.io/). Click **Roll** or press **Space** for one draw. Research spends earned EP and changes what future manual rolls can produce. Collection and Statistics can display additional analyses, observations, and records as you research them.

In Research, drag to pan or scroll to zoom around the pointer. **Eras** opens the global view. The map starts with Yield Calibration and reveals the immediate successors of purchased studies within open eras. Selecting a study opens its details in place. Use **Show on map** to locate a study outside the current view. Search covers revealed studies and can filter by discipline, affordability, and bookmarks. Major breakthroughs and doctrine refunds ask for confirmation.

GitHub Pages serves the static site from the root of `main`. Run `npm run build:pages` and commit the generated `index.html` and `pages-assets/` with source changes. Make HTML edits in `src/index.html`. Browser saves are scoped to the site origin, and Settings supports export, import, and reset.

## Develop locally

Use Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the address Vite prints. `npm run build` produces a static site in `dist/`. `npm run preview` serves it locally. Assets also resolve at the GitHub Pages project path.

## Playable progression

- **Classical Era.** Seven clusters cover number theory, digit patterns, economics, probability, discovery, analysis, and convergence. The gateway dependency map has 43 study candidates before the breakthrough, with alternate final reviews. Beyond a Million initially opens a band from 1,000,001 through 10,000,000 at 13% weight along the direct route.
- **Later eras.** Research widens the integer range and opens exact arithmetic, powers, towers, tetration, hyperoperations, Conway chains, ordinal-indexed hierarchies, Busy Beaver, and Ackermann–Péter. Later clusters add sample weights, operand and structure limits, inspection tools, and EP effects.
- **Doctrines.** Magnitude, Rarity, and Economy each have 20 studies. One doctrine can be active at a time. Refunds return the prices actually paid for affected doctrine studies, including discounts. Permanent mathematical research and recorded discoveries survive a change.
- **Saves.** Schema 6 records exact EP payments, observed badge and generator counts, and bookmarks. Earlier saves retain purchased mathematical studies and recorded history. Players who already had the old expansion keep its through-one-trillion range. Where earlier saves did not track specific observations, their new counters start with the retained rolls.

See [MATHEMATICS.md](MATHEMATICS.md) for mathematical conventions and computational limits and [ROADMAP.md](ROADMAP.md) for exact era counts, simulation results, and remaining work.

## Architecture

| Module | Responsibility |
| --- | --- |
| `src/game/research.ts` and `src/game/research/` | Authored studies, AND/OR/count and discovery or EP prerequisites, doctrine exclusivity, rank prices, and effect folding |
| `src/game/math/` and `src/game/generation/` | Symbolic ASTs, bounded evaluation and comparisons, configured sampling, exact probabilities, and replay |
| `src/game/attributes.ts`, `research-properties.ts`, and `economy.ts` | Integer and structural badges, conditional Classical badge odds, and manual-roll payouts |
| `src/game/game.ts` and `save.ts` | Purchases and refunds, research payments, roll records, migrations, and validation |
| `src/ui/` | Full-field viewport-culled atlas, roll chamber, collections, mathematical inspection, and statistics |

The atlas derives node positions from prerequisite depth and cluster membership. Clusters and rank completion are derived from persisted purchases. Add effects to the discriminated union in `src/game/research/model.ts` and apply them through the existing rule systems. A study with a declared unavailable capability has a disabled purchase state.

## Tests and developer lab

```bash
npm test
npm run validate:generation
npm run balance -- 250000 9 7.5 3
npm run dev:lab -- --port 5174
npm run test:browser -- http://localhost:5173 http://localhost:5174
```

The balance arguments are base samples, Classical trials, active seconds per manual roll, and trials continuing after Classical. The lab lowers prices and discovery requirements, uses an isolated save, and still requires one action per roll. Offline simulations are command-line tools. Use `npm run measure:badges` to regenerate exact Classical reference frequencies after changing a badge predicate. Set `CHROMIUM_PATH` if Chromium lives outside `/usr/bin/chromium`.
