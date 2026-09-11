import { labProjects, type LabStatus } from '../../data/projects'
import { BrandLine } from '../editorial/BrandLine'
import { TextLink } from '../editorial/TextLink'
import { MobileReveal } from '../motion/MobileReveal'
import { MobileStagger, MobileStaggerItem } from '../motion/MobileStagger'
import { useReveal } from '../../hooks/useReveal'
import { cn } from '../../lib/cn'

const statusLabel: Record<LabStatus, string> = {
  experiment: 'Experiment',
  shipped: 'Shipped',
  paused: 'Paused',
}

export function LabScene() {
  const reveal = useReveal<HTMLElement>({ y: 48 })

  return (
    <section
      ref={reveal}
      id="lab"
      data-nav-tone="light"
      className="bg-[var(--color-white)] section-pad border-t border-[var(--color-line)]"
      aria-labelledby="lab-heading"
    >
      <div className="editorial-container">
        <MobileReveal>
          <BrandLine primary="Lab" className="text-[var(--color-muted)] mb-6" />
          <h2 id="lab-heading" className="display-large text-[var(--color-black)] mb-16 md:mb-20">
            Experiments.
          </h2>
        </MobileReveal>

        <MobileStagger stagger={0.12}>
          {labProjects.map((project, i) => (
            <MobileStaggerItem key={project.id}>
              <article className="grid md:grid-cols-12 gap-4 md:gap-8 py-10 border-t border-[var(--color-line)] items-baseline">
                <p className="md:col-span-1 label-brand text-[var(--color-muted)]">0{i + 1}</p>
                <div className="md:col-span-4">
                  <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                    {project.name}
                  </h3>
                  <p
                    className={cn(
                      'label-brand mt-3 inline-block border px-2 py-1',
                      project.status === 'shipped'
                        ? 'text-[var(--color-black)] border-[var(--color-line)]'
                        : 'text-[var(--color-muted)] border-[var(--color-line)]',
                    )}
                  >
                    {statusLabel[project.status]}
                  </p>
                </div>
                <div className="md:col-span-7">
                  <p className="text-[var(--color-muted)] leading-relaxed max-w-lg mb-5 text-sm md:text-base">
                    {project.description}
                  </p>
                  {project.links.map((l) => (
                    <TextLink key={l.href} href={l.href} external>
                      {l.label}
                    </TextLink>
                  ))}
                </div>
              </article>
            </MobileStaggerItem>
          ))}
        </MobileStagger>
      </div>
    </section>
  )
}
