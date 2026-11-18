# gRNGdle

A browser-based, manual RNG collection game about the mathematics of large numbers. The prototype starts with a uniform roll from **0 through 1,000,000**. Find mathematical attributes, earn Expression Points (EP), and spend them on research. The opening contains **44 studies across nine disciplines**, with a 37-study dependency network around the first expansion.

## Play on GitHub Pages

Open [gRNGdle](https://edhuff.github.io/grngdle.github.io/). GitHub Pages serves the static site from the root of `main`.

Before pushing changes to the site, run `npm run build:pages` and commit the generated root `index.html` and `pages-assets/` folder along with the source changes. Edit the HTML template in `src/index.html`. GitHub Pages publishes the committed site after the push.

To carry over local progress, export your save in Settings on the local site and import it on GitHub Pages. Browser saves are scoped to the site origin.

## Develop locally

Use Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the address Vite prints, usually `http://localhost:5173`. Use **Roll** for one draw and **Research** to spend EP. On the map, drag to pan, scroll to zoom, or use the zoom controls and discipline picker. Collection stores notable results, and Settings manages animations and local save import, export, and reset.

`npm run build` produces a static site in `dist/`. `npm run preview` serves it locally. Relative asset paths work at the GitHub Pages project URL.

## Playable progression

- **Classical Era** — Uniform integers, number-theory and digit-pattern badges, research bonuses, and archive tools.
- **Numerical Expansion** — Research opens separate integer bands through one trillion and then through 10²⁴. The Classical band remains available.
- **Extended Arithmetic** — Research adds ordered sums, products, and depth-two expressions. Later specializations trade off operand size, distribution weights, and EP. Each specialization can be refunded in full.
- **Rarity** — The rarity tier uses the exact probability of the generated integer or ordered expression. Classical integers have identical odds, so unusual Classical discoveries show up in their badge combinations and EP rewards. Badge frequencies use the Classical sample space. Symbolic odds describe the ordered expression, since distinct expressions can evaluate to the same number.

## Architecture

| Module | Responsibility |
| --- | --- |
| `src/game/math.ts` and `generator.ts` | BigInt fractions, expression ASTs, notation, bounded exact evaluation, and uniform sampling with injectable random words |
| `src/game/attributes.ts` and `economy.ts` | Integer and expression rules, badge probabilities, and research-modified EP |
| `src/game/research.ts` | Declarative studies, validated dependency graphs, rank costs, unlocks, and milestones |
| `src/game/game.ts` and `save.ts` | Immutable game transitions, discovery records, schema validation, migrations, and browser storage |
| `src/ui/` | Roll chamber, interactive research graph, records, statistics, and settings |

## Testing and balance

```bash
npm test
npm run balance
npm run dev:lab -- --port 5174
```

The developer server lowers research costs and milestone requirements. It uses a separate save and still requires a manual action for each roll. The seeded balance simulator runs from the command line and is excluded from the browser app.

With the regular server running, run `npm run test:browser` for a Chromium smoke test. Set `CHROMIUM_PATH` to use a Chromium executable outside `/usr/bin/chromium`. Pass the regular and developer server addresses to also test both mathematical unlocks in the browser.

```bash
npm run test:browser -- http://localhost:5173 http://localhost:5174
```

The default simulation sampled 250,000 base draws and ran eight progression trials. Base yield was **2.498 EP per roll**. At an assumed **7.5 active seconds per roll**, the median was **4,800 rolls (10.0 h)** for the first expansion and **15,000 rolls (31.3 h)** for symbolic arithmetic. These estimates depend on purchase order and manual play cadence.

See [ROADMAP.md](ROADMAP.md) for the 1,100-study plan.
