'use client'

import type { ReactNode } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Shield,
  Tag,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapOverlayShell } from '@/components/map-overlay-shell'
import { getDisplayAnalysisStatus } from '@/lib/effective-analysis-status'

interface IssueDetailProps {
  issueId: Id<"issues">
  onBack: () => void
}

const severityConfig = {
  EASY: { label: 'Low', color: 'bg-green-500', textColor: 'text-green-700' },
  MEDIUM: { label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-700' },
  HIGH: { label: 'High', color: 'bg-red-500', textColor: 'text-red-700' },
} as const

export function IssueDetail({ issueId, onBack }: IssueDetailProps) {
  const issue = useQuery(api.issues.get, { id: issueId })
  const retryAnalysis = useAction(api.issues.triggerN8nAnalysis)

  let body: ReactNode
  if (issue === undefined) {
    body = (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  } else if (issue === null) {
    body = (
      <div className="space-y-4 p-6 text-center">
        <p className="text-muted-foreground">Issue not found</p>
        <Button type="button" onClick={onBack}>
          Go back
        </Button>
      </div>
    )
  } else {
    const sev = severityConfig[issue.severity]
    const analysisStatus = getDisplayAnalysisStatus(issue)

    const handleRetry = () => {
      if (!issue.storageId) return
      retryAnalysis({
        issueId: issue._id,
        storageId: issue.storageId,
        userId: issue.user_id as string,
        userDescription: issue.user_description,
        latitude: issue.latitude,
        longitude: issue.longitude,
      })
    }

    body = (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {analysisStatus === 'pending' && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Pending
                </Badge>
              )}
              {analysisStatus === 'analyzing' && (
                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
                  <Loader2 className="h-3 w-3 animate-spin" /> Analyzing…
                </Badge>
              )}
              {analysisStatus === 'done' && (
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3" /> Done
                </Badge>
              )}
              {analysisStatus === 'error' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Error
                </Badge>
              )}
              {!analysisStatus && (
                <Badge variant="outline" className="capitalize">{issue.status}</Badge>
              )}
            </div>

            {issue.resolvedImageUrl && (
              <div className="aspect-[16/10] max-h-[32vh] w-full overflow-hidden rounded-xl bg-muted">
                <img src={issue.resolvedImageUrl} alt="Issue" className="h-full w-full object-cover" />
              </div>
            )}

            {(analysisStatus === 'pending' || analysisStatus === 'analyzing') && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">AI is analyzing your photo…</p>
                  <p className="text-sm text-blue-700">Results will appear here automatically</p>
                </div>
              </div>
            )}

            {analysisStatus === 'error' && (
              <div className="flex flex-col gap-3 rounded-lg bg-destructive/10 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <p className="font-medium text-destructive">Analysis failed</p>
                </div>
                {issue.analysisError && (
                  <p className="text-sm text-destructive/80">{issue.analysisError}</p>
                )}
                {issue.storageId && (
                  <Button variant="outline" size="sm" type="button" onClick={handleRetry} className="self-start">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry analysis
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Severity:</span>
                <span className={`flex items-center gap-1 text-sm font-medium ${sev.textColor}`}>
                  <span className={`h-2 w-2 rounded-full ${sev.color}`} />
                  {sev.label}
                </span>
              </div>

              {issue.category && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <span className="text-sm font-medium">{issue.category}</span>
                </div>
              )}

              {issue.priority_score > 0 && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Priority:</span>
                  <span className="text-sm font-medium">{issue.priority_score}/10</span>
                </div>
              )}

              {issue.ai_description ? (
                <div className="rounded-lg bg-field p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">AI Description</p>
                  <p className="text-sm">{issue.ai_description}</p>
                </div>
              ) : analysisStatus === 'done' ? (
                <p className="text-sm text-muted-foreground">No AI summary was stored for this report.</p>
              ) : null}

              {issue.safety_concern && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Safety concern detected</span>
                </div>
              )}
            </div>

            {issue.user_description && (
              <div className="rounded-lg border border-border bg-field p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">User Description</p>
                <p className="text-sm">{issue.user_description}</p>
              </div>
            )}

            {(issue.latitude !== undefined && issue.longitude !== undefined) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {issue.address ?? `${issue.latitude?.toFixed(4)}, ${issue.longitude?.toFixed(4)}`}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Created: {new Date(issue._creationTime).toLocaleString()}
            </p>
          </div>
    )
  }

  return (
    <MapOverlayShell title="Issue Details" onClose={onBack}>
      {body}
    </MapOverlayShell>
  )
}
