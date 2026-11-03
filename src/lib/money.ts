const cache = new Map<string, Intl.NumberFormat>()

export function formatMoney(n: number, currency: string, locale?: string) {
  const key = `${locale}|${currency}`
  let f = cache.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, { style: 'currency', currency })
    } catch {
      f = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
    }
    cache.set(key, f)
  }
  return f.format(n || 0)
}

export const pct = (n: number) => `${(Math.round(n * 10) / 10).toString()}%`

export const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'NZD', 'JPY', 'CHF', 'SEK', 'DKK', 'NOK', 'MXN', 'BRL', 'INR', 'ZAR', 'SGD', 'HKD', 'KRW', 'CNY']
