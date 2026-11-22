import type { MouseEvent } from 'react'
import { Nav } from './components/layout/Nav'
import { ScrollProgress } from './components/interactive/ScrollProgress'
import { Hero } from './components/home/Hero'
import { Manifesto } from './components/home/Manifesto'
import { Work } from './components/home/Work'
import { Capabilities } from './components/home/Capabilities'
import { Experience } from './components/home/Experience'
import { Lab } from './components/home/Lab'
import { Contact } from './components/home/Contact'

function handleSkipToContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  const main = document.getElementById('main')
  if (!main) return
  main.focus({ preventScroll: true })
  main.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
}

export default function App() {
  return (
    <>
      <div className="grain" aria-hidden />
      <a
        href="#main"
        onClick={handleSkipToContent}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--color-ink)] focus:px-4 focus:py-2 focus:text-[var(--color-paper)] label"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Manifesto />
        <Work />
        <Capabilities />
        <Experience />
        <Lab />
        <Contact />
      </main>
    </>
  )
}
