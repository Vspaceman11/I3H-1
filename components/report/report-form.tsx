"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, MapPin, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CameraCapture } from "./camera-capture";
import { severityColor } from "@/lib/utils";
import { usePigeonVoice } from "@/hooks/use-pigeon-voice";

type AIResult = {
  category: string;
  severity: number;
  description: string;
};

export function ReportForm() {
  const t = useTranslations("report");
  const tCat = useTranslations("categories");

  const generateUploadUrl = useMutation(api.issues.generateUploadUrl);
  const createIssue = useMutation(api.issues.create);
  const analyzeImage = useAction(api.ai.analyzeImage);
  const escalate = useAction(api.n8n.escalateIfSevere);
  const { play } = usePigeonVoice();

  const [photo, setPhoto] = useState<Blob | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocation({ lat: 49.1427, lng: 9.2109 });
      }
    );
  }, []);

  const handleCapture = useCallback(
    async (blob: Blob) => {
      setPhoto(blob);
      setAnalyzing(true);
      setAiResult(null);

      try {
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        const { storageId } = (await uploadResult.json()) as {
          storageId: string;
        };

        const result = await analyzeImage({
          imageId: storageId as ReturnType<typeof api.issues.create>["_returnType"] extends Promise<infer T> ? T : never,
        } as Parameters<typeof analyzeImage>[0]);

        setAiResult(result);
        setDescription(result.description);
      } catch (err) {
        console.error("AI analysis failed:", err);
      } finally {
        setAnalyzing(false);
      }
    },
    [generateUploadUrl, analyzeImage]
  );

  const handleSubmit = useCallback(async () => {
    if (!photo || !location) return;

    setSubmitting(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": photo.type },
        body: photo,
      });
      const { storageId } = (await uploadResult.json()) as {
        storageId: string;
      };

      const category = aiResult?.category ?? "other";
      const severity = aiResult?.severity ?? 5;

      const issueId = await createIssue({
        imageId: storageId as Parameters<typeof createIssue>[0]["imageId"],
        lat: location.lat,
        lng: location.lng,
        category,
        severity,
        description: description || "Reported issue",
        reporterId: "anonymous",
      });

      await escalate({
        issueId: issueId as Parameters<typeof escalate>[0]["issueId"],
        category,
        severity,
        description,
        lat: location.lat,
        lng: location.lng,
      });

      setSuccess(true);
      play();

      setTimeout(() => {
        setPhoto(null);
        setAiResult(null);
        setDescription("");
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }, [
    photo,
    location,
    aiResult,
    description,
    generateUploadUrl,
    createIssue,
    escalate,
    play,
  ]);

  if (success) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Sparkles className="h-12 w-12 text-emerald-600" />
          <p className="text-lg font-semibold text-emerald-800">
            {t("success")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CameraCapture onCapture={handleCapture} disabled={submitting} />

          {analyzing && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-primary">{t("analyzing")}</span>
            </div>
          )}

          {aiResult && (
            <div className="flex flex-wrap gap-2">
              <Badge>
                {tCat(
                  aiResult.category as
                    | "pothole"
                    | "graffiti"
                    | "lighting"
                    | "trash"
                    | "vegetation"
                    | "infrastructure"
                    | "other"
                )}
              </Badge>
              <Badge
                variant={
                  aiResult.severity >= 8
                    ? "danger"
                    : aiResult.severity >= 5
                      ? "warning"
                      : "success"
                }
              >
                {t("severity")}: {aiResult.severity}/10
              </Badge>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {location ? (
              <span>
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            ) : (
              <span>{t("locationAuto")}</span>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!photo || !location || submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t("submitReport")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
