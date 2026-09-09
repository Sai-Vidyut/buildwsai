import { cn } from '../../../lib/cn'

type Props = {
  active?: boolean
  className?: string
}

/** Highlights the mutation target region on the DocNA review still. */
export function DocNADiffHighlight({ active = true, className = '' }: Props) {
  return (
    <div
      className={cn('absolute pointer-events-none', className)}
      style={{ left: '8%', top: '34%', width: '52%', height: '22%' }}
      aria-hidden
    >
      <div
        className={cn(
          'absolute inset-0 border-2 border-[var(--docna-accent)] transition-opacity duration-500',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'absolute inset-0 bg-[var(--docna-accent)]/10',
          active && 'animate-pulse',
        )}
        style={{ animationDuration: '2.4s' }}
      />
      <span
        className={cn(
          'absolute -top-6 left-0 label-brand text-[var(--docna-accent)] transition-opacity',
          active ? 'opacity-100' : 'opacity-0',
        )}
      >
        Mutation target
      </span>
    </div>
  )
}
