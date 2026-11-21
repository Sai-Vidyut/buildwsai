import qrcode from './vendor/qrcode.js'

export type QrGrid = {
  count: number
  dark: (row: number, col: number) => boolean
}

export function makeQr(text: string): QrGrid {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const count = qr.getModuleCount()
  return {
    count,
    dark: (row, col) => qr.isDark(row, col),
  }
}
