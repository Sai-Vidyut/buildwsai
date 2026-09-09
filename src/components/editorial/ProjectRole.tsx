import type { CoreProject } from '../../data/projects'

type ProjectRoleProps = {
  project: CoreProject
  className?: string
}

export function ProjectRole({ project, className = '' }: ProjectRoleProps) {
  if (!project.role) return null
  return <p className={`label-brand ${className}`}>{project.role}</p>
}
