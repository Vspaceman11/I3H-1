/**
 * Convex may leave `analysisStatus` on "pending" / "analyzing" while other fields
 * are already filled, or n8n may persist results under fields we did not check.
 * Stop showing the blocking spinner when the document clearly moved past analysis
 * or the analyzing state is unreasonably old.
 */
export type DisplayAnalysisStatus = 'pending' | 'analyzing' | 'done' | 'error' | null

/** After this, "analyzing" without any result signals is treated as stale (spinner hidden). */
const STALE_ANALYZING_MS = 2 * 60 * 1000

/** "pending" before n8n is triggered — allow longer before we give up showing it. */
const STALE_PENDING_MS = 4 * 60 * 1000

export function issueShowsAnalysisSignals(issue: {
  ai_description?: string | null
  category?: string | null
  address?: string | null
  authority_type?: string | null
  n8nExecutionId?: string | null
  priority_score?: number | null
  points_awarded?: number | null
  safety_concern?: boolean | null
}): boolean {
  return (
    Boolean(issue.ai_description?.trim()) ||
    Boolean(issue.category?.trim()) ||
    Boolean(issue.address?.trim()) ||
    Boolean(issue.authority_type?.trim()) ||
    Boolean(issue.n8nExecutionId?.trim()) ||
    (issue.priority_score ?? 0) > 0 ||
    (issue.points_awarded ?? 0) > 0 ||
    issue.safety_concern === true
  )
}

export function getDisplayAnalysisStatus(issue: {
  _creationTime?: number
  analysisStatus?: 'pending' | 'analyzing' | 'done' | 'error' | null
  ai_description?: string | null
  category?: string | null
  address?: string | null
  authority_type?: string | null
  n8nExecutionId?: string | null
  priority_score?: number | null
  points_awarded?: number | null
  safety_concern?: boolean | null
}): DisplayAnalysisStatus {
  if (issue.analysisStatus === 'error') return 'error'

  const signals = issueShowsAnalysisSignals(issue)

  if (issue.analysisStatus === 'done' || signals) return 'done'

  const ageMs =
    typeof issue._creationTime === 'number' ? Date.now() - issue._creationTime : 0

  if (issue.analysisStatus === 'pending') {
    if (ageMs > STALE_PENDING_MS) return null
    return 'pending'
  }

  if (issue.analysisStatus === 'analyzing') {
    if (ageMs > STALE_ANALYZING_MS) return null
    return 'analyzing'
  }

  return null
}
