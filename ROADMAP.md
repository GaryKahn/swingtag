# Roadmap

## Done (v0.1)
- Component library, built-in + custom templates, styles with multiple photos
- Live costing: wastage, labor, overhead, freight/duty → landed cost → wholesale/retail with rounding and overrides
- Cost sheet PDF and line sheet PDF (2-up / 3-up / list, brand, logo, terms)
- Offline PWA, IndexedDB storage, JSON export/import (merge/replace)
- Unit tests (pricing, backup) and an offline Playwright e2e test

## Next steps
1. **Deploy**: pick a host (GitHub Pages or Cloudflare Pages) and share the URL with the workshop
2. **Real-device pass**: test on an iPhone (Safari) and an Android phone: camera upload, share sheet, install, offline
3. **Workshop sample data**: an optional "Load example collection" button so participants see a filled-in line sheet first
4. **Per-size costing**: fabric yield varies by size; allow a consumption per size, or a size-range average
5. **Colorway-level pricing/photos**: line sheets often show swatches per colorway
6. **Order form**: a page added to the line sheet with qty-by-size grids buyers can fill in
7. **CSV export** of styles and prices for spreadsheets
8. **Multi-currency sourcing**: components bought in another currency with an exchange rate
