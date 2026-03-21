"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
      <AlertTriangle className="h-16 w-16 text-amber-500" />
      <h2 className="text-lg font-semibold">{t("error")}</h2>
      <Button onClick={reset} variant="outline">
        {t("retry")}
      </Button>
    </div>
  );
}
