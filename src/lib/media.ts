/** Resolve WebP sibling path when available (same basename, .webp extension). */
export function webpSrc(jpgOrPngPath: string): string {
  return jpgOrPngPath.replace(/\.(jpe?g|png)$/i, '.webp')
}

export function prefetchUrl(url: string, as: 'image' | 'video' = 'image') {
  if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) return
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  if (as === 'video') link.as = 'video'
  else link.as = 'image'
  document.head.appendChild(link)
}
