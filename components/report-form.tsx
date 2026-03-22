'use client'

import { useState, useEffect } from 'react'
import { Sparkles, MapPin, Image as ImageIcon, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useMutation, useAction, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { MapOverlayShell } from '@/components/map-overlay-shell'

interface ReportFormProps {
  file: File
  previewUrl: string
  onBack: () => void
  onDone: (issueId: Id<"issues">) => void
}

const FORM_ID = 'report-issue-form'

export function ReportForm({ file, previewUrl, onBack, onDone }: ReportFormProps) {
  const generateUploadUrl = useMutation(api.issues.generateUploadUrl)
  const createIssue = useMutation(api.issues.createFromUpload)
  const triggerAnalysis = useAction(api.issues.triggerN8nAnalysis)
  const currentUser = useQuery(api.users.currentUser)

  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 49.1427, lng: 9.2109 }),
      )
    } else {
      setLocation({ lat: 49.1427, lng: 9.2109 })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setUploadError('You must be signed in to submit a report.')
      return
    }
    setIsUploading(true)
    setUploadError(null)

    try {
      const uploadUrl = await generateUploadUrl()
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }
      const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> }

      const issueId = await createIssue({
        storageId,
        user_id: currentUser._id,
        user_description: description || undefined,
        latitude: location?.lat,
        longitude: location?.lng,
      })

      triggerAnalysis({
        issueId,
        storageId,
        userId: currentUser._id,
        userDescription: description || undefined,
        latitude: location?.lat,
        longitude: location?.lng,
      })

      onDone(issueId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error"
      setUploadError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <MapOverlayShell
      title="Report Issue"
      onClose={onBack}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" type="button" onClick={onBack} disabled={isUploading}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="relative overflow-hidden rounded-xl bg-muted">
          <div className="aspect-[16/10] max-h-[28vh]">
            <img src={previewUrl} alt="Issue photo" className="h-full w-full object-cover" />
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-xs text-card-foreground backdrop-blur">
            <ImageIcon className="h-3 w-3" />
            Photo attached
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-card-foreground">AI Analysis</p>
            <p className="text-xs text-muted-foreground">
              The photo will be analyzed by AI after upload
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue…"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-field px-3 py-2 text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            {location ? (
              <span className="text-field-foreground">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            ) : (
              <span className="text-muted-foreground">Getting location…</span>
            )}
          </div>
        </div>

        {uploadError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{uploadError}</div>
        )}
      </form>
    </MapOverlayShell>
  )
}
