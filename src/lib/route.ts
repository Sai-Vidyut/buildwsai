/** Invoice Pack lives on the portfolio origin at /invoice-pack. */
export function isInvoicePackPath(pathname: string): boolean {
  const path = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/'
  return path === '/invoice-pack'
}
