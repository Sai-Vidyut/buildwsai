import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from '../../../lib/gsap'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

type DocNACanvasProps = {
  staticProgress?: number
  scrollRoot?: RefObject<HTMLElement | null>
}

export function DocNACanvas({ staticProgress = 0.65, scrollRoot }: DocNACanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progress = useRef({ value: staticProgress })
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!scrollRoot?.current || reduced) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        progress.current,
        { value: 0.15 },
        {
          value: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: scrollRoot.current,
            start: 'top 70%',
            end: 'center center',
            scrub: 0.45,
          },
        },
      )
    })

    return () => ctx.revert()
  }, [scrollRoot, reduced])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement
    if (!parent) return

    const dpr = Math.min(window.devicePixelRatio, 2)
    const layers = [
      { label: 'original.docx', y: 0.32, spread: 0 },
      { label: 'detection', y: 0.44, spread: 0.1 },
      { label: 'placement', y: 0.56, spread: 0.2 },
      { label: 'completed.docx', y: 0.68, spread: 0.3 },
    ]

    const draw = () => {
      const p = progress.current.value
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const separate = Math.min(p * 1.4, 1)

      layers.forEach((layer, i) => {
        const spreadY = layer.spread * separate * h * 0.28
        const boxW = Math.min(340, w * 0.75)
        const x = w * 0.5 - boxW / 2
        const y = h * layer.y - 26 + spreadY

        ctx.fillStyle = i === 2 ? '#fff' : `rgba(255,255,255,${0.85 + (1 - separate) * 0.15})`
        ctx.strokeStyle = i === 2 ? '#0a0a0a' : 'rgba(10,10,10,0.15)'
        ctx.lineWidth = i === 2 ? 2 : 1
        ctx.fillRect(x, y, boxW, 50)
        ctx.strokeRect(x, y, boxW, 50)

        ctx.fillStyle = '#0a0a0a'
        ctx.font = '11px IBM Plex Mono, monospace'
        ctx.fillText(layer.label, x + 14, y + 30)

        if (i === 2 && separate > 0.25) {
          ctx.fillRect(x + 14, y + 38, 36, 2)
        }
      })
    }

    draw()
    let raf = 0
    const loop = () => {
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(draw)
    ro.observe(parent)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
}
