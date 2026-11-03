import { db, uid } from '../db/schema'
import type { Photo } from '../db/types'

async function resize(file: Blob, maxSide: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // flatten transparency for JPEG
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', quality),
  )
}

/** Compress an uploaded image and store it; returns the new photo id. */
export async function savePhoto(file: Blob, ownerId: string): Promise<string> {
  const [blob, thumb] = await Promise.all([resize(file, 1600, 0.82), resize(file, 400, 0.75)])
  const photo: Photo = { id: uid(), ownerId, blob, thumb, updatedAt: Date.now() }
  await db.photos.put(photo)
  return photo.id
}

/** Object URLs for photo blobs, cached for the session so lists don't leak URLs. */
const urlCache = new Map<string, string>()
export async function photoUrl(id: string, kind: 'thumb' | 'blob' = 'thumb'): Promise<string | undefined> {
  const key = `${id}:${kind}`
  const hit = urlCache.get(key)
  if (hit) return hit
  const p = await db.photos.get(id)
  if (!p) return undefined
  const url = URL.createObjectURL(p[kind])
  urlCache.set(key, url)
  return url
}

export function forgetPhotoUrls(id: string) {
  for (const kind of ['thumb', 'blob']) {
    const key = `${id}:${kind}`
    const url = urlCache.get(key)
    if (url) URL.revokeObjectURL(url)
    urlCache.delete(key)
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}
