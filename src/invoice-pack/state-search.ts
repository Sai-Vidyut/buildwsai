import { STATES } from './logic.ts'

/** Extra search tokens per GST code (abbreviations and common shorthand). Does not change GST mapping. */
export const STATE_SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  '01': ['jk', 'j&k'],
  '02': ['hp'],
  '03': ['pb', 'pun'],
  '04': ['ch', 'chandigarh'],
  '05': ['uk', 'uttarakhand'],
  '06': ['hr'],
  '07': ['del', 'ncr'],
  '08': ['rj'],
  '09': ['up'],
  '10': ['br'],
  '11': ['sk'],
  '12': ['ar'],
  '13': ['nl'],
  '14': ['mn'],
  '15': ['mz'],
  '16': ['tr'],
  '17': ['ml'],
  '18': ['as'],
  '19': ['wb'],
  '20': ['jh'],
  '21': ['od', 'orissa'],
  '22': ['cg'],
  '23': ['mp'],
  '24': ['gj'],
  '26': ['dd', 'dnh', 'daman', 'diu'],
  '27': ['mh', 'maha', 'bombay', 'mumbai'],
  '29': ['ka', 'bangalore', 'bengaluru'],
  '30': ['ga'],
  '31': ['ld'],
  '32': ['kl'],
  '33': ['tn'],
  '34': ['py', 'pondy', 'pondicherry'],
  '35': ['an'],
  '36': ['ts', 'tel'],
  '37': ['ap'],
  '38': ['ladakh'],
}

export function stateMatchesQuery(row: readonly [string, string], rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  const [code, name] = row
  if (code.includes(query)) return true
  const haystack = [name.toLowerCase(), ...(STATE_SEARCH_ALIASES[code] ?? [])]
  return haystack.some((part) => part.includes(query))
}

export function stateLabelForCode(code: string): string | null {
  const row = STATES.find(([c]) => c === code)
  return row ? `${row[1]} (${code})` : null
}