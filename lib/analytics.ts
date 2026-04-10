export function parseDateRange(startDate: string | null, endDate: string | null) {
  const end = endDate ? new Date(endDate) : new Date()
  end.setHours(23, 59, 59, 999)
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 6 * 86400000)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export function getPreviousPeriod(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  prevEnd.setHours(23, 59, 59, 999)
  const prevStart = new Date(prevEnd.getTime() - diff)
  prevStart.setHours(0, 0, 0, 0)
  return { prevStart, prevEnd }
}
