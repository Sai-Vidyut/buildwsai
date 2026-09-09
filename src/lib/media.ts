/** Resolve WebP sibling path when available (same basename, .webp extension). */
export function webpSrc(jpgOrPngPath: string): string {
  return jpgOrPngPath.replace(/\.(jpe?g|png)$/i, '.webp')
}

/** Mobile-optimized WebP (960px wide) when generated alongside the source asset. */
export function mobileWebpSrc(jpgOrPngPath: string): string {
  return jpgOrPngPath.replace(/\.(jpe?g|png)$/i, '-960.webp')
}

export function projectPictureSizes(maxWidth = 1200) {
  return `(max-width: 767px) 100vw, min(92vw, ${maxWidth}px)`
}

export function projectSrcSet(jpgPath: string) {
  const mobile = mobileWebpSrc(jpgPath)
  const full = webpSrc(jpgPath)
  return `${mobile} 960w, ${full} 1200w`
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
