export type ProjectLink = {
  label: string
  href: string
  external?: boolean
}

export type FeaturedProject = {
  id: string
  name: string
  number: string
  category: string
  problem: string
  summary: string
  role: string
  stack: string[]
  links: ProjectLink[]
  status?: string
  image?: {
    src: string
    srcSet?: string
    alt: string
    width: number
    height: number
  }
  accent: string
}

export type LabProject = {
  id: string
  name: string
  description: string
  status: 'experiment' | 'shipped' | 'paused'
  links: ProjectLink[]
}

export const featuredProjects: FeaturedProject[] = [
  {
    id: 'peffle',
    name: 'Peffle',
    number: '01',
    category: 'Agent spend guard',
    problem:
      'Agent tool calls can spend money and take irreversible actions before a human sees what happened.',
    summary:
      'Local kill switch, spend cap, and human-approval gate for agent tool calls — enforced when the handler runs, not in the system prompt. Policy, daily budgets, and a SQLite ledger live in-process; the CLI approves pending charges and MCP exposes the same guard to agent runtimes.',
    role: 'Solo · Library & CLI',
    stack: ['TypeScript', 'Node.js', 'SQLite', 'MCP'],
    links: [
      { label: 'npm', href: 'https://www.npmjs.com/package/peffle', external: true },
      { label: 'Website', href: 'https://peffle.vercel.app', external: true },
    ],
    status: 'Published on npm. No SaaS. No telemetry.',
    image: {
      src: '/images/peffle-site.webp',
      alt: 'Peffle website — local policy enforcement for AI agent tool calls',
      width: 996,
      height: 504,
    },
    accent: '#ff4d00',
  },
  {
    id: 'satquery',
    name: 'SatQuery AI',
    number: '02',
    category: 'Geospatial intelligence',
    problem:
      'Satellite answers are useless if you cannot inspect the evidence on a map.',
    summary:
      'Map-first workstation for Earth-surface change. Execution traces link answers to evidence regions on Sentinel-2 optical and Sentinel-1 SAR, with GeoChat VLM in the loop.',
    role: 'Team at SRMIST · Backend & AI Systems Lead',
    stack: ['FastAPI', 'Next.js', 'MapLibre', 'Google Earth Engine'],
    links: [
      { label: 'Repository', href: 'https://github.com/Sai-Vidyut/SatQuery-AI', external: true },
      { label: 'Live', href: 'https://sat-query-ai-self.vercel.app', external: true },
    ],
    status: 'GPU pipeline runs locally. Deployed link is the workstation UI.',
    image: {
      src: '/images/satquery-site.webp',
      alt: 'SatQuery website — earth observation intelligence',
      width: 996,
      height: 504,
    },
    accent: '#1d4e89',
  },
  {
    id: 'invoice-pack',
    name: 'Invoice Pack',
    number: '03',
    category: 'Shipped product',
    problem:
      'Freelancers in India still assemble invoices by hand — GST, reminders, and payment collection included.',
    summary:
      'Print-ready invoices for finished freelance jobs, with GST when it applies, Razorpay checkout, and scheduled client payment reminders. One-time purchase, built and sold from this site.',
    role: 'Solo · Product, payments & export',
    stack: ['React', 'Cloudflare Workers', 'D1', 'Razorpay'],
    links: [{ label: 'Open product', href: '/invoice-pack' }],
    status: 'Live on buildwsai.online/invoice-pack',
    image: {
      src: '/images/invoice-pack-site.webp',
      alt: 'Invoice Pack website — create an invoice and get paid',
      width: 996,
      height: 504,
    },
    accent: '#2d6a4f',
  },
  {
    id: 'docna',
    name: 'DocNA',
    number: '04',
    category: 'Document intelligence',
    problem:
      'AI answers in Word docs are dangerous if they rewrite the original file.',
    summary:
      'Finds questions in Word documents, answers with AI, and writes back surgically via PlacementOps. The OOXML adapter mutates a copy only — the original is never touched.',
    role: 'Solo · End-to-end build',
    stack: ['Python', 'FastAPI', 'OOXML', 'lxml', 'Pydantic v2'],
    links: [
      { label: 'Repository', href: 'https://github.com/Sai-Vidyut/Project-DocNA', external: true },
    ],
    status: 'Runs locally. 311 tests · 18/18 real-AI fixtures.',
    image: {
      src: '/images/docna-site.webp',
      alt: 'DocNA running locally — document review with answers written back',
      width: 996,
      height: 504,
    },
    accent: '#5b6cff',
  },
  {
    id: 'slyvr',
    name: 'Slyvr',
    number: '05',
    category: 'Searchable media',
    problem: 'Finding a moment in a drive of footage means scrubbing, not searching.',
    summary:
      'Private media library with ingest, indexing, and clip-level search. The library owns the files; search returns clips you can open. Demo mode runs fully in the browser.',
    role: 'Solo · Product & full-stack',
    stack: ['React', 'Vite', 'FastAPI', 'SQLite', 'Object storage'],
    links: [
      { label: 'Explore', href: 'https://buildwsai.online/slyvr/' },
      { label: 'Repository', href: 'https://github.com/Sai-Vidyut/slyvr', external: true },
    ],
    status: 'Live on buildwsai.online/slyvr.',
    image: {
      src: '/images/slyvr-library.webp',
      srcSet: '/images/slyvr-library-960.webp 960w, /images/slyvr-library.webp 1400w',
      alt: 'Slyvr media library interface',
      width: 1400,
      height: 900,
    },
    accent: '#c9b896',
  },
  {
    id: 'blueprint',
    name: 'BluePrint',
    number: '06',
    category: 'Deterministic planning',
    problem:
      'Model-drawn architecture diagrams invent structure that never existed in the schema.',
    summary:
      'Natural-language idea → developer-grade blueprint with architecture, schema, API, and roadmap. Zod is the source of truth; Mermaid is compiled from structured data — never hallucinated as free text.',
    role: 'Solo · Full-stack',
    stack: ['Next.js', 'TypeScript', 'Zod', 'Gemini', 'Mermaid'],
    links: [
      {
        label: 'Repository',
        href: 'https://github.com/Sai-Vidyut/project-blueprint',
        external: true,
      },
      { label: 'Live', href: 'https://project-blueprint-eight.vercel.app', external: true },
    ],
    image: {
      src: '/images/blueprint-site.webp',
      alt: 'BluePrint website — turn an app idea into a build-ready plan',
      width: 996,
      height: 504,
    },
    accent: '#3a9fbe',
  },
]

