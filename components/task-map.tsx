'use client'

import dynamic from 'next/dynamic'
import { forwardRef } from 'react'
import type { TaskMapHandle, MapIssue, ViewportRadiusParams } from './task-map-inner'

export type { TaskMapHandle, MapIssue, ViewportRadiusParams }

interface TaskMapProps {
  tasks: MapIssue[]
  onTaskClick?: (id: string) => void
}

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
  },
)
