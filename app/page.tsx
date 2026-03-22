'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { User, Plus, LocateFixed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskMap, TaskMapHandle, type ViewportRadiusParams } from '@/components/task-map'
import { PhotoCapture } from '@/components/photo-capture'
import { ReportForm } from '@/components/report-form'
import { UserProfile } from '@/components/user-profile'
import { IssueDetail } from '@/components/issue-detail'

type View = 'map' | 'photo' | 'report' | 'user' | 'issue-detail'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const allIssues = useQuery(api.issues.list) ?? []
  const [viewport, setViewport] = useState<ViewportRadiusParams | null>(null)
  const nearbyIssues =
    useQuery(
      api.issues.listInRadius,
      viewport
        ? {
            centerLat: viewport.centerLat,
            centerLng: viewport.centerLng,
            radiusMeters: viewport.radiusMeters,
          }
        : 'skip',
    ) ?? []

  const [view, setView] = useState<View>('map')
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<Id<"issues"> | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const mapRef = useRef<TaskMapHandle>(null)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    if (searchParams.get('view') === 'user') {
      setView('user')
    }
  }, [searchParams])

  const handlePhotoCapture = useCallback((file: File, previewUrl: string) => {
    setCapturedFile(file)
    setCapturedPreview(previewUrl)
    setView('report')
  }, [])

  const handleReportDone = useCallback((issueId: Id<"issues">) => {
    setCapturedFile(null)
    setCapturedPreview(null)
    setSelectedIssueId(issueId)
    setView('issue-detail')
  }, [])

  const handleIssueClick = useCallback((id: string) => {
    setSelectedIssueId(id as Id<"issues">)
    setView('issue-detail')
  }, [])

  const closeOverlay = useCallback(() => {
    setCapturedFile(null)
    setCapturedPreview(null)
    setView('map')
  }, [])

  const handleViewportChange = useCallback((p: ViewportRadiusParams) => {
    setViewport(p)
  }, [])

  const mapTasks = nearbyIssues.map((issue) => ({
    id: issue._id,
    lat: issue.latitude ?? 49.1427,
    lng: issue.longitude ?? 9.2109,
    severity: issue.severity ?? 'MEDIUM' as const,
    category: issue.category,
    status: issue.analysisStatus ?? issue.status,
    imageUrl: issue.resolvedImageUrl,
  }))

  if (view === 'user') {
    return (
      <UserProfile
        issues={allIssues}
        onBack={() => {
          setView('map')
          router.replace('/')
        }}
      />
    )
  }

  if (view === 'issue-detail' && selectedIssueId) {
    return (
      <IssueDetail
        issueId={selectedIssueId}
        onBack={() => { setSelectedIssueId(null); setView('map') }}
      />
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <TaskMap
        ref={mapRef}
        tasks={mapTasks}
        onTaskClick={handleIssueClick}
        onViewportChange={handleViewportChange}
      />

      <Button
        variant="secondary"
        size="icon"
        onClick={() => setView('user')}
        className="absolute right-4 top-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-card border border-border"
      >
        <User className="h-5 w-5" />
      </Button>

      {view === 'map' && (
        <Button
          variant="secondary"
          size="icon"
          onClick={() => mapRef.current?.centerOnUser()}
          className="absolute bottom-8 right-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-card border border-border"
        >
          <LocateFixed className="h-5 w-5 text-primary" />
        </Button>
      )}

      {view === 'map' && (
        <Button
          onClick={() => setView('photo')}
          className="absolute bottom-8 left-1/2 z-[1000] h-14 w-14 -translate-x-1/2 rounded-full shadow-xl"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {view === 'photo' && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          onClose={closeOverlay}
          autoStart={isMobile}
        />
      )}

      {view === 'report' && capturedFile && capturedPreview && (
        <ReportForm
          file={capturedFile}
          previewUrl={capturedPreview}
          onBack={closeOverlay}
          onDone={handleReportDone}
        />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center">Loading…</div>}>
      <HomeContent />
    </Suspense>
  )
}
