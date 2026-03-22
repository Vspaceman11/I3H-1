'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  CheckCircle, Clock, AlertTriangle, LogOut, User, UserPlus,
  Trophy, FileText, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapOverlayShell } from '@/components/map-overlay-shell'

interface UserProfileProps {
  onBack: () => void
  onIssueClick: (id: Id<"issues">) => void
}

export function UserProfile({ onBack, onIssueClick }: UserProfileProps) {
  const { signOut } = useAuthActions()
  const { isLoading: authLoading, isAuthenticated: convexAuthenticated } = useConvexAuth()
  const currentUser = useQuery(api.users.currentUser)
  const userIssues = useQuery(
    api.issues.listByUser,
    currentUser ? { user_id: currentUser._id } : 'skip',
  ) ?? []

  const isAuthenticated = convexAuthenticated && currentUser != null
  const isLoading =
    authLoading || (convexAuthenticated && currentUser === undefined)
  const sessionWithoutUser =
    !authLoading && convexAuthenticated && currentUser === null

  const totalReports = userIssues.length
  const resolved = userIssues.filter((i) => i.status === 'resolved' || i.status === 'approved').length
  const open = userIssues.filter((i) => i.status === 'open').length
  const analyzing = userIssues.filter(
    (i) => i.analysisStatus === 'pending' || i.analysisStatus === 'analyzing',
  ).length

  const stats = [
    { label: 'Resolved', value: resolved, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Open', value: open, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Analyzing', value: analyzing, icon: Clock, color: 'text-blue-500' },
  ]

  const recent = [...userIssues]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 5)

  const displayName = currentUser?.name ?? 'Citizen Reporter'
  const avatarSrc = currentUser?.image ?? currentUser?.avatar_url ?? undefined
  const avatarFallback = displayName.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'PE'

  return (
    <MapOverlayShell title="Profile" onClose={onBack}>
      <div className="space-y-4 p-4">
          {isLoading ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground">
              <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded bg-muted" />
              <p className="text-sm">Checking sign-in status…</p>
            </div>
          ) : sessionWithoutUser ? (
            <div className="rounded-xl bg-card border border-border p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-destructive">Could not load your profile</p>
              <p className="mt-2">Try signing out and signing in again.</p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          ) : isAuthenticated ? (
            <>
              {/* Avatar card */}
              <div className="rounded-xl bg-card border border-border p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-card-foreground truncate">{displayName}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{currentUser?.email ?? 'Heilbronn'}</p>
                  </div>
                </div>
              </div>

              {/* Points & reports summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-card border border-border p-4 text-center">
                  <Trophy className="mx-auto h-6 w-6 text-amber-500" />
                  <p className="mt-2 text-2xl font-bold text-card-foreground">{currentUser.total_points}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="rounded-xl bg-card border border-border p-4 text-center">
                  <FileText className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-2 text-2xl font-bold text-card-foreground">{totalReports}</p>
                  <p className="text-xs text-muted-foreground">Reports</p>
                </div>
              </div>

              {/* Stats grid */}
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

              {/* Recent reports */}
              <div className="rounded-xl bg-card border border-border">
                <div className="border-b border-border p-4">
                  <h3 className="font-semibold text-card-foreground">Recent Reports</h3>
                </div>
                <div className="divide-y divide-border">
                  {recent.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">No reports yet</p>
                  )}
                  {recent.map((issue) => (
                    <button
                      key={issue._id}
                      type="button"
                      onClick={() => onIssueClick(issue._id)}
                      className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{issue.status}</span>
                          {issue.points_awarded > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-amber-500 font-medium">+{issue.points_awarded} pts</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(issue._creationTime).toLocaleDateString()}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign out */}
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
                href="/?auth=sign-in"
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-card-foreground">Sign In</span>
              </Link>
              <Link
                href="/?auth=sign-up"
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-card-foreground">Sign Up</span>
              </Link>
            </div>
          )}
      </div>
    </MapOverlayShell>
  )
}
