type BrandLineProps = {
  primary: string
  secondary?: string
  className?: string
}

export function BrandLine({ primary, secondary, className = '' }: BrandLineProps) {
  return (
    <p className={`label-brand text-[var(--color-muted)] ${className}`}>
      {primary}
      {secondary && (
        <>
          <span className="mx-2 opacity-40">/</span>
          {secondary}
        </>
      )}
    </p>
  )
}
