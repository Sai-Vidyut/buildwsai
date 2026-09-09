import { images } from './assets'

export type ProjectLink = {
  label: string
  href: string
  external?: boolean
}

export type ProjectLayout = 'observation' | 'commerce' | 'document' | 'systems'

export type CoreProject = {
  id: string
  name: string
  tagline: string
  summary: string
  keyIdea: string
  stack: string[]
  links: ProjectLink[]
  status?: string
  role?: string
  layout: ProjectLayout
  image?: string
  outcome?: string
}

export type LabStatus = 'experiment' | 'shipped' | 'paused'

export type LabProject = {
  id: string
  name: string
  description: string
  links: ProjectLink[]
  status: LabStatus
}

export const coreProjects: CoreProject[] = [
  {
    id: 'satquery',
    name: 'SatQuery AI',
    tagline: 'Geospatial intelligence',
    summary:
      'Map-first workstation for Earth-surface change — evidence-backed answers you inspect on the map.',
    keyIdea:
      'Execution trace + map-linked evidence regions. Sentinel-2 optical, Sentinel-1 SAR, GeoChat VLM.',
    stack: ['FastAPI', 'Next.js', 'MapLibre', 'Google Earth Engine'],
    links: [
      { label: 'Repository', href: 'https://github.com/Sai-Vidyut/SatQuery-AI' },
      { label: 'Live', href: 'https://sat-query-ai-self.vercel.app', external: true },
    ],
    status: 'GPU pipeline runs locally. Deployed link is the workstation UI.',
    role: 'Team at SRMIST · Backend & AI Systems Lead',
    layout: 'observation',
    image: images.satquery,
    outcome: 'Evidence you can inspect on the map — not a black-box answer.',
  },
  {
    id: 'razorflow',
    name: 'RazorFlow',
    tagline: 'Agentic commerce',
    summary:
      'Conversational buyer intent → governed Razorpay transactions with policy guardrails before any sale.',
    keyIdea:
      'StructuredIntent only from AI. Catalog, ranking, and policy enforcement are deterministic.',
    stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Razorpay'],
    links: [{ label: 'Repository', href: 'https://github.com/Sai-Vidyut/RazorFlow' }],
    status: 'Razorpay Buildathon. Runs locally.',
    role: 'Solo · Razorpay Buildathon',
    layout: 'commerce',
    image: images.razorflow,
    outcome: 'Intent in. Policy checked. Transaction out.',
  },
  {
    id: 'docna',
    name: 'DocNA',
    tagline: 'Document intelligence',
    summary:
      'Finds questions in Word docs, answers with AI, writes back surgically — original never touched.',
    keyIdea:
      'AI → answer text. Placement → PlacementOp. OOXML adapter mutates a copy only.',
    stack: ['Python', 'FastAPI', 'OOXML', 'lxml', 'Pydantic v2'],
    links: [{ label: 'Repository', href: 'https://github.com/Sai-Vidyut/Project-DocNA' }],
    status: '311 tests · 18/18 real-AI fixtures.',
    role: 'Solo · End-to-end build',
    layout: 'document',
    outcome: 'Surgical document mutation — never touch the original.',
  },
  {
    id: 'blueprint',
    name: 'BluePrint',
    tagline: 'Deterministic planning',
    summary:
      'Natural-language idea → developer-grade blueprint with architecture, schema, API, and roadmap.',
    keyIdea:
      'Zod schema is source of truth. Mermaid compiled from structured data — never from the model.',
    stack: ['Next.js', 'TypeScript', 'Zod', 'Gemini', 'Mermaid'],
    links: [
      { label: 'Repository', href: 'https://github.com/Sai-Vidyut/project-blueprint' },
      { label: 'Live', href: 'https://project-blueprint-eight.vercel.app', external: true },
    ],
    role: 'Solo · Full-stack',
    layout: 'systems',
    image: images.blueprint,
    outcome: 'Structured blueprint — diagrams compiled, not hallucinated.',
  },
]

export const labProjects: LabProject[] = [
  {
    id: 'radio-auto',
    name: 'Radio Auto',
    description: 'Mumbai auto POV — time, weather, and audio layers in one cabin.',
    links: [{ label: 'Repository', href: 'https://github.com/Sai-Vidyut/radio-auto' }],
    status: 'experiment',
  },
  {
    id: 'geochat',
    name: 'GeoChat Service',
    description: 'GPU inference for geochat-7B inside SatQuery — OOM-hardened service supervisor.',
    links: [
      {
        label: 'Service',
        href: 'https://github.com/Sai-Vidyut/SatQuery-AI/tree/main/services/geochat',
      },
    ],
    status: 'shipped',
  },
]
