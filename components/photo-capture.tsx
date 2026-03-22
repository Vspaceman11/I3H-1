'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, Upload, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhotoCaptureProps {
  onPhotoCapture: (file: File, previewUrl: string) => void
  onClose: () => void
  autoStart?: boolean
}

export function PhotoCapture({ onPhotoCapture, onClose, autoStart = false }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    if (streamRef.current) return
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = mediaStream
      setIsCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch {
      setError('Camera not available. Please use file upload.')
    }
  }, [])

  useEffect(() => {
    if (autoStart && !streamRef.current) {
      startCamera()
    }
  }, [autoStart, startCamera])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setIsCameraActive(false)
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `issue-${Date.now()}.jpg`, { type: 'image/jpeg' })
        const url = URL.createObjectURL(blob)
        setCapturedFile(file)
        setPreviewUrl(url)
        stopCamera()
      },
      'image/jpeg',
      0.85,
    )
  }, [stopCamera])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCapturedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const retakePhoto = () => {
    setCapturedFile(null)
    setPreviewUrl(null)
    startCamera()
  }

  const confirmPhoto = () => {
    if (capturedFile && previewUrl) {
      onPhotoCapture(capturedFile, previewUrl)
    }
  }

  const handleCancel = useCallback(() => {
    stopCamera()
    onClose()
  }, [stopCamera, onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm"
        onClick={() => { stopCamera(); onClose() }}
      />

      <div className="fixed bottom-0 left-0 right-0 z-[1002] rounded-t-2xl bg-card border-t border-border shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-card-foreground">Add Photo</h2>
          <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onClose() }}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 pb-8">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            {previewUrl ? (
              <img src={previewUrl} alt="Captured" className="h-full w-full object-cover" />
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

          <div className="mt-4 space-y-3">
            <div className="flex gap-3">
              {capturedFile ? (
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
                <Button className="w-full" onClick={capturePhoto}>
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
            <Button variant="outline" className="w-full" type="button" onClick={handleCancel}>
              Cancel
            </Button>
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
