import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

function Stage({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--color-void)] p-4 text-[var(--color-paper)] md:p-5">
      <p className="label text-[var(--color-signal)]">{label}</p>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="label min-h-11 border px-3 text-left transition-colors duration-200"
      style={{
        borderColor: pressed ? 'var(--color-signal)' : 'rgba(235,233,226,0.2)',
        color: pressed ? 'var(--color-signal)' : 'var(--color-paper)',
      }}
    >
      {children}
    </button>
  )
}

export function PeffleSystem() {
  const cap = 10
  const [spent, setSpent] = useState(0)
  const [line, setLine] = useState('Budget 0/10. Nothing has been charged.')

  function charge(amount: number) {
    const next = spent + amount
    if (next > cap) {
      setLine(`DENY — ${next} would exceed ${cap}. Ledger still records the attempt.`)
      return
    }
    setSpent(next)
    setLine(`ALLOW — policy matched. Budget ${next}/${cap}.`)
  }

  return (
    <Stage label="Guard · in-process">
      <p className="font-[family-name:var(--font-serif)] text-[1.05rem] leading-snug" aria-live="polite">
        {line}
      </p>
      <p className="label mt-3 text-[var(--color-void-mute)]">Daily cap {cap}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Chip onClick={() => charge(8)}>Charge 8</Chip>
        <Chip onClick={() => charge(5)}>Charge 5</Chip>
        <Chip
          onClick={() => {
            setSpent(0)
            setLine('Reset. Budget 0/10.')
          }}
        >
          Reset
        </Chip>
      </div>
    </Stage>
  )
}

const regions = [
  { id: 'surface', label: 'Surface', note: 'Change is drawn on the map, not returned as a bare sentence.' },
  { id: 'water', label: 'Water edge', note: 'The answer stays attached to the geometry you can inspect.' },
  { id: 'built', label: 'Built-up', note: 'Optical and SAR traces point at this region, not at a score.' },
] as const

