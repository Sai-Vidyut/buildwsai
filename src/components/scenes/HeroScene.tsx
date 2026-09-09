import { resumeMeta } from '../../data/resume'
import { BrandLine } from '../editorial/BrandLine'
import { TextLink } from '../editorial/TextLink'
import { useHeroIntro } from '../../hooks/useHeroIntro'

export function HeroScene() {
  const root = useHeroIntro()

  return (
    <section
      ref={root}
      id="hero"
      data-nav-tone="light"
      className="bg-[var(--color-white)] min-h-[100dvh] flex flex-col"
    >
      <div className="editorial-container flex-1 flex flex-col pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:pt-36 pb-10 md:pb-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 md:mb-20">
          <BrandLine
            primary="BUILDWSAI"
            secondary="Sai Vidyut C"
            className="hero-fade text-[var(--color-muted)]"
          />
          <p className="hero-fade label-brand text-[var(--color-muted)]">{resumeMeta.availability}</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-end flex-1">
          <div className="lg:col-span-8">
            <h1 className="display-hero text-[var(--color-black)] max-w-[11ch] md:max-w-none">
              <span className="hero-line-mask block">
                <span className="hero-line block">Systems</span>
              </span>
              <span className="hero-line-mask block">
                <span className="hero-line block text-[var(--color-muted)]">Engineer</span>
              </span>
            </h1>
          </div>

          <div className="lg:col-span-4 lg:pb-2 mobile-copy-rhythm">
            <p className="hero-fade text-[1.0625rem] md:text-lg leading-relaxed text-[var(--color-muted)]">
              Geospatial intelligence, agentic commerce, document systems, and deterministic AI —
              built end-to-end.
            </p>
            <p className="hero-fade mt-6 md:mt-8 label-brand text-[var(--color-black)]">
              The model interprets · The code decides
            </p>
            <div className="hero-fade mt-8 md:mt-10 flex flex-wrap gap-x-8 gap-y-4">
              <TextLink href="#work">Selected work</TextLink>
              <TextLink href={resumeMeta.github} external>GitHub</TextLink>
              <TextLink href={resumeMeta.linkedin} external>LinkedIn</TextLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
