'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { User, Plus, LocateFixed, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskMap, TaskMapHandle } from '@/components/task-map'
import { PhotoCapture } from '@/components/photo-capture'
import { ReportForm } from '@/components/report-form'
import { UserProfile } from '@/components/user-profile'
import { IssueDetail } from '@/components/issue-detail'
import { AuthOverlay } from '@/components/auth-overlay'
import { RewardsShop } from '@/components/rewards-shop'

type View = 'map' | 'photo' | 'report' | 'user' | 'issue-detail' | 'rewards'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const allIssues = useQuery(api.issues.list) ?? []

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
    if (searchParams.get('view') !== 'user') return
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/?auth=sign-in')
      return
    }
    setView('user')
  }, [searchParams, authLoading, isAuthenticated, router])

  useEffect(() => {
    const a = searchParams.get('auth')
    if (a !== 'sign-in' && a !== 'sign-up') return
    setView((v) => (v === 'user' ? 'map' : v))
  }, [searchParams])

  const openProfileOrAuth = useCallback(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push('/?auth=sign-in')
      return
    }
    setView('user')
  }, [authLoading, isAuthenticated, router])

  const authParam = searchParams.get('auth')
  const showAuthOverlay =
    view === 'map' && (authParam === 'sign-in' || authParam === 'sign-up')

  const showMapFloatingChrome = view === 'map' && !showAuthOverlay

  const closeAuthOverlay = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete('auth')
    const q = sp.toString()
    router.replace(q ? `/?${q}` : '/')
  }, [router, searchParams])

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

  const mapTasks = allIssues.map((issue) => ({
    id: issue._id,
    lat: issue.latitude ?? 49.1427,
    lng: issue.longitude ?? 9.2109,
    severity: issue.severity ?? 'MEDIUM' as const,
    category: issue.category,
    status: issue.analysisStatus ?? issue.status,
    imageUrl: issue.resolvedImageUrl,
  }))

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <TaskMap ref={mapRef} tasks={mapTasks} onTaskClick={handleIssueClick} />

      {showMapFloatingChrome && (
        <>
          <Button
            variant="secondary"
            size="icon"
            onClick={openProfileOrAuth}
            className="absolute right-4 top-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-card border border-border"
          >
            <User className="h-5 w-5" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              if (!isAuthenticated) {
                router.push('/?auth=sign-in')
                return
              }
              setView('rewards')
            }}
            className="absolute right-4 top-20 z-[1000] h-12 w-12 rounded-full shadow-lg bg-card border border-border"
          >
            <Gift className="h-5 w-5 text-amber-500" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => mapRef.current?.centerOnUser()}
            className="absolute bottom-8 right-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-card border border-border"
          >
            <LocateFixed className="h-5 w-5 text-primary" />
          </Button>

          <Button
            onClick={() => {
              if (!isAuthenticated) {
                router.push('/?auth=sign-in')
                return
              }
              setView('photo')
            }}
            className="absolute bottom-8 left-1/2 z-[1000] h-14 w-14 -translate-x-1/2 rounded-full shadow-xl"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </>
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

      {showAuthOverlay && (
        <AuthOverlay
          initialFlow={authParam === 'sign-up' ? 'signUp' : 'signIn'}
          onClose={closeAuthOverlay}
          onSignedIn={() => {
            window.location.href = '/?view=user'
          }}
        />
      )}

      {view === 'user' && (
        <UserProfile
          issues={allIssues}
          onBack={() => {
            setView('map')
            router.replace('/')
          }}
        />
      )}

      {view === 'issue-detail' && selectedIssueId && (
        <IssueDetail
          issueId={selectedIssueId}
          onBack={() => {
            setSelectedIssueId(null)
            setView('map')
          }}
        />
      )}

      {view === 'rewards' && (
        <RewardsShop onBack={() => setView('map')} />
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
