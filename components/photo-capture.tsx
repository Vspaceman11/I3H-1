'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, Upload, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MapOverlayShell } from '@/components/map-overlay-shell'

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
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API not supported in this browser.')
      return
    }
    if (!window.isSecureContext) {
      setError('Camera requires HTTPS or localhost. Use file upload when testing over HTTP.')
      return
    }

    setError(null)
    const constraints: MediaStreamConstraints = { video: { facingMode: 'environment' }, audio: false }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setIsCameraActive(true)
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')
      ) {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          })
          streamRef.current = fallbackStream
          setIsCameraActive(true)
          return
        } catch {
          /* fall through */
        }
      }

      const msg =
        err instanceof DOMException
          ? err.name === 'NotAllowedError'
            ? 'Camera permission denied. Allow access and try again.'
            : err.name === 'NotFoundError'
              ? 'No camera found. Use file upload.'
              : err.name === 'SecurityError' || err.name === 'NotSupportedError'
                ? 'Camera blocked. Use HTTPS or localhost.'
                : `${err.name}: ${err.message}`
          : 'Camera not available. Please use file upload.'
      setError(msg)
    }
  }, [])

  useEffect(() => {
    if (autoStart && !streamRef.current) {
      startCamera()
    }
  }, [autoStart, startCamera])

  useEffect(() => {
    if (!isCameraActive || !streamRef.current || !videoRef.current) return
    videoRef.current.srcObject = streamRef.current
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [isCameraActive])

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

  const footer = capturedFile ? (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" type="button" onClick={handleCancel}>
        Cancel
      </Button>
      <div className="flex gap-2">
        <Button type="button" onClick={retakePhoto}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retake
        </Button>
        <Button type="button" onClick={confirmPhoto}>
          Use Photo
        </Button>
      </div>
    </div>
  ) : isCameraActive ? (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" type="button" onClick={handleCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={capturePhoto}>
        <Camera className="mr-2 h-4 w-4" />
        Capture
      </Button>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" type="button" onClick={handleCancel}>
        Cancel
      </Button>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" onClick={startCamera}>
          <Camera className="mr-2 h-4 w-4" />
          Camera
        </Button>
        <Button type="button" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>
    </div>
  )

  return (
    <MapOverlayShell title="Add Photo" onClose={handleCancel} footer={footer}>
      <div className="space-y-3 p-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="relative aspect-[4/3] max-h-[38vh] w-full overflow-hidden rounded-xl bg-muted">
          {previewUrl ? (
            <img src={previewUrl} alt="Captured" className="h-full w-full object-cover" />
          ) : isCameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
              <Camera className="h-12 w-12 shrink-0 opacity-80" />
              <p className="text-sm">Start camera or upload a photo</p>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </MapOverlayShell>
  )
}