export function SatQuerySystem() {
  const [active, setActive] = useState<(typeof regions)[number]['id']>('surface')
  const region = regions.find((item) => item.id === active) ?? regions[0]

  return (
    <Stage label="Evidence · on the map">
      <div className="grid flex-1 grid-cols-[1.1fr_0.9fr] gap-3">
        <svg viewBox="0 0 160 120" className="h-28 w-full" role="img" aria-label="Schematic evidence map">
          <rect width="160" height="120" fill="#14160f" />
          {regions.map((item, i) => {
            const on = item.id === active
            const x = 18 + i * 46
            return (
              <g key={item.id}>
                <rect
                  x={x}
                  y={28 + (i % 2) * 16}
                  width="36"
                  height="48"
                  fill={on ? '#e04500' : '#243044'}
                  opacity={on ? 0.95 : 0.7}
                />
              </g>
            )
          })}
        </svg>
        <div>
          <p className="font-[family-name:var(--font-serif)] text-[1.02rem] leading-snug">{region.note}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {regions.map((item) => (
          <Chip key={item.id} pressed={item.id === active} onClick={() => setActive(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>
    </Stage>
  )
}

export function InvoiceSystem() {
  const [mode, setMode] = useState<'invoice' | 'remind'>('invoice')

  return (
    <Stage label="Sample · not a live charge">
      <div className="flex gap-2">
        <Chip pressed={mode === 'invoice'} onClick={() => setMode('invoice')}>
          Invoice
        </Chip>
        <Chip pressed={mode === 'remind'} onClick={() => setMode('remind')}>
          Reminder
        </Chip>
      </div>
      <div className="mt-3 flex-1 bg-[var(--color-paper)] p-4 text-[var(--color-ink)]">
        {mode === 'invoice' ? (
          <>
            <p className="label text-[var(--color-mute)]">Example Studio → Sample Client</p>
            <p className="display mt-2 text-3xl">₹56,640</p>
            <p className="mt-1 font-[family-name:var(--font-serif)] text-[var(--color-ink-soft)]">
              Sample tax invoice with IGST. The real product exports this after payment.
            </p>
          </>
        ) : (
          <>
            <p className="label text-[var(--color-mute)]">Follow-up · day 7</p>
            <p className="mt-2 font-[family-name:var(--font-serif)] text-[1.05rem] leading-snug">
              Checking on invoice EX-1. Balance due on the date printed on the invoice.
            </p>
          </>
        )}
      </div>
    </Stage>
  )
}

const docnaSteps = [
  { title: 'Detect', body: 'Questions are found in the document. The file is not rewritten yet.' },
  { title: 'Draft', body: 'The model proposes answer text. Placement is still a structured operation.' },
  { title: 'Write copy', body: 'The adapter mutates a copy. The original stays untouched.' },
] as const

export function DocnaSystem() {
  const [step, setStep] = useState(0)
  const current = docnaSteps[step] ?? docnaSteps[0]

  return (
    <Stage label="Original stays put">
      <p className="display text-2xl">{current.title}</p>
      <p className="mt-2 font-[family-name:var(--font-serif)] text-[1.02rem] leading-snug text-[var(--color-void-mute)]">
        {current.body}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {docnaSteps.map((item, i) => (
          <Chip key={item.title} pressed={i === step} onClick={() => setStep(i)}>
            0{i + 1} {item.title}
          </Chip>
        ))}
      </div>
    </Stage>
  )
}

const clips = ['Balcony · golden hour', 'Kitchen prep', 'Street night', 'Interview room A']

export function SlyvrSystem() {
  const [query, setQuery] = useState('')
  const shown = clips.filter((clip) => clip.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <Stage label="Demo clips · local filter">
      <label className="label text-[var(--color-void-mute)]" htmlFor="slyvr-query">
        Find a moment
      </label>
      <input
        id="slyvr-query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Try balcony"
        className="mt-2 min-h-11 border border-[var(--color-void-line)] bg-transparent px-3 font-[family-name:var(--font-serif)] text-[var(--color-paper)] outline-none placeholder:text-[var(--color-void-mute)] focus-visible:border-[var(--color-signal)]"
      />
      <ul className="mt-3 space-y-2">
        {shown.length === 0 ? (
          <li className="font-[family-name:var(--font-serif)] text-[var(--color-void-mute)]">No clip matches.</li>
        ) : (
          shown.map((clip) => (
            <li key={clip} className="border-b border-[var(--color-void-line)] pb-2 font-[family-name:var(--font-serif)]">
              {clip}
            </li>
          ))
        )}
      </ul>
    </Stage>
  )
}

const blueprintNodes = ['Idea', 'Schema', 'API', 'Diagram']

export function BlueprintSystem() {
  const reduced = useReducedMotion()
  const [lit, setLit] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current)
    }
  }, [])

  function compile() {
    if (timer.current !== null) window.clearInterval(timer.current)
    if (reduced) {
      setLit(blueprintNodes.length)
      return
    }
    setLit(1)
    let step = 1
    timer.current = window.setInterval(() => {
      step += 1
      setLit(step)
      if (step >= blueprintNodes.length && timer.current !== null) {
        window.clearInterval(timer.current)
        timer.current = null
      }
    }, 320)
  }

  return (
    <Stage label="Compiled · not drawn by the model">
      <ol className="grid grid-cols-4 gap-2">
        {blueprintNodes.map((node, i) => {
          const on = i < lit
          return (
            <li
              key={node}
              className="border px-2 py-3 text-center label transition-colors duration-300"
              style={{
                borderColor: on ? 'var(--color-signal)' : 'rgba(235,233,226,0.18)',
                color: on ? 'var(--color-paper)' : 'var(--color-void-mute)',
              }}
            >
              {node}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 font-[family-name:var(--font-serif)] text-[1.02rem] leading-snug text-[var(--color-void-mute)]">
        {lit >= blueprintNodes.length
          ? 'Diagram comes from the schema. The model does not invent the graph.'
          : 'Zod stays the source of truth. Compile walks the structure in order.'}
      </p>
      <div className="mt-auto pt-4">
        <Chip onClick={compile}>Compile</Chip>
      </div>
    </Stage>
  )
}

const systems = {
  peffle: PeffleSystem,
  satquery: SatQuerySystem,
  'invoice-pack': InvoiceSystem,
  docna: DocnaSystem,
  slyvr: SlyvrSystem,
  blueprint: BlueprintSystem,
} as const

export function ProjectSystem({ id }: { id: string }) {
  const View = systems[id as keyof typeof systems]
  if (!View) return null
  return <View />
}
