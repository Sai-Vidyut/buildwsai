import { useEffect, type MouseEvent } from 'react'
import { Nav } from './components/layout/Nav'
import { ProjectEditorial } from './components/scenes/ProjectEditorial'
import { ContactScene } from './components/scenes/ContactScene'
import { ExperienceScene } from './components/scenes/ExperienceScene'
import { HeroScene } from './components/scenes/HeroScene'
import { PhilosophyScene } from './components/scenes/PhilosophyScene'
import { usePrefetchProjects } from './hooks/usePrefetchProjects'
import { LabScene } from './components/scenes/LabScene'
import { SlyvrScene } from './components/scenes/SlyvrScene'
import { ResumeDossier } from './components/scenes/ResumeDossier'
import { BackToTop } from './components/interactive/BackToTop'
import { ProjectRail } from './components/interactive/ProjectRail'
import { ScrollProgress } from './components/interactive/ScrollProgress'
import { coreProjects } from './data/projects'
import { useLenis } from './hooks/useLenis'
import { ScrollTrigger } from './lib/gsap'
import { scrollToElement } from './lib/scroll'

function handleSkipToContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  const main = document.getElementById('main')
  if (!main) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  scrollToElement(main, reduced)
}

export default function App() {
  useLenis()
  usePrefetchProjects()

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    const t = setTimeout(refresh, 1200)
    return () => {
      window.removeEventListener('load', refresh)
      clearTimeout(t)
    }
  }, [])

  return (
    <>
      <a
        href="#main"
        onClick={handleSkipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-black focus:px-4 focus:py-2 label-brand"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <ProjectRail />
      <Nav />
      <BackToTop />
      <main id="main" tabIndex={-1} className="outline-none">
        <HeroScene />
        <PhilosophyScene />
        {coreProjects.map((project, i) => (
          <ProjectEditorial key={project.id} project={project} index={i} />
        ))}
        <SlyvrScene />
        <ExperienceScene />
        <ResumeDossier />
        <LabScene />
        <ContactScene />
      </main>
    </>
  )
}
