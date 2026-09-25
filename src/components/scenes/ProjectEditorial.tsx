import type { CoreProject } from '../../data/projects'
import { PeffleScene } from './PeffleScene'
import { SatQueryScene } from './SatQueryScene'
import { DocNAScene } from './DocNAScene'
import { BluePrintScene } from './BluePrintScene'
import { SlyvrScene } from './SlyvrScene'

type Props = {
  project: CoreProject
  index: number
}

export function ProjectEditorial({ project, index }: Props) {
  switch (project.layout) {
    case 'observation':
      return <SatQueryScene project={project} index={index} />
    case 'guard':
      return <PeffleScene project={project} index={index} />
    case 'document':
      return <DocNAScene project={project} index={index} />
    case 'systems':
      return <BluePrintScene project={project} index={index} />
    case 'media':
      return <SlyvrScene project={project} index={index} />
    default:
      return null
  }
}
