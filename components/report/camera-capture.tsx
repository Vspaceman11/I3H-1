"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Camera, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
}

export function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const t = useTranslations("report");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError(t("cameraPermission"));
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhoto(dataUrl);
    stopCamera();

    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.85
    );
  }, [onCapture, stopCamera]);

  const retake = useCallback(() => {
    setPhoto(null);
    startCamera();
  }, [startCamera]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-6">
        <Camera className="h-10 w-10 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={startCamera}>
          {t("retakePhoto")}
        </Button>
      </div>
    );
  }

  if (photo) {
    return (
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={photo}
          alt="Captured"
          className="w-full rounded-lg object-cover"
          style={{ maxHeight: "300px" }}
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={retake}>
            <RotateCcw className="mr-1 h-4 w-4" />
            {t("retakePhoto")}
          </Button>
          <Button size="sm" disabled>
            <Check className="mr-1 h-4 w-4" />
            OK
          </Button>
        </div>
      </div>
    );
  }

  if (cameraActive) {
    return (
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="w-full rounded-lg"
          style={{ maxHeight: "300px" }}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <Button
            size="lg"
            className="h-16 w-16 rounded-full"
            onClick={takePhoto}
            disabled={disabled}
          >
            <Camera className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startCamera}
      disabled={disabled}
      className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 transition-colors hover:border-primary/50 hover:bg-muted active:scale-[0.99] disabled:opacity-50"
    >
      <Camera className="h-10 w-10 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground">
        {t("takePhoto")}
      </span>
    </button>
  );
}
