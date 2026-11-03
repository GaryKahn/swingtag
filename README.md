# Costsheet

**Live:** https://garykahn.github.io/costsheet/

Garment costing and line sheets for independent designers. Mobile-first and installable, and works fully offline.
There is no login: all data stays in the browser (IndexedDB), and a JSON backup file moves it between devices.

- **Components**: a library of fabrics, trims, labels, packaging and labor with unit costs
- **Templates**: built-in garment types (T-shirt, button-up shirt, trousers, skirt, dress, hoodie, jacket, tote) plus your own
- **Styles**: cost a garment from a template, add photos, and get wholesale (from a target margin) and retail (from a multiplier) prices, with rounding and per-style overrides
- **PDFs**: an internal cost sheet per style and a wholesale line sheet (2-up, 3-up or list) with your brand and order terms
- **Backup**: Settings → Export / Import (merge or replace)

## Develop

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (pricing math, backup round-trip)
npm run build && npx playwright test   # offline end-to-end test against the production build
```

`node scripts/icons.mjs` regenerates the PWA PNG icons from `public/icons/icon.svg`.

## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`, which tests, builds and deploys to GitHub Pages.

`npm run build` produces a static `dist/` folder with relative paths (`base: './'`) and hash routing, so it runs from any
static host or subpath: GitHub Pages, Cloudflare Pages, Netlify, or plain S3. The host must serve over HTTPS for the
service worker (offline mode and install-to-home-screen) to work.

Participants open the URL once while online. After that it works offline and can be added to the home screen
(iOS: Share → Add to Home Screen).

## Notes

- Pricing: `wholesale = landed cost ÷ (1 − margin)`, `retail = wholesale × multiplier`, both rounded *up* to the
  chosen price point. Wastage applies only to fabric and trims. See `src/lib/pricing.ts`.
- Photos are resized to 1600px JPEGs (plus a 400px thumbnail) before they're stored.
- Safari can evict site data after weeks of no use unless the app is installed to the home screen. The app requests
  persistent storage and shows "last backup" in Settings as a nudge.
