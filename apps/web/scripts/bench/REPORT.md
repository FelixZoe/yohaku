# next-rspack vs Turbopack — Bench Report & splitChunks Finding

A side-by-side benchmark of `next-rspack@16.2.4` and Turbopack (built into Next.js 16.2.4) on a real-world Next.js 16 app, run as input for [Discussions #77800 — Rspack plugin feedback](https://github.com/vercel/next.js/discussions/77800). Includes a root-cause for a 30 MB vendor chunk on the rspack side and three iterative fixes.

## Environment (`next info`)

```
Operating System:
  Platform: darwin
  Arch: arm64
  Version: Darwin 25.4.0 (arm64, 128 GB RAM, 16 cores)
Binaries:
  Node: v24.14.0
  pnpm: 10.27.0
Relevant Packages:
  next: 16.2.4 (latest stable is 16.2.6 at time of test)
  next-rspack: 16.2.4
  react: 19.2.5
  react-dom: 19.2.5
  typescript: 6.0.3
Next.js Config:
  output: standalone
```

App: `@yohaku/web`, a Next.js 16 App Router blog. Heavy deps include `@haklex/rich-editor` (Lexical-based), `@excalidraw/excalidraw`, `mermaid`, `shiki`, `katex`, `@base-ui/react`, `motion`, `socket.io-client`. ~50+ routes across `[locale]`.

## Methodology

Both bundlers run against the **same baseline config** (`next.config.mjs`) gated on `BENCH_BUNDLER=rspack|turbopack`:

- `rspack`: env presets `NEXT_RSPACK=true`; `withRspack` wraps the config.
- `turbopack`: env clears `NEXT_RSPACK`; config exports unwrapped (Turbopack is the Next.js 16 default).

Two webpack-only features (`code-inspector-plugin`, `.svg → asset/source` rule) are skipped on both sides for fairness — Turbopack does not consume them.

### Dev bench

1. Spawn `next dev -p 23230`, parse `Ready in …`.
2. Sequentially fetch 10 warm-up routes: `/`, `/posts`, `/notes`, `/timeline`, `/search`, `/friends`, `/categories`, `/projects`, `/says`, `/thinking`.
3. Idle 30 s for GC stabilization.
4. Sample RSS of the next-dev process tree.

### Prod bench

3 cold builds (`rimraf .next` before each), mean reported. Wall clock is measured around `next build`; "reported" is the `Compiled successfully in …` Next.js prints. Bundle metrics from `du -sk` on `.next/static`, `.next/server`, `.next/standalone`; chunk count via `find .next/static/chunks -type f`.

Scripts: `scripts/bench/{dev,prod,lib}.mjs`. Raw JSON in `scripts/bench/results/`.

## Part 1 — Baseline numbers (rspack default vs Turbopack)

### DEV — memory after warm-up

| Metric                            | rspack  | turbopack | Δ                       |
| --------------------------------- | ------- | --------- | ----------------------- |
| RSS total (MB, post-warmup +30 s) | **6 454** | **13 487**  | **Turbopack +109 %**    |
| Process count                     | 2       | 7         | +5 PostCSS workers      |

Turbopack spawns 5 separate PostCSS worker processes (~310–500 MB each) in addition to its main Rust worker; rspack does PostCSS in-process.

### DEV — first-hit fetch latency

| Route       | rspack (ms) | turbopack (ms) |
| ----------- | ----------- | -------------- |
| Ready       | **232**     | **153**        |
| `/` (cold cascade) | 15 830 | 13 121        |
| `/posts`    | 2 099       | 2 774          |
| `/notes`    | 2 228       | 3 942          |
| `/timeline` | 1 670       | 2 476          |
| `/search`   | 1 877       | 2 137          |
| `/friends`  | 1 998       | 2 443          |
| `/categories` | 2 242     | 3 572          |
| `/projects` | 2 185       | 2 366          |
| `/says`     | 2 332       | 2 338          |
| `/thinking` | 2 623       | 2 966          |
| **mean ex. `/`** | **2 139** | **2 779**     |

Turbopack reaches **Ready** faster (153 ms vs 232 ms) and compiles the first heavy cascade (`/`) faster (~17 %), but per-route compile averages ~30 % slower than rspack across the next 9 routes in this project.

### PROD — bundle size

| Artifact (KB)             | rspack    | turbopack | Δ                       |
| ------------------------- | --------- | --------- | ----------------------- |
| `.next/static` (client)   | 46 348    | 53 152    | +15 % (Turbopack)       |
| `.next/server`            | **35 768** | **114 956** | **+222 %** (Turbopack)  |
| `.next/standalone`        | 406 200   | 266 128   | −34 % (Turbopack smaller) |
| `.next` total             | 1 345 992 | 435 564   | −68 % (Turbopack smaller; rspack `.next/cache` is large) |

`.next/server` is the headline gap on the prod side: Turbopack ships ~3.2× more server-side bytes. Possible cause: `experimental.serverMinification: true` either no-ops or applies differently under Turbopack; Turbopack also keeps unbundled vendor chunks in `server/`.

### PROD — chunk count and shape

| Metric                          | rspack    | turbopack | Δ        |
| ------------------------------- | --------- | --------- | -------- |
| Files in `.next/static/chunks`  | **123**   | **904**   | 7.5×     |
| Of which `.js`                  | 123       | 904       | 7.5×     |
| Max single chunk                | **30 516 KB** (`lib-*.js`) | **1 780 KB** | rspack 17× bigger |
| Median chunk size               | 8 KB      | 20 KB     | —        |
| Total bytes (client chunks)     | 33 088 KB | 39 824 KB | +20 %    |

The numbers are alarming: rspack ships **one 30 MB `lib-*.js` chunk**. Total client bytes are only +20 % on the Turbopack side, so this is a **chunking shape issue, not a duplicate-bundling issue**.

### PROD — compile time

3 cold-build runs, `.next` removed before every run:

| Metric                  | rspack       | turbopack    |
| ----------------------- | ------------ | ------------ |
| Wall clock mean (s)     | **30.0**     | **12.7**     |
| Wall clock min / max    | 28.6 / 31.1  | 11.4 / 13.5  |
| "Compiled in" mean (s)  | 17.0         | 10.8         |

Turbopack is **~2.4× faster** end-to-end on production build (12.7 s vs 30.0 s).

## Part 2 — Root cause of the 30 MB vendor chunk

Adding `if (process.env.DUMP_SPLIT === '1')` to the webpack hook and dumping `config.optimization.splitChunks` on rspack:

```
=== DUMP splitChunks (next-rspack@16.2.4) ===
keys: [ 'filename', 'chunks', 'minChunks' ]
cacheGroups keys: []
=== END DUMP ===
```

**`cacheGroups` is an empty object on the rspack build pipeline.** Next.js's webpack pipeline normally injects `framework`, `lib`, `commons`, `shared`, etc. — none of those are present under `next-rspack`. Without a `lib` cacheGroup (which under webpack groups large vendor modules by `module.libIdent` hash), every ≥160 KB vendor module fell back into the default entry chunk. That is the 30 516 KB `lib-*.js`.

Turbopack is unaffected because it does not use `SplitChunksPlugin` at all — it slices the module graph internally.

This looks like the core issue worth flagging upstream: **`next-rspack` does not propagate Next.js's default `splitChunks.cacheGroups` configuration**. Anyone with a non-trivial vendor surface hits the symptom.

## Part 3 — Three iterative fixes

We tried three workarounds in `next.config.mjs`'s `webpack(config)` hook on the rspack side. All cacheGroup edits are gated to the client compiler (`config.name !== 'server' && config.name !== 'edge-server'`).

### Attempt A — Edit `splitChunks.cacheGroups.lib.name` to a hashed function

```js
const lib = config.optimization?.splitChunks?.cacheGroups?.lib
if (lib) {
  lib.name = (module) => 'lib-' + sha1(module.identifier()).slice(0, 8)
}
```

**Result: no-op.** `cacheGroups.lib` is `undefined` (Part 2 finding), so the conditional was never entered. The build remained identical to baseline.

### Attempt B — Inject explicit cacheGroups with function `test` and `name`

```js
cacheGroups: {
  framework: { test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/, name: 'framework', priority: 40, enforce: true, chunks: 'all' },
  lib: {
    test(module) { return module.size?.() > 160_000 && /[\\/]node_modules[\\/]/.test(module.identifier?.() || '') },
    name(module) { return 'lib-' + sha1(module.identifier()).slice(0, 8) },
    priority: 30, minChunks: 1, reuseExistingChunk: true, chunks: 'all',
  },
  commons: { name: 'commons', minChunks: 2, priority: 20, chunks: 'all', reuseExistingChunk: true },
}
```

**Result: works, but slow.** Chunks: 750. Max chunk: **5 948 KB** (`commons-*.js`). The 30 MB chunk is gone — but the `test`/`name` callbacks are JS functions, which the Rust-side splitter must invoke `O(N_modules × N_chunks_per_module)` times. This adds non-trivial build overhead and is a footgun for anyone copying this pattern.

### Attempt C — Static config that matches rspack's own defaults + `maxSize`

```js
config.optimization.splitChunks = {
  chunks: 'all',
  minSize: 20_000,
  maxSize: 244_000,
  cacheGroups: {
    default:        { minChunks: 2, priority: -20, reuseExistingChunk: true },
    defaultVendors: { test: /[\\/]node_modules[\\/]/, priority: -10, reuseExistingChunk: true },
  },
}
```

No JS callbacks. `maxSize: 244_000` (Next.js's `performance.maxAssetSize` default) forces any chunk beyond 244 KB to be split.

**Result: works, no callback cost, output matches Turbopack's shape.**

### Side-by-side after fix attempts

| Metric                       | rspack baseline | rspack B (functions) | **rspack C (defaults + maxSize)** | Turbopack |
| ---------------------------- | --------------- | -------------------- | --------------------------------- | --------- |
| chunk count                  | 123             | 750                  | **1 003**                         | 904       |
| total client chunk size (KB) | 33 088          | 33 268               | **34 792**                        | 39 824    |
| **max single chunk (KB)**    | **30 516**      | **5 948**            | **1 780**                         | **1 780** |
| median chunk size (KB)       | 8               | 12                   | 16                                | 20        |
| .next/static (KB)            | 46 348          | 46 524               | 48 056                            | 53 152    |
| .next/server (KB)            | 35 768          | 35 540               | 39 692                            | 114 956   |
| prod build wall mean (s)     | 30.0            | ~30 (steady)         | **37.7**                          | 12.7      |

C plan brings the max chunk down to **1 780 KB — exactly equal to Turbopack's max** — at the cost of ~25 % longer build time (37.7 s vs 30.0 s baseline). The extra time comes from `maxSize`-driven splitting + chunk metadata overhead, not callback evaluation.

Run-by-run for C: `40.2 s / 33.2 s / 39.6 s`. Reported "Compiled in": `27.3 s / 19.9 s / 26.4 s`.

## Summary table

| Dimension                  | Winner             | Margin                |
| -------------------------- | ------------------ | --------------------- |
| DEV ready                  | Turbopack          | 1.5×                  |
| DEV memory                 | **rspack**         | **2.1× less**         |
| DEV per-route compile      | rspack             | 1.3× faster mean      |
| DEV first-cascade          | Turbopack          | 1.2× faster           |
| PROD build time            | **Turbopack**      | **2.4× faster**       |
| PROD client total          | rspack             | 13 % smaller          |
| PROD server total          | **rspack**         | **3.2× smaller**      |
| **PROD max chunk** (default)  | Turbopack       | **17× smaller**       |
| PROD max chunk (rspack + C)   | tie             | identical (1 780 KB)  |
| PROD chunk count           | depends on policy  | Turbopack 7.5× more (default) |

## Asks for the rspack plugin team

1. **Propagate Next.js's default `splitChunks.cacheGroups` into the next-rspack pipeline.** The current empty `cacheGroups: {}` on rspack causes 30 MB+ single-chunk regressions for any project with a substantial vendor surface, with no warning. Either inject the same `framework`/`lib`/`commons`/`shared`/`css-loader-import` groups webpack mode has, or document the difference prominently.
2. **Consider whether `maxSize` should default to a non-zero value on next-rspack** (mirroring `performance.maxAssetSize` ~244 KB), so users don't need to hand-tune it to avoid the 30 MB-chunk symptom.
3. **Performance note**: function-valued `cacheGroups.test` / `cacheGroups.name` cost the Rust splitter `O(modules × chunks)` JS callbacks. Worth warning in docs; users will reach for that pattern when porting webpack configs.

## Caveats

1. Webpack-only plugins (`code-inspector-plugin`, `.svg → asset/source`) disabled both sides for fairness.
2. `.next/server` size gap may not reflect runtime cold-start — not measured here.
3. `experimental.optimizePackageImports` set both sides; effectiveness in Turbopack is undocumented for several packages.
4. Single-run dev memory sample. Turbopack memory has been observed to climb over long sessions.
5. First Turbopack build in the prod 3-run errored on `next/font/google` virtual CSS resolution (`Module not found: [next]/internal/font/google/*.module.css`); next attempt and all subsequent succeeded. Appears to be a cold-start flake worth tracking.
6. Tested on `next@16.2.4` / `next-rspack@16.2.4`. Latest stable is `16.2.6` at time of writing — retest on canary recommended.

## Reproduce

```bash
# dev
node scripts/bench/dev.mjs rspack
node scripts/bench/dev.mjs turbopack

# prod (n cold runs)
node scripts/bench/prod.mjs rspack 3
node scripts/bench/prod.mjs turbopack 3

# dump rspack's splitChunks config (after temp instrumentation in next.config.mjs)
DUMP_SPLIT=1 BENCH_BUNDLER=rspack NEXT_RSPACK=true next build
```

## Final `next.config.mjs` snippet (rspack splitChunks fix)

```js
webpack: (config) => {
  // ... your other webpack tweaks ...

  if (config.optimization?.splitChunks) {
    const isClient = config.name !== 'server' && config.name !== 'edge-server'
    if (isClient) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20_000,
        maxSize: 244_000,
        cacheGroups: {
          default:        { minChunks: 2, priority: -20, reuseExistingChunk: true },
          defaultVendors: { test: /[\\/]node_modules[\\/]/, priority: -10, reuseExistingChunk: true },
        },
      }
    }
  }

  return config
}
```

This is webpack-compatible — same file works for both `next-rspack` and webpack mode.
