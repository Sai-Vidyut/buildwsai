import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from '../../../lib/gsap'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'

const nodes = [
  { x: 0.18, y: 0.32, label: 'Idea' },
  { x: 0.5, y: 0.22, label: 'Schema' },
  { x: 0.82, y: 0.32, label: 'Blueprint' },
  { x: 0.5, y: 0.72, label: 'Mermaid' },
]

const edges: [number, number][] = [[0, 1], [1, 2], [1, 3]]

type BluePrintGraphProps = {
  staticProgress?: number
  scrollRoot?: RefObject<HTMLElement | null>
  progressRef?: RefObject<{ value: number }>
  static?: boolean
  mobile?: boolean
}

export function BluePrintGraph({
  staticProgress = 0.75,
  scrollRoot,
  progressRef,
  static: isStatic = false,
  mobile: mobileProp = false,
}: BluePrintGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const internalProgress = useRef({ value: isStatic ? 1 : staticProgress })
  const reduced = usePrefersReducedMotion()
  const mobileHook = useIsMobile()
  const mobile = mobileProp || mobileHook

  useEffect(() => {
    if (progressRef || isStatic || mobile || !scrollRoot?.current || reduced) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        internalProgress.current,
        { value: 0 },
        {
          value: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: scrollRoot.current,
            start: 'top 75%',
            end: 'center 35%',
            scrub: 0.5,
          },
        },
      )
    })

    return () => ctx.revert()
  }, [isStatic, mobile, progressRef, reduced, scrollRoot])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement
    if (!parent) return

    const dpr = mobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2)
    const animate = !isStatic && !mobile && !reduced && !progressRef

    const readColor = (name: string, fallback: string) => {
      const value = getComputedStyle(parent).getPropertyValue(name).trim()
      return value || fallback
    }

    const draw = () => {
      const source = progressRef?.current ?? internalProgress.current
      const p = isStatic || mobile ? 1 : source.value
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const edgeColor = readColor('--blueprint-graph-edge', 'rgba(94, 200, 232, 0.55)')
      const nodeFill = readColor('--blueprint-graph-node', 'rgba(94, 200, 232, 0.1)')
      const nodeStroke = readColor('--blueprint-accent', '#5ec8e8')
      const labelColor = readColor('--blueprint-graph-label', '#d4f1fa')

      const assemble = Math.min(p * 1.3, 1)

      edges.forEach(([a, b], i) => {
        const n1 = nodes[a]
        const n2 = nodes[b]
        const t = Math.min(Math.max(assemble * 1.2 - i * 0.15, 0), 1)
        if (t <= 0) return

        ctx.strokeStyle = edgeColor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(n1.x * w, n1.y * h)
        ctx.lineTo(n1.x * w + (n2.x - n1.x) * w * t, n1.y * h + (n2.y - n1.y) * h * t)
        ctx.stroke()
      })

      const activeIndex = Math.min(
        nodes.length - 1,
        Math.floor(assemble * nodes.length * 1.05),
      )

      nodes.forEach((node, i) => {
        const appear = Math.min(Math.max(assemble - i * 0.12, 0), 1)
        if (appear <= 0) return

        const x = node.x * w
        const y = node.y * h
        const isActive = i === activeIndex && appear > 0.85 && animate
        const pulse = isActive ? 1 + Math.sin(Date.now() * 0.005) * 0.045 : 1
        const nodeWidth = mobile ? 84 : 100

        ctx.fillStyle = isActive ? nodeStroke : nodeFill
        ctx.strokeStyle = nodeStroke
        ctx.lineWidth = isActive ? 1.5 : 1
        ctx.globalAlpha = appear * (isActive ? 1 : 0.75)
        ctx.beginPath()
        ctx.roundRect(x - nodeWidth * 0.5 * pulse, y - 15 * pulse, nodeWidth * pulse, 30 * pulse, 2)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = labelColor
        ctx.font = mobile ? '9px IBM Plex Mono, monospace' : '10px IBM Plex Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(node.label, x, y + 4)
      })
      ctx.globalAlpha = 1
    }

    draw()
    let raf = 0
    const loop = () => {
      draw()
      if (animate) raf = requestAnimationFrame(loop)
    }
    if (animate) {
      raf = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(draw)
    ro.observe(parent)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [isStatic, mobile, progressRef, reduced])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
}
