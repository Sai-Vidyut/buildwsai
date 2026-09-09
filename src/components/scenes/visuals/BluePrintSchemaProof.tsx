/** Deterministic schema → diagram proof. No LLM — compiled from fixed structure. */

const schema = {
  service: 'auth-api',
  entities: ['User', 'Session'],
  routes: ['POST /login', 'GET /me'],
}

function compileDiagram() {
  const nodes = [
    { id: 'api', label: schema.service, x: 50, y: 18 },
    ...schema.entities.map((e, i) => ({
      id: e,
      label: e,
      x: 22 + i * 56,
      y: 52,
    })),
  ]
  const edges = schema.entities.map((e) => ({ from: 'api', to: e }))
  return { nodes, edges }
}

type Props = {
  visible?: boolean
  className?: string
}

export function BluePrintSchemaProof({ visible = true, className = '' }: Props) {
  const { nodes, edges } = compileDiagram()

  return (
    <div
      className={`grid md:grid-cols-2 gap-4 border border-[var(--blueprint-line)] bg-[var(--blueprint-surface)] p-4 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'} ${className}`}
      aria-label="Deterministic schema to diagram compilation"
    >
      <div>
        <p className="label-brand text-[var(--blueprint-muted)] mb-3">Structured input</p>
        <pre className="text-[0.65rem] leading-relaxed text-[var(--blueprint-text)]/80 font-mono overflow-x-auto">
          {JSON.stringify(schema, null, 2)}
        </pre>
      </div>
      <div>
        <p className="label-brand text-[var(--blueprint-muted)] mb-3">Compiled diagram</p>
        <svg viewBox="0 0 100 70" className="w-full h-auto" aria-hidden>
          {edges.map((e) => {
            const from = nodes.find((n) => n.id === e.from)!
            const to = nodes.find((n) => n.id === e.to)!
            return (
              <line
                key={`${e.from}-${e.to}`}
                x1={from.x}
                y1={from.y + 6}
                x2={to.x}
                y2={to.y - 6}
                stroke="var(--blueprint-graph-edge)"
                strokeWidth="0.4"
              />
            )
          })}
          {nodes.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x - 14}
                y={n.y - 5}
                width={28}
                height={10}
                rx={1}
                fill="var(--blueprint-graph-node)"
                stroke="var(--blueprint-accent)"
                strokeWidth="0.3"
              />
              <text
                x={n.x}
                y={n.y + 1}
                textAnchor="middle"
                fill="var(--blueprint-graph-label)"
                fontSize="3.2"
                fontFamily="IBM Plex Mono, monospace"
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
