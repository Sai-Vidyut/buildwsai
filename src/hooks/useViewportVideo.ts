import { useEffect, useRef, useState } from 'react'

type Options = {
  src: string
  rootMargin?: string
  threshold?: number
}

export function useViewportVideo({ src, rootMargin = '240px', threshold = 0.12 }: Options) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onReady = () => setReady(true)
    const onError = () => setFailed(true)

    video.addEventListener('loadeddata', onReady)
    video.addEventListener('error', onError)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!loaded) {
            video.src = src
            video.load()
            setLoaded(true)
          }
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(video)

    return () => {
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('error', onError)
      observer.disconnect()
    }
  }, [loaded, rootMargin, src, threshold])

  return { videoRef, loaded, ready, failed }
}