export const labProjects: LabProject[] = [
  {
    id: 'razorflow',
    name: 'RazorFlow',
    description: 'Commerce infrastructure and payment workflow experimentation.',
    status: 'experiment',
    links: [],
  },
  {
    id: 'radio-auto',
    name: 'Radio Auto',
    description: 'Mumbai auto POV — time, weather, and audio layers in one cabin.',
    status: 'experiment',
    links: [{ label: 'Repository', href: 'https://github.com/Sai-Vidyut/radio-auto', external: true }],
  },
  {
    id: 'geochat',
    name: 'GeoChat Service',
    description: 'GPU inference for geochat-7B inside SatQuery — OOM-hardened service supervisor.',
    status: 'shipped',
    links: [
      {
        label: 'Service',
        href: 'https://github.com/Sai-Vidyut/SatQuery-AI/tree/main/services/geochat',
        external: true,
      },
    ],
  },
]

export const capabilities = [
  {
    label: 'Product systems',
    items: [
      'End-to-end product ownership',
      'Schema-first AI outputs',
      'Guardrails before generation',
      'Payment & checkout flows',
    ],
  },
  {
    label: 'Backend & AI',
    items: ['FastAPI', 'Structured LLM generation', 'Agent workflows', 'MCP integrations'],
  },
  {
    label: 'Interfaces',
    items: ['React', 'Next.js', 'MapLibre', 'Tailwind CSS'],
  },
  {
    label: 'Data & infra',
    items: ['PostgreSQL', 'SQLite', 'Docker', 'Cloudflare Workers', 'Azure Blob'],
  },
]

export const experience = [
  {
    role: 'Product & Backend Intern',
    company: 'Studojo Labs Private Limited',
    period: 'May 2026 – Jul 2026',
    bullets: [
      'Contributed to backend services supporting core product workstreams, collaborating from design through implementation.',
      'Owned assigned backend deliverables end-to-end inside a live engineering team.',
    ],
  },
]

export const achievements = [
  {
    title: 'Winner — GEO-HACK 3.0',
    context: 'GSSR Geospatial Hackathon',
    detail: 'Geospatial imagery',
  },
  {
    title: 'First Place — Li-Fi',
    context: 'Light-based data transmission system',
    detail: 'Semiconductor engineering project',
  },
  {
    title: 'Final Round Qualifier — IdeaSpark 3.0',
    context: 'Founders Club, SRMIST',
    detail: '5–6 Oct 2026',
  },
  {
    title: 'Engineering Model Development',
    context: 'Coursework recognition',
  },
]

export const education = {
  degree: 'B.Tech, Computer Science and Engineering',
  school: 'SRM Institute of Science and Technology (SRMIST)',
  year: '2nd Year',
}

export const buildPrinciples = [
  {
    title: 'Interpretation ≠ authority',
    body: 'Models propose. Code validates, routes, and commits. Confidence is never a substitute for a schema.',
  },
  {
    title: 'Ship the sharp edge',
    body: 'I prefer a narrow product that works under real constraints over a demo that only works in a slide deck.',
  },
  {
    title: 'Evidence over assertion',
    body: 'Maps, traces, tests, and ledgers beat vibes. If I cannot show the path, I do not ship the claim.',
  },
]
