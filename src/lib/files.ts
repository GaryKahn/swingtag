/** Hand a generated file to the user: the share sheet on phones when possible, otherwise a download. */
export async function deliverFile(blob: Blob, filename: string, preferShare = false) {
  const file = new File([blob], filename, { type: blob.type })
  if (preferShare && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
