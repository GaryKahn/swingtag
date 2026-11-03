export interface Figure {
  src: string
  alt: string
  caption?: string
  kind?: 'phone' | 'doc' | 'wide' | 'card'
}
export interface Guide {
  id: string
  title: string
  summary: string
  intro?: string
  steps?: string[]
  tips?: string[]
  links?: { label: string; href: string }[]
  /** An interactive block rendered after the steps. */
  widget?: 'install'
  figures: Figure[]
}

const img = (name: string) => `${import.meta.env.BASE_URL}help/${name}.jpg`

export const GUIDES: Guide[] = [
  {
    id: 'start',
    title: 'Getting started',
    summary: 'Install it, use it offline, keep your work safe.',
    intro: 'Swingtag runs in your browser and saves everything on your device. There is no account or login, and nothing is uploaded.',
    steps: [
      'Open the link once while you have internet. After that it works without a connection.',
      'Install it to your home screen so it opens like an app. See the next guide, "Install on your phone or computer", for steps for your device.',
      'Use the tabs at the bottom (on a phone) or on the left (on a computer) to move between Styles, Templates, Components, Line sheets, Orders and Settings.',
      'Tap the ? at the top of any page to jump to the guide for it.',
    ],
    tips: ['Your work lives only on this device. Export a backup regularly (Settings → Export backup), especially before clearing your browser.'],
    figures: [{ src: img('styles'), alt: 'The Styles list with four garments and their cost, wholesale and retail prices', kind: 'phone' }],
  },
  {
    id: 'install',
    title: 'Install on your phone or computer',
    summary: 'Add Swingtag to your home screen, dock or desktop.',
    intro:
      'Installing puts a Swingtag icon on your home screen. It then opens full screen like any other app, works offline, and your browser is much less likely to clear its data. It takes about 20 seconds and there is no app store involved.',
    tips: ['On iPhone, install before you start working, because the installed app and Safari keep separate data.'],
    widget: 'install',
    figures: [],
  },
  {
    id: 'setup',
    title: 'Set up your business',
    summary: 'Currency, units, pricing targets, brand and bank details.',
    intro: 'Do this once in Settings. Everything you add here is used on your line sheets and invoices.',
    steps: [
      'Pricing defaults: choose your target wholesale margin, retail multiplier, wastage allowance and currency (South African rand is the default).',
      'Units: metric (metres) is the default. Switching to yards converts your fabric prices and template quantities for you.',
      'Invoices: set the invoice number prefix and the next number, and a default VAT rate. In South Africa, charge 15% VAT only if you are VAT-registered.',
      'Company and bank details: your registered name, address, registration number and bank account appear on every invoice so stores know where to pay.',
      'Brand: add your logo, contact details, delivery window, minimums and payment terms for your line sheets.',
    ],
    figures: [
      { src: img('pricing-defaults'), alt: 'Pricing defaults: margin, multiplier, wastage, currency and rounding', kind: 'card' },
      { src: img('settings-bank'), alt: 'Bank details form', kind: 'card' },
    ],
  },
  {
    id: 'cost',
    title: 'Cost a garment',
    summary: 'Start from a template, add photos, adjust the components.',
    steps: [
      'Go to Styles and tap New, then choose a template such as T-shirt or Button-up shirt (or Blank).',
      'Fill in the details: name, style number, fabrication, colourways (e.g. "Ecru, Navy") and sizes (e.g. "XS–XL", "6–14" or "S, M, L"). The line under the fields shows how colours and sizes will appear on order sheets.',
      'Add photos with the camera or from your gallery. The first photo is the main one on your line sheet; use the arrows to reorder.',
      'Check each component. Fabric is entered in metres with a decimal field. Pieces such as buttons and labels have − / + buttons so you can quickly count them up.',
      'Enter your labor (cut, make & trim) and any overhead, freight or duty. The price bar at the bottom updates as you go.',
    ],
    tips: [
      'Everything saves automatically.',
      'Tap "Use library costs" to pull in the latest prices from your component library.',
      'Use Duplicate for colour or fabric variations of the same style.',
    ],
    figures: [
      { src: img('new-style'), alt: 'Choosing a template for a new style', kind: 'phone' },
      { src: img('style-details'), alt: 'Style details with photos', kind: 'phone' },
      { src: img('style-costing'), alt: 'Components with plus and minus buttons, and the price bar', kind: 'phone' },
    ],
  },
  {
    id: 'pricing',
    title: 'How prices are worked out',
    summary: 'From cost to wholesale to retail, with a worked example.',
    intro: 'Swingtag adds up your landed cost, then sets your wholesale price from your target margin and the suggested retail price from a multiplier.',
    steps: [
      'Materials: quantity × unit cost for each component. Fabric and trims get the wastage allowance added (10% by default) for cutting loss.',
      'Landed cost = materials + labor + overhead, plus freight & duty if you import.',
      'Wholesale = landed cost ÷ (1 − margin). Example: R648.25 cost at a 55% margin → R648.25 ÷ 0.45 = R1 440.56, rounded up to R1 441.',
      'Retail (MSRP) = wholesale × multiplier. Example: R1 441 × 2.2 = R3 170.20, rounded up to R3 171. Stores typically use 2–2.5×.',
      'Prices are always rounded up, so rounding never eats into your margin. Choose whole rands, .95/.99 endings or the nearest 5 in Settings.',
    ],
    tips: [
      'Margin is not the same as markup: a 55% margin is a 2.2× markup on cost.',
      'You can set a different margin or multiplier per style, or type an exact wholesale or retail price. You will see a warning if it falls below your target margin.',
    ],
    figures: [{ src: img('desktop-style'), alt: 'Style editor on a computer with the full price breakdown', kind: 'wide' }],
  },
  {
    id: 'library',
    title: 'Components & templates',
    summary: 'Keep your supplier prices in one place and reuse garment recipes.',
    steps: [
      'Components is your price list: every fabric, trim, label and packaging item with what you pay per metre or per piece, and the supplier.',
      'When a supplier changes a price, update it here, then open a style and tap "Use library costs" to apply it.',
      'Templates are recipes: which components a garment needs, and how much of each. Edit the built-in ones or make your own.',
      'Made a style you want to reuse? Tap "Save as template" at the bottom of the style.',
    ],
    tips: ['Built-in templates and components can be hidden but not deleted, so you can always get them back.'],
    figures: [
      { src: img('components'), alt: 'Component library grouped by category', kind: 'phone' },
      { src: img('templates'), alt: 'Template list', kind: 'phone' },
    ],
  },
  {
    id: 'linesheet',
    title: 'Make a line sheet',
    summary: 'A PDF of your collection with wholesale prices and terms, to send to stores.',
    steps: [
      'Go to Line sheets → New. All your styles are added; remove or reorder them with the arrows.',
      'Add the season, order deadline and any notes for buyers.',
      'Choose a layout (2 per row, 3 per row or a list) and whether to show suggested retail prices.',
      'Tick "Add a printable order form" if buyers might prefer to write their order on paper.',
      'Tap Download PDF, or Share to send it straight to WhatsApp or email.',
    ],
    figures: [
      { src: img('line-sheet'), alt: 'Line sheet settings and export buttons', kind: 'phone' },
      { src: img('line-sheet-pdf'), alt: 'The line sheet PDF', kind: 'doc', caption: 'The PDF stores receive' },
      { src: img('order-form-pdf'), alt: 'The printable order form page', kind: 'doc', caption: 'Optional printable order form' },
    ],
  },
  {
    id: 'ordersheet',
    title: 'Send an order sheet (Excel)',
    summary: 'A spreadsheet buyers fill in, which you can import straight back.',
    intro: "The order sheet opens in Excel, Google Sheets (free on any phone or computer) and Apple Numbers, so buyers don't need Excel.",
    steps: [
      'On a line sheet, tap Order sheet (.xlsx) and send the file to the buyer along with your PDF.',
      'The buyer fills in their details and a quantity for each size in the yellow cells. Totals add up automatically.',
      'They save it and email it back to you.',
      'Go to Orders → Import filled-in order sheet and choose the file. The order is created with their details and quantities.',
    ],
    tips: [
      "Ask buyers not to delete rows or rename the tab. Hidden information in the file tells Swingtag which cell is which.",
      'No spreadsheet app? Use the printable order form in the PDF, or simply enter the order yourself (next guide).',
    ],
    figures: [{ src: img('orders-empty'), alt: 'Orders page with the import button', kind: 'phone' }],
  },
  {
    id: 'orders',
    title: 'Orders & invoices',
    summary: 'Record what a store orders and send a professional invoice.',
    steps: [
      'Go to Orders → New (or import an order sheet). Each order gets the next invoice number automatically.',
      "Fill in the store's details, or pick a previous customer to fill them in for you.",
      'Tap Add styles. Each colour gets a row of sizes; use − / + to enter quantities. Unit prices default to your wholesale price.',
      'Set the VAT rate, deposit, payment terms and due date.',
      'Download the Invoice PDF, a Pro forma (to request a deposit before production) or an Order confirmation. Your bank details are included.',
      'Update the status as the order moves along: Draft → Confirmed → Invoiced → Paid.',
    ],
    figures: [
      { src: img('order-items'), alt: 'Entering quantities per size with plus and minus buttons', kind: 'phone' },
      { src: img('order-summary'), alt: 'Order totals and invoice buttons', kind: 'phone' },
      { src: img('invoice-pdf'), alt: 'Invoice PDF with bank details, VAT and deposit', kind: 'doc', caption: 'The invoice PDF' },
    ],
  },
  {
    id: 'backup',
    title: 'Back up & move devices',
    summary: 'Keep a copy of your work and carry on from another phone or computer.',
    steps: [
      'Settings → Export backup saves one file with everything, photos included.',
      'Keep it somewhere safe: email it to yourself, or save it to Google Drive or iCloud.',
      'On another device, open Swingtag and go to Settings → Import backup.',
      'Choose Merge to add it to what is already there (where both have the same item, the most recently edited one wins), or Replace to make the device an exact copy.',
    ],
    tips: ["On iPhone, Safari can clear a website's data after a few weeks without visits. Installing Swingtag to your home screen prevents this. Backups are still a good idea."],
    figures: [{ src: img('backup'), alt: 'Export and import backup buttons', kind: 'card' }],
  },
  {
    id: 'about',
    title: 'Privacy, disclaimer & licence',
    summary: 'Where your data lives, checking your figures, and the open-source licence.',
    intro: 'Swingtag is a free, open-source tool made for independent designers.',
    steps: [
      "Privacy: everything you enter (styles, prices, photos, customers and bank details) is saved only on this device. Nothing is sent to a server, there are no accounts, and the makers of Swingtag can't see your data.",
      "Your responsibility: you are the only one with your data, so if you clear your browser or lose your phone, it's gone unless you exported a backup.",
      'Check your figures: Swingtag does the maths you give it, but prices, margins, VAT and invoices are your responsibility. Check them before sending anything to a customer, and ask an accountant about tax and VAT registration.',
      'No warranty: Swingtag is provided "as is", without any warranty, under the MIT licence. The authors are not liable for any loss arising from its use.',
      'Open source: the code is free to use, copy and change under the MIT licence. You can find it, and report problems, on GitHub.',
    ],
    links: [
      { label: 'Source code & issue tracker', href: 'https://github.com/GaryKahn/swingtag' },
      { label: 'MIT licence', href: 'https://github.com/GaryKahn/swingtag/blob/main/LICENSE' },
    ],
    figures: [],
  },
]
