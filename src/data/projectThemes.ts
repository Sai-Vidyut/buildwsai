export type ProjectThemeId = 'hero' | 'satquery' | 'razorflow' | 'docna' | 'blueprint' | 'experience' | 'resume' | 'contact'

export const projectThemes: Record<
  ProjectThemeId,
  { accent: string; muted: string; label: string }
> = {
  hero: { accent: 'var(--color-black)', muted: 'var(--color-muted)', label: 'Intro' },
  satquery: {
    accent: 'var(--satquery-purple)',
    muted: 'var(--satquery-purple-faint)',
    label: 'SatQuery',
  },
  razorflow: {
    accent: 'var(--razorflow-green)',
    muted: 'var(--razorflow-green-faint)',
    label: 'RazorFlow',
  },
  docna: {
    accent: 'var(--docna-accent)',
    muted: 'var(--docna-muted)',
    label: 'DocNA',
  },
  blueprint: {
    accent: 'var(--blueprint-accent)',
    muted: 'var(--blueprint-muted)',
    label: 'BluePrint',
  },
  experience: { accent: 'var(--color-black)', muted: 'var(--color-muted)', label: 'Experience' },
  resume: { accent: 'var(--color-white)', muted: 'rgba(250,250,250,0.4)', label: 'Resume' },
  contact: { accent: 'var(--color-white)', muted: 'rgba(250,250,250,0.35)', label: 'Contact' },
}

export function themeForSection(id: string): ProjectThemeId {
  if (id === 'hero') return 'hero'
  if (id === 'experience') return 'experience'
  if (id === 'resume') return 'resume'
  if (id === 'contact') return 'contact'
  if (id in projectThemes) return id as ProjectThemeId
  return 'hero'
}
