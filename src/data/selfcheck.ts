/** ponytail: assert portfolio content integrity; expand if featured set grows. */
import { featuredProjects, labProjects } from './projects.ts'
import { site } from './site.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(site.brand === 'BuildWSai', 'brand')
assert(site.email.includes('@'), 'email')
assert(featuredProjects.length >= 5, 'featured count')
assert(featuredProjects.every((p) => p.name && p.summary && p.problem), 'featured fields')
assert(featuredProjects.some((p) => p.id === 'invoice-pack'), 'invoice pack featured')
assert(labProjects.length >= 1, 'lab')

console.log('portfolio data checks ok')
