'use client'

import dynamic from 'next/dynamic'
import { forwardRef } from 'react'
import type { TaskMapHandle } from './task-map-inner'
import type { Task } from '@/lib/task-store'

export type { TaskMapHandle }

interface TaskMapProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

// Dynamically import the inner map (which imports Leaflet) with SSR disabled.
// This is required for Turbopack compatibility — CSS imports inside require() are not supported.
const TaskMapDynamic = dynamic(
  () => import('./task-map-inner').then((m) => m.TaskMapInner),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
  }
)

export const TaskMap = forwardRef<TaskMapHandle, TaskMapProps>(
  function TaskMap(props, ref) {
    return <TaskMapDynamic {...props} ref={ref} />
  }
)
