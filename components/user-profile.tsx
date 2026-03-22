'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, LogOut, User, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Issue {
  _id: string
  _creationTime: number
  status: string
  analysisStatus?: string | null
  category?: string | null
  ai_description?: string | null
  severity: string
}

interface UserProfileProps {
  issues: Issue[]
  onBack: () => void
}

export function UserProfile({ issues, onBack }: UserProfileProps) {
  const { signOut } = useAuthActions()
  const { isLoading: authLoading } = useConvexAuth()
  const currentUser = useQuery(api.users.currentUser)
  const userIssues = useQuery(
    api.issues.listByUser,
    currentUser ? { user_id: currentUser._id } : 'skip',
  ) ?? []

  const isAuthenticated = currentUser != null
  const isLoading = authLoading || currentUser === undefined
  const displayIssues = isAuthenticated ? userIssues : issues
  const resolved = displayIssues.filter((i) => i.status === 'resolved' || i.status === 'approved').length
  const open = displayIssues.filter((i) => i.status === 'open').length
  const analyzing = displayIssues.filter(
    (i) => i.analysisStatus === 'pending' || i.analysisStatus === 'analyzing',
  ).length

  const stats = [
    { label: 'Resolved', value: resolved, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Open', value: open, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Analyzing', value: analyzing, icon: Clock, color: 'text-blue-500' },
  ]

  const recent = [...displayIssues]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 5)

  const displayName = currentUser?.name ?? 'Citizen Reporter'
  const displayLocation = 'Heilbronn'
  const avatarSrc = currentUser?.image ?? currentUser?.avatar_url ?? undefined
  const avatarFallback = displayName.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'PE'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-card-foreground">Profile</h1>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mx-auto max-w-lg space-y-6">
          {isLoading ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground">
              <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded bg-muted" />
              <p className="text-sm">Checking sign-in status…</p>
            </div>
          ) : isAuthenticated ? (
            <>
              <div className="rounded-xl bg-card border border-border p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-card-foreground truncate">{displayName}</h2>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Signed in
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{currentUser?.email ?? displayLocation}</p>
                    <p className="text-xs text-muted-foreground">{displayIssues.length} reports</p>
                    {currentUser && (
                      <p className="text-xs text-muted-foreground mt-0.5">{currentUser.total_points} points</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {stats.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="rounded-xl bg-card border border-border p-4 text-center">
                      <Icon className={`mx-auto h-6 w-6 ${stat.color}`} />
                      <p className="mt-2 text-2xl font-bold text-card-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-xl bg-card border border-border">
                <div className="border-b border-border p-4">
                  <h3 className="font-semibold text-card-foreground">Recent Reports</h3>
                </div>
                <div className="divide-y divide-border">
                  {recent.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">No reports yet</p>
                  )}
                  {recent.map((issue) => (
                    <div key={issue._id} className="flex items-center gap-3 p-4">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          issue.status === 'resolved' || issue.status === 'approved'
                            ? 'bg-green-500'
                            : issue.analysisStatus === 'error'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-card-foreground">
                          {issue.category ?? 'Pending analysis'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{issue.status}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(issue._creationTime).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-card border border-border">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors text-destructive"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-card border border-border divide-y divide-border">
              <Link
                href="/sign-in"
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-card-foreground">Sign In</span>
              </Link>
              <Link
                href="/sign-up"
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-card-foreground">Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
