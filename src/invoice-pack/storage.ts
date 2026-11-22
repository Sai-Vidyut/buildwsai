export type StoredEnquiry = {
  name: string
  email: string
  note: string
  at: string
  payment: false
  sent: false
}

const ENQUIRY_KEY = 'invoice-pack-enquiries'

function readArray(key: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isEnquiry(value: unknown): value is StoredEnquiry {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.name === 'string' &&
    row.name.length > 0 &&
    row.name.length <= 120 &&
    typeof row.email === 'string' &&
    row.email.length <= 160 &&
    typeof row.note === 'string' &&
    row.note.length <= 1000 &&
    typeof row.at === 'string' &&
    row.at.length <= 40 &&
    row.payment === false &&
    row.sent === false
  )
}

export function loadEnquiries(): StoredEnquiry[] {
  return readArray(ENQUIRY_KEY).filter(isEnquiry).slice(0, 20)
}

export function saveEnquiry(item: StoredEnquiry): boolean {
  try {
    const all = [item, ...loadEnquiries()].slice(0, 20)
    localStorage.setItem(ENQUIRY_KEY, JSON.stringify(all))
    return true
  } catch {
    return false
  }
}