"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { severityColor } from "@/lib/utils";

const HEILBRONN_CENTER: [number, number] = [49.1427, 9.2109];
const DEFAULT_ZOOM = 14;

interface MapIssue {
  _id: string;
  lat: number;
  lng: number;
  category: string;
  severity: number;
  status: "open" | "resolved";
  description: string;
  votes: number;
}

interface IssueMapProps {
  issues: MapIssue[];
  onMarkerClick?: (issueId: string) => void;
}

function severityToColor(severity: number): string {
  if (severity >= 8) return "#dc2626";
  if (severity >= 5) return "#d97706";
  return "#10b981";
}

export function IssueMap({ issues, onMarkerClick }: IssueMapProps) {
  const t = useTranslations("map");
  const tCat = useTranslations("categories");
  const tStatus = useTranslations("status");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(HEILBRONN_CENTER, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mounted]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    issues.forEach((issue) => {
      const color = severityToColor(issue.severity);
      const marker = L.circleMarker([issue.lat, issue.lng], {
        radius: 8 + issue.severity,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      const statusText =
        issue.status === "open" ? tStatus("open") : tStatus("resolved");

      marker.bindPopup(`
        <div style="min-width:160px">
          <strong>${tCat(issue.category as "pothole" | "graffiti" | "lighting" | "trash" | "vegetation" | "infrastructure" | "other")}</strong>
          <br/>
          <span class="${severityColor(issue.severity)}">${t("severity")}: ${issue.severity}/10</span>
          <br/>
          <span>${statusText} · ${t("votes")}: ${issue.votes}</span>
          <br/>
          <small>${issue.description}</small>
        </div>
      `);

      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(issue._id));
      }
    });
  }, [issues, t, tCat, tStatus, onMarkerClick]);

  if (!mounted) {
    return (
      <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-full w-full rounded-lg"
      style={{ minHeight: "400px" }}
    />
  );
}
