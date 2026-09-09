import { useMagnetic } from '../../hooks/useMagnetic'

type TextLinkProps = {
  href: string
  children: React.ReactNode
  external?: boolean
  className?: string
  underline?: boolean
}

export function TextLink({ href, children, external, className = '', underline = true }: TextLinkProps) {
  const magnetic = useMagnetic<HTMLAnchorElement>(0.25)

  return (
    <a
      ref={magnetic}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`inline-block text-link ${underline ? 'text-link-underline' : ''} ${className}`}
    >
      {children}
    </a>
  )
}
