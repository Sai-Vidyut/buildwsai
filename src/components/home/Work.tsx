import { featuredProjects } from '../../data/projects'
import { FeaturedProject } from './FeaturedProject'
import { Reveal } from '../ui/Reveal'

export function Work() {
  return (
    <section id="work" aria-labelledby="work-heading" className="section-y pt-8 md:pt-10">
      <div className="shell">
        <Reveal>
          <div className="flex flex-col gap-4 border-b border-[var(--color-line)] pb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label text-[var(--color-signal)]">Selected work</p>
              <h2 id="work-heading" className="display-section mt-4 text-[var(--color-ink)]">
                Products with edges.
              </h2>
            </div>
            <p className="copy max-w-md md:text-right">
              Curated for technical depth and product judgment — not a dump of
              every repo.
            </p>
          </div>
          <nav
            aria-label="Featured projects"
            className="mt-6 flex gap-4 overflow-x-auto pb-2 no-scrollbar"
          >
            {featuredProjects.map((project) => (
              <a
                key={project.id}
                href={`#${project.id}`}
                className="label shrink-0 text-[var(--color-mute)] no-underline transition-colors hover:text-[var(--color-signal)]"
              >
                {project.number} {project.name}
              </a>
            ))}
          </nav>
        </Reveal>

        <div>
          {featuredProjects.map((project, index) => (
            <FeaturedProject key={project.id} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
