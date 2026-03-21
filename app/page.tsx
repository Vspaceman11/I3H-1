'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Plus, LocateFixed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskMap, TaskMapHandle } from '@/components/task-map'
import { PhotoCapture } from '@/components/photo-capture'
import { NewTaskForm } from '@/components/new-task-form'
import { UserProfile } from '@/components/user-profile'
import { TaskDetail } from '@/components/task-detail'
import { mockTasks, Task, generateThumbnail } from '@/lib/task-store'

type View = 'map' | 'photo' | 'new-task' | 'user' | 'task-detail'

export default function Home() {
  const [view, setView] = useState<View>('map')
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const mapRef = useRef<TaskMapHandle>(null)

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handlePhotoCapture = async (photoUrl: string) => {
    setCapturedPhoto(photoUrl)
    const thumbnail = await generateThumbnail(photoUrl, 40)
    setCapturedThumbnail(thumbnail)
    setView('new-task')
  }

  const handleTaskSubmit = (taskData: {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    photo: string
    thumbnail: string
  }) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      status: 'pending',
      photo: taskData.photo,
      thumbnail: taskData.thumbnail,
      location: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.01,
        lng: -74.006 + (Math.random() - 0.5) * 0.01,
      },
      createdAt: new Date(),
    }
    setTasks([newTask, ...tasks])
    setCapturedPhoto(null)
    setCapturedThumbnail(null)
    setView('map')
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setView('task-detail')
  }

  const handleStatusChange = (taskId: string, status: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status })
    }
  }

  const closeOverlay = () => {
    setCapturedPhoto(null)
    setCapturedThumbnail(null)
    setView('map')
  }

  // Full-page views (no map underneath)
  if (view === 'user') {
    return <UserProfile tasks={tasks} onBack={() => setView('map')} />
  }

  if (view === 'task-detail' && selectedTask) {
    return (
      <TaskDetail
        task={selectedTask}
        onBack={() => { setSelectedTask(null); setView('map') }}
        onStatusChange={handleStatusChange}
      />
    )
  }

  // Main map view with overlays
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full screen map — always mounted */}
      <TaskMap ref={mapRef} tasks={tasks} onTaskClick={handleTaskClick} />

      {/* User button - top right */}
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setView('user')}
        className="absolute right-4 top-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-card border border-border"
      >
        <User className="h-5 w-5" />
        <span className="sr-only">User profile</span>
      </Button>

      {/* Locate user button - bottom right */}
      {view === 'map' && (
        <Button
          variant="secondary"
          size="icon"
          onClick={() => mapRef.current?.centerOnUser()}
          className="absolute bottom-8 right-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-card border border-border"
        >
          <LocateFixed className="h-5 w-5 text-primary" />
          <span className="sr-only">Center on my location</span>
        </Button>
      )}

      {/* New Task FAB - bottom center */}
      {view === 'map' && (
        <Button
          onClick={() => {
            // On mobile, skip photo-capture and go straight to camera
            if (isMobile) {
              setView('photo')
            } else {
              setView('photo')
            }
          }}
          className="absolute bottom-8 left-1/2 z-[1000] h-14 w-14 -translate-x-1/2 rounded-full shadow-xl"
          size="icon"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Create new task</span>
        </Button>
      )}

      {/* Photo capture — sheet over map */}
      {view === 'photo' && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          onClose={closeOverlay}
          autoStart={isMobile}
        />
      )}

      {/* New task form — sheet over map */}
      {view === 'new-task' && capturedPhoto && capturedThumbnail && (
        <NewTaskForm
          photo={capturedPhoto}
          thumbnail={capturedThumbnail}
          onBack={closeOverlay}
          onSubmit={handleTaskSubmit}
        />
      )}
    </div>
  )
}
