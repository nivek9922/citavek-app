export type StrikeRecord = {
  id: string
  createdAt: Date
  forgiven: boolean
  appointmentId: string
}

export type RiskStatus = {
  activeStrikes: number
  threshold: number
  isAtRisk: boolean
  recentStrikes: StrikeRecord[]
}

const WINDOW_DAYS = 90

export function computeRiskStatus(
  strikes: StrikeRecord[],
  threshold: number,
  policyActive: boolean,
  now: Date,
): RiskStatus {
  if (!policyActive) {
    return { activeStrikes: 0, threshold, isAtRisk: false, recentStrikes: [] }
  }
  const cutoff = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const recent = strikes.filter((s) => !s.forgiven && s.createdAt >= cutoff)
  return {
    activeStrikes: recent.length,
    threshold,
    isAtRisk: recent.length >= threshold,
    recentStrikes: recent,
  }
}
