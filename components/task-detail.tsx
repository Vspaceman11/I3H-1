'use client'

import { Task } from '@/lib/task-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Camera
} from 'lucide-react'

interface TaskDetailProps {
  task: Task
  onBack: () => void
  onStatusChange?: (taskId: string, status: Task['status']) => void
}

const priorityConfig = {
  high: { label: 'High Priority', className: 'bg-red-500/10 text-red-600 border-red-200' },
  medium: { label: 'Medium Priority', className: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  low: { label: 'Low Priority', className: 'bg-green-500/10 text-green-600 border-green-200' },
}

const statusConfig = {
  pending: { label: 'Pending', icon: AlertTriangle, className: 'bg-amber-500/10 text-amber-600' },
  'in-progress': { label: 'In Progress', icon: Clock, className: 'bg-primary/15 text-primary' },
  completed: { label: 'Completed', icon: CheckCircle, className: 'bg-green-500/10 text-green-600' },
}

export function TaskDetail({ task, onBack, onStatusChange }: TaskDetailProps) {
  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const StatusIcon = status.icon

  const handleStatusUpdate = (newStatus: Task['status']) => {
    onStatusChange?.(task.id, newStatus)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Go back</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold tracking-tight text-card-foreground">Task Details</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Photo */}
          {task.photo ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <img
                src={task.photo}
                alt={task.title}
                className="aspect-video w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-muted">
              <div className="text-center text-muted-foreground">
                <Camera className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No photo attached</p>
              </div>
            </div>
          )}

          {/* Title and badges */}
          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{task.title}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={priority.className}>
                {priority.label}
              </Badge>
              <Badge variant="secondary" className={status.className}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Description</h3>
            <p className="text-foreground leading-relaxed">{task.description}</p>
          </div>

          {/* Location and date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                <p className="text-foreground">
                  {task.location.lat.toFixed(4)}, {task.location.lng.toFixed(4)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                <p className="text-foreground">
                  {task.createdAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Update Status</h3>
            <div className="flex flex-wrap gap-2">
              {task.status !== 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('pending')}
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Mark Pending
                </Button>
              )}
              {task.status !== 'in-progress' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('in-progress')}
                  className="gap-2"
                >
                  <Clock className="h-4 w-4 text-primary" />
                  Start Progress
                </Button>
              )}
              {task.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate('completed')}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
