'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, Upload, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhotoCaptureProps {
  onPhotoCapture: (photoUrl: string) => void
  onClose: () => void
  autoStart?: boolean
}

export function PhotoCapture({ onPhotoCapture, onClose, autoStart = false }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    // Don't start if already active
    if (streamRef.current) {
      console.log('[v0] Camera already active, skipping start')
      return
    }
    
    try {
      setError(null)
      console.log('[v0] Requesting camera access...')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      console.log('[v0] Camera access granted')
      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        console.log('[v0] Video element updated with stream')
      }
    } catch (err) {
      console.error('[v0] Camera error:', err)
      setError('Camera not available. Please use file upload.')
    }
  }, [])

  // Auto-start camera on mount if autoStart is true — only once
  useEffect(() => {
    if (autoStart && !streamRef.current) {
      console.log('[v0] AutoStart enabled, starting camera')
      startCamera()
    }
    
    return () => {
      // Only clean up if component is unmounting, not on re-renders
      // We'll use a flag to track this
    }
  }, [autoStart, startCamera])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setStream(null)
      setIsCameraActive(false)
    }
  }, [])

  const capturePhoto = useCallback(() => {
    console.log('[v0] Capture button clicked')
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      console.log('[v0] Video dimensions:', video.videoWidth, 'x', video.videoHeight)
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const photoUrl = canvas.toDataURL('image/jpeg', 0.8)
        console.log('[v0] Photo captured, URL length:', photoUrl.length)
        setCapturedPhoto(photoUrl)
        stopCamera()
      }
    } else {
      console.error('[v0] Video or canvas ref not available')
    }
  }, [stopCamera])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setCapturedPhoto(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
    startCamera()
  }

  const confirmPhoto = () => {
    if (capturedPhoto) {
      console.log('[v0] Confirming photo, calling onPhotoCapture')
      onPhotoCapture(capturedPhoto)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm"
        onClick={() => { stopCamera(); onClose() }}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[1002] rounded-t-2xl bg-card border-t border-border shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-card-foreground">Add Photo</h2>
          <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onClose() }}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 pb-8">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Camera/Photo preview area */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            {capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured" className="h-full w-full object-cover" />
            ) : isCameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                <Camera className="h-16 w-16" />
                <p className="text-sm">Start camera or upload a photo</p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            {capturedPhoto ? (
              <>
                <Button variant="outline" className="flex-1" onClick={retakePhoto}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                <Button className="flex-1" onClick={confirmPhoto}>
                  Use Photo
                </Button>
              </>
            ) : isCameraActive ? (
              <Button className="flex-1" onClick={capturePhoto}>
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
            ) : (
              <>
                <Button variant="outline" className="flex-1" onClick={startCamera}>
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </>
  )
}
