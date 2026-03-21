"use client";

import nextDynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MapErrorBoundary } from "@/components/map/map-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

const IssueMap = nextDynamic(
  () => import("@/components/map/issue-map").then((mod) => mod.IssueMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
  }
);

export default function MapPage() {
  const t = useTranslations("map");
  const issues = useQuery(api.issues.list, {});

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <MapErrorBoundary
        fallbackTitle={t("loadError")}
        fallbackAction={t("retryLoad")}
      >
        <IssueMap issues={issues ?? []} />
      </MapErrorBoundary>
      {issues && issues.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {t("noIssues")}
        </p>
      )}
    </div>
  );
}
