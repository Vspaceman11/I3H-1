'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Sparkles, MapPin, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NewTaskFormProps {
  photo: string
  thumbnail: string
  onBack: () => void
  onSubmit: (task: {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
    photo: string
    thumbnail: string
  }) => void
}

export function NewTaskForm({ photo, thumbnail, onBack, onSubmit }: NewTaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isGenerating, setIsGenerating] = useState(true)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Simulate AI description generation
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitle('Maintenance Issue Detected')
      setDescription(
        'Photo analysis detected a potential infrastructure issue requiring attention. The captured image shows signs of wear or damage that should be inspected by maintenance personnel. Recommended priority: medium.'
      )
      setIsGenerating(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          // Default location if geolocation fails
          setLocation({ lat: 40.7128, lng: -74.006 })
        }
      )
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ title, description, priority, photo, thumbnail })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm" onClick={onBack} />

      {/* Bottom sheet — scrollable */}
      <div className="fixed bottom-0 left-0 right-0 z-[1002] flex max-h-[92vh] flex-col rounded-t-2xl bg-card border-t border-border shadow-2xl">
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-card-foreground hover:bg-white/10 hover:text-card-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-extrabold tracking-tight text-card-foreground">New Task</h1>
          <div className="w-9" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto text-card-foreground">
          <form onSubmit={handleSubmit} className="p-4 pb-8 space-y-5">
            {/* Photo preview */}
            <div className="relative overflow-hidden rounded-xl bg-muted">
              <div className="aspect-[16/9]">
                <img src={photo} alt="Task photo" className="h-full w-full object-cover" />
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-xs text-card-foreground backdrop-blur">
                <ImageIcon className="h-3 w-3" />
                Photo attached
              </div>
            </div>

            {/* AI Generated badge */}
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-card-foreground">AI-Generated Description</p>
                <p className="text-xs text-muted-foreground">
                  {isGenerating ? 'Analyzing image...' : 'Description generated from photo'}
                </p>
              </div>
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isGenerating ? 'Generating...' : 'Enter task title'}
                disabled={isGenerating}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isGenerating ? 'Analyzing photo...' : 'Enter task description'}
                disabled={isGenerating}
                rows={3}
                required
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Low
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      High
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-field px-3 py-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {location ? (
                  <span className="text-field-foreground">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Getting location...</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={onBack}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                size="lg"
                disabled={isGenerating || !title || !description}
              >
                Create Task
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
