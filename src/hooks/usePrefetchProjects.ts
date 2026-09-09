import { useEffect } from 'react'
import { coreProjects } from '../data/projects'
import { images, videos } from '../data/assets'
import { webpSrc } from '../lib/media'
import { prefetchUrl } from '../lib/media'

const projectAssets: Record<string, string[]> = {
  satquery: [images.satquery, webpSrc(images.satquery)],
  razorflow: [
    images.razorflowPoster,
    webpSrc(images.razorflowPoster),
    videos.razorflowDeskLoop,
  ],
  docna: [images.docnaWorkspace, images.docnaReview, webpSrc(images.docnaWorkspace), webpSrc(images.docnaReview)],
  blueprint: [images.blueprint, webpSrc(images.blueprint)],
}

export function usePrefetchProjects() {
  useEffect(() => {
    const prefetched = new Set<string>()

    const prefetchNext = (projectId: string) => {
      const idx = coreProjects.findIndex((p) => p.id === projectId)
      if (idx < 0 || idx >= coreProjects.length - 1) return
      const next = coreProjects[idx + 1]
      const urls = projectAssets[next.id] ?? []
      urls.forEach((url) => {
        if (prefetched.has(url)) return
        prefetched.add(url)
        prefetchUrl(url, url.endsWith('.mp4') ? 'video' : 'image')
      })
    }

    const sections = coreProjects
      .map((p) => {
        const el = document.querySelector(`[data-project="${p.id}"]`)
        return el ? { id: p.id, el } : null
      })
      .filter(Boolean) as { id: string; el: Element }[]

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return
          const match = sections.find((s) => s.el === entry.target)
          if (match) prefetchNext(match.id)
        })
      },
      { threshold: [0.35, 0.55] },
    )

    sections.forEach((s) => observer.observe(s.el))
    return () => observer.disconnect()
  }, [])
}
