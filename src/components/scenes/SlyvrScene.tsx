import { BrandLine } from '../editorial/BrandLine'
import { TextLink } from '../editorial/TextLink'
import { MobileReveal } from '../motion/MobileReveal'
import { useReveal } from '../../hooks/useReveal'

export function SlyvrScene() {
  const reveal = useReveal<HTMLElement>({ y: 40 })

  return (
    <section
      ref={reveal}
      id="slyvr"
      data-nav-tone="light"
      className="bg-[var(--color-white)] section-pad border-t border-[var(--color-line)]"
      aria-labelledby="slyvr-heading"
    >
      <div className="editorial-container">
        <MobileReveal>
          <BrandLine primary="Product" secondary="Live" className="text-[var(--color-muted)] mb-6" />
        </MobileReveal>

        <div className="grid md:grid-cols-12 gap-8 md:gap-12 md:items-end">
          <MobileReveal className="md:col-span-5" delay={0.04}>
            <h2
              id="slyvr-heading"
              className="display-large text-[var(--color-black)] max-w-[8ch]"
            >
              Slyvr
            </h2>
          </MobileReveal>

          <MobileReveal className="md:col-span-7 mobile-copy-rhythm" delay={0.1}>
            <p className="text-[1.125rem] md:text-xl leading-relaxed text-[var(--color-muted)] max-w-md">
              Your media. Finally searchable.
            </p>
            <div className="mt-8 md:mt-10">
              <TextLink
                href="/slyvr/"
                className="inline-flex min-h-11 items-center"
              >
                Explore Slyvr →
              </TextLink>
            </div>
          </MobileReveal>
        </div>
      </div>
    </section>
  )
}
