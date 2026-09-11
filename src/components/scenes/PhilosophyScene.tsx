import { MobileReveal } from '../motion/MobileReveal'
import { MobileStagger, MobileStaggerItem } from '../motion/MobileStagger'
import { useReveal } from '../../hooks/useReveal'

const principles = [
  {
    title: 'Interpretation ≠ authority',
    body: 'Models propose structure. Code validates, routes, and commits.',
  },
  {
    title: 'Guardrails before generation',
    body: 'Policy, schema, and placement run deterministically — before any output ships.',
  },
  {
    title: 'Evidence over assertion',
    body: 'Maps, traces, and tests are the source of truth — not model confidence.',
  },
]

export function PhilosophyScene() {
  const reveal = useReveal<HTMLElement>({ y: 32 })

  return (
    <section
      ref={reveal}
      id="philosophy"
      data-nav-tone="light"
      aria-labelledby="philosophy-heading"
      className="bg-[var(--color-white)] border-t border-[var(--color-line)]"
    >
      <div className="editorial-container py-16 md:py-20">
        <MobileReveal y={16}>
          <p id="philosophy-heading" className="label-brand text-[var(--color-muted)] mb-4">
            Philosophy
          </p>
          <p className="font-display text-xl md:text-2xl font-semibold tracking-tight text-[var(--color-black)] mb-10 md:mb-14 max-w-2xl">
            The model interprets. The code decides.
          </p>
        </MobileReveal>
        <MobileStagger className="grid md:grid-cols-3 gap-10 md:gap-12" stagger={0.12}>
          {principles.map((p) => (
            <MobileStaggerItem key={p.title}>
              <article>
                <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--color-black)] mb-3">
                  {p.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{p.body}</p>
              </article>
            </MobileStaggerItem>
          ))}
        </MobileStagger>
      </div>
    </section>
  )
}
