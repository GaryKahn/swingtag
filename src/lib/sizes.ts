const LETTER_SCALE = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL']
const ALIASES: Record<string, string> = { '2XS': 'XXS', '3XS': 'XXXS', '2XL': 'XXL', XXXL: '3XL', 'ONE SIZE': 'OS', ONESIZE: 'OS', 'O/S': 'OS' }
const norm = (s: string) => {
  const u = s.trim().toUpperCase()
  return ALIASES[u] ?? u
}

/**
 * Turn a free-text size field into a list of sizes.
 * "XS–XL" → XS,S,M,L,XL · "S, M, L" → S,M,L · "6-14" → 6,8,10,12,14 · "28–32" → 28..32 · "" → OS
 */
export function parseSizes(text: string): string[] {
  const t = (text ?? '')
    .trim()
    .replace(/one\s*size|o\/s/gi, 'OS')
    .replace(/\s*(–|—|-)\s*/g, '$1')
    .replace(/\s+to\s+/gi, '-')
  if (!t) return ['OS']
  const out: string[] = []
  for (const part of t.split(/[,/;\s]+/).map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^(.+?)(?:–|—|-)(.+)$/)
    if (range) {
      const [a, b] = [norm(range[1]), norm(range[2])]
      const ia = LETTER_SCALE.indexOf(a)
      const ib = LETTER_SCALE.indexOf(b)
      if (ia >= 0 && ib >= ia) {
        out.push(...LETTER_SCALE.slice(ia, ib + 1))
        continue
      }
      const na = Number(a)
      const nb = Number(b)
      if (Number.isInteger(na) && Number.isInteger(nb) && nb > na && nb - na <= 40) {
        // even-numbered ranges like 6–14 are dress sizes in steps of 2
        const step = na % 2 === 0 && nb % 2 === 0 && nb - na >= 4 && nb < 26 ? 2 : 1
        for (let n = na; n <= nb; n += step) out.push(String(n))
        continue
      }
    }
    out.push(norm(part))
  }
  return [...new Set(out)]
}

export function parseColourways(text: string): string[] {
  const list = (text ?? '').split(/[,;/]/).map((c) => c.trim()).filter(Boolean)
  return list.length ? list : ['']
}
