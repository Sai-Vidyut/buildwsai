import {
  education,
  professionalSummary,
  resumeMeta,
  skillGroups,
} from '../../data/resume'
import { BrandLine } from '../editorial/BrandLine'
import { TextLink } from '../editorial/TextLink'
import { useReveal } from '../../hooks/useReveal'

export function ResumeDossier() {
  const reveal = useReveal<HTMLElement>({ y: 48 })

  return (
    <section
      ref={reveal}
      id="resume"
      data-nav-tone="dark"
      className="bg-[var(--color-black)] text-white section-pad"
    >
      <div className="editorial-container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16 md:mb-24">
          <div>
            <BrandLine primary="Dossier" secondary="Resume" className="text-white/40 mb-4" />
            <h2 className="display-large text-white">Capabilities</h2>
          </div>
          <div className="flex flex-col sm:items-end gap-3">
            <TextLink href={resumeMeta.downloadPath} className="!text-white">
              Download PDF
            </TextLink>
            <p className="label-brand text-white/30">Last updated · {resumeMeta.lastUpdated}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-14 lg:gap-20">
          <aside className="lg:col-span-4 space-y-12">
            <div className="border-t border-white/20 pt-8">
              <p className="font-display text-2xl font-semibold leading-tight">{resumeMeta.name}</p>
              <p className="text-sm text-white/50 mt-5">{resumeMeta.location}</p>
              <a
                href={`mailto:${resumeMeta.email}`}
                className="block text-sm mt-3 text-white/80 hover:text-white transition-colors"
              >
                {resumeMeta.email}
              </a>
              <p className="text-sm text-white/50">{resumeMeta.phone}</p>
            </div>

            <div>
              <p className="label-brand text-white/40 mb-4">Education</p>
              <p className="font-display text-lg font-semibold">{education.degree}</p>
              <p className="text-sm text-white/50 mt-2">{education.school}</p>
              <p className="label-brand text-white/40 mt-2">{education.year}</p>
            </div>
          </aside>

          <div className="lg:col-span-8">
            <p className="text-lg md:text-xl leading-relaxed text-white/70 max-w-2xl mb-8">
              {professionalSummary}
            </p>
            <p className="text-sm text-white/50 leading-relaxed max-w-2xl mb-14 border-l border-white/15 pl-5">
              Guardrails, schema validation, and deterministic routing — models interpret; systems
              decide what ships.
            </p>

            <p className="label-brand text-white/40 mb-10">Technical skills</p>
            <div className="grid sm:grid-cols-2 gap-10">
              {skillGroups.map((group) => (
                <div key={group.label} className="border-t border-white/10 pt-6">
                  <p className="label-brand text-white/60 mb-3">{group.label}</p>
                  <p className="text-sm text-white/50 leading-relaxed">{group.items.join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
