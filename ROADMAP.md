# Roadmap

## Done (v0.1)
- Component library, built-in + custom templates, styles with multiple photos
- Live costing: wastage, labor, overhead, freight/duty → landed cost → wholesale/retail with rounding and overrides
- Cost sheet PDF and line sheet PDF (2-up / 3-up / list, brand, logo, terms)
- Offline PWA, IndexedDB storage, JSON export/import (merge/replace)
- Unit tests (pricing, backup) and an offline Playwright e2e test
- Metric/imperial setting (default metric) with library conversion; ZAR default; +/- steppers for per-piece quantities
- Orders with per-size/colour quantities, invoice / pro forma / confirmation PDFs with bank & company details
- Excel order sheet export (photos, formulas) and import of filled-in sheets; printable order form in line sheet PDF
- In-app Help & guides with generated screenshots (`npm run screenshots`), contextual ? links on every page
- Deployed to GitHub Pages: https://garykahn.github.io/costsheet/ (auto-deploys on push to main)

## Next steps
1. **Real-device pass**: test on an iPhone (Safari) and an Android phone: camera upload, share sheet, install, offline,
   and open an exported order sheet in Google Sheets / Numbers / Excel on a phone
2. **Workshop sample data**: an optional "Load example collection" button so participants see a filled-in line sheet first
3. **Per-size costing**: fabric yield varies by size; allow a consumption per size, or a size-range average
4. **Colorway-level pricing/photos**: line sheets often show swatches per colorway
5. **CSV export** of styles and prices for spreadsheets
6. **Multi-currency sourcing**: components bought in another currency with an exchange rate
7. **Size measurements on order sheets** (chest/length per size, like the AZXLIM sheet)
8. **Customer address book** (currently re-uses details from previous orders)
