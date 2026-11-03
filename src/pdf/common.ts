import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { blobToDataUrl } from '../lib/images'
import { db } from '../db/schema'

let loaded: Promise<typeof import('pdfmake/build/pdfmake')> | undefined
function loadPdfMake() {
  loaded ??= Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(([m, v]) => {
    const pdfMake = ((m as { default?: unknown }).default ?? m) as typeof import('pdfmake/build/pdfmake')
    const vfs = ((v as { default?: unknown }).default ?? v) as Record<string, string>
    pdfMake.addVirtualFileSystem(vfs)
    return pdfMake
  })
  return loaded
}

export async function photoDataUrl(id: string | undefined, kind: 'blob' | 'thumb' = 'blob') {
  if (!id) return undefined
  const p = await db.photos.get(id)
  return p ? blobToDataUrl(p[kind]) : undefined
}

export const safeName = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'document'

export const INK = '#1c1917'
export const MUTED = '#78716c'
export const RULE = '#e7e5e4'

export const baseStyles: TDocumentDefinitions['styles'] = {
  brand: { fontSize: 20, bold: true, color: INK },
  title: { fontSize: 14, color: INK },
  muted: { fontSize: 8.5, color: MUTED },
  label: { fontSize: 7, color: MUTED, characterSpacing: 0.6 },
  th: { fontSize: 7.5, color: MUTED, bold: true },
  styleName: { fontSize: 10.5, bold: true, color: INK },
  price: { fontSize: 10, bold: true, color: INK },
}

/** Build the PDF and hand it to the user: share sheet on phones when possible, otherwise download. */
export async function deliverPdf(doc: TDocumentDefinitions, filename: string, prefer: 'share' | 'download' | 'preview' = 'download', win?: Window | null) {
  const pdfMake = await loadPdfMake()
  const blob = await pdfMake.createPdf({ defaultStyle: { font: 'Roboto', fontSize: 9, color: INK }, styles: baseStyles, ...doc }).getBlob()
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (prefer === 'share' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  if (prefer === 'preview') {
    // `win` was opened synchronously in the click handler so popup blockers allow it
    if (win) win.location.href = url
    else window.open(url, '_blank')
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export const canShareFiles = () =>
  typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] })

/** Center-crop a stored photo to a fixed aspect ratio so line-sheet grids line up. */
export async function croppedPhoto(id: string | undefined, aspect = 3 / 4, width = 900, kind: 'blob' | 'thumb' = 'blob') {
  if (!id) return undefined
  const p = await db.photos.get(id)
  if (!p) return undefined
  const bmp = await createImageBitmap(p[kind])
  let sw = bmp.width
  let sh = bmp.height
  if (sw / sh > aspect) sw = sh * aspect
  else sh = sw / aspect
  const w = Math.min(width, Math.round(sw))
  const h = Math.round(w / aspect)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, w, h)
  bmp.close()
  return c.toDataURL('image/jpeg', 0.85)
}
