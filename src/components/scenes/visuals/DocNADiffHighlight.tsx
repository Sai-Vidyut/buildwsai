import { cn } from '../../../lib/cn'

type Props = {
  active?: boolean
  className?: string
}

const cornerClass =
  'absolute h-3 w-3 border-[var(--docna-accent)]/45 transition-opacity duration-500'

/** Highlights the mutation target region on the DocNA review still. */
export function DocNADiffHighlight({ active = true, className = '' }: Props) {
  return (
    <div
      className={cn('absolute pointer-events-none', className)}
      style={{ left: '8%', top: '34%', width: '52%', height: '22%' }}
      aria-hidden
    >
      <div
        className={cn(cornerClass, 'left-0 top-0 border-t border-l', active ? 'opacity-100' : 'opacity-0')}
      />
      <div
        className={cn(cornerClass, 'right-0 top-0 border-t border-r', active ? 'opacity-100' : 'opacity-0')}
      />
      <div
        className={cn(cornerClass, 'bottom-0 left-0 border-b border-l', active ? 'opacity-100' : 'opacity-0')}
      />
      <div
        className={cn(cornerClass, 'bottom-0 right-0 border-b border-r', active ? 'opacity-100' : 'opacity-0')}
      />
      <span
        className={cn(
          'absolute -top-5 left-0 label-brand text-[var(--docna-accent)]/75 transition-opacity',
          active ? 'opacity-100' : 'opacity-0',
        )}
      >
        Mutation target
      </span>
    </div>
  )
}
