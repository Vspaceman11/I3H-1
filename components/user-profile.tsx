'use client'

import { ArrowLeft, CheckCircle, Clock, AlertTriangle, LogOut, Settings, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Task } from '@/lib/task-store'

interface UserProfileProps {
  tasks: Task[]
  onBack: () => void
}

export function UserProfile({ tasks, onBack }: UserProfileProps) {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length

  const stats = [
    { label: 'Completed', value: completedTasks, icon: CheckCircle, color: 'text-green-500' },
    { label: 'In Progress', value: inProgressTasks, icon: Clock, color: 'text-amber-500' },
    { label: 'Pending', value: pendingTasks, icon: AlertTriangle, color: 'text-red-500' },
  ]

  const recentTasks = [...tasks].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-card-foreground">Profile</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Profile card */}
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-card-foreground">John Doe</h2>
                <p className="text-sm text-muted-foreground">Field Technician</p>
                <p className="text-xs text-muted-foreground">john.doe@company.com</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="rounded-xl bg-card border border-border p-4 text-center"
                >
                  <Icon className={`mx-auto h-6 w-6 ${stat.color}`} />
                  <p className="mt-2 text-2xl font-bold text-card-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              )
            })}
          </div>

          {/* Recent tasks */}
          <div className="rounded-xl bg-card border border-border">
            <div className="border-b border-border p-4">
              <h3 className="font-semibold text-card-foreground">Recent Tasks</h3>
            </div>
            <div className="divide-y divide-border">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-4">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      task.status === 'completed'
                        ? 'bg-green-500'
                        : task.status === 'in-progress'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-card-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{task.status}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Menu items */}
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-card-foreground">Settings</span>
            </button>
            <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="text-card-foreground">Notifications</span>
            </button>
            <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors text-destructive">
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
