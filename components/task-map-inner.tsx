'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface TaskMapHandle {
  centerOnUser: () => void
}

export interface MapIssue {
  id: string
  lat: number
  lng: number
  severity: 'EASY' | 'MEDIUM' | 'HIGH'
  category?: string | null
  status: string
  imageUrl?: string | null
}

/** Kept for callers that may extend map analytics later; map no longer emits viewport on every pan. */
export interface ViewportRadiusParams {
  centerLat: number
  centerLng: number
  radiusMeters: number
}

interface TaskMapInnerProps {
  tasks: MapIssue[]
  onTaskClick?: (id: string) => void
}

const severityColors: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  EASY: '#22c55e',
}

const statusSymbol: Record<string, string> = {
  pending: '⏳',
  analyzing: '🔍',
  done: '✓',
  error: '!',
}

/** Expand visible bounds so pins load slightly before they enter the screen. */
const BOUNDS_PAD = 0.12

/** Debounce pan/zoom so we don’t diff markers on every frame while dragging. */
const VIEWPORT_SYNC_DEBOUNCE_MS = 280

const DEFAULT_MAP_CENTER: [number, number] = [49.1427, 9.2109]
const DEFAULT_MAP_ZOOM = 14

function snapshotTask(t: MapIssue): string {
  return JSON.stringify({
    lat: t.lat,
    lng: t.lng,
    severity: t.severity,
    status: t.status,
  })
}

function createIssueMarker(issue: MapIssue, onClick: (id: string) => void): L.Marker {
  const color = severityColors[issue.severity] ?? '#f59e0b'
  const sym = statusSymbol[issue.status] ?? '?'

  const svgIcon = L.divIcon({
    className: 'custom-marker',
    html: `
            <div style="position:relative;cursor:pointer;">
              <svg width="40" height="48" viewBox="0 0 48 56" fill="none">
                <path d="M24 0C10.74 0 0 10.74 0 24C0 42 24 56 24 56S48 42 48 24C48 10.74 37.26 0 24 0Z" fill="${color}"/>
                <circle cx="24" cy="22" r="14" fill="white"/>
              </svg>
              <span style="position:absolute;top:8px;left:0;width:40px;text-align:center;font-size:14px;line-height:24px;">
                ${sym}
              </span>
            </div>
          `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  })

  return L.marker([issue.lat, issue.lng], { icon: svgIcon }).on('click', () => {
    onClick(issue.id)
  })
}

export const TaskMapInner = forwardRef<TaskMapHandle, TaskMapInnerProps>(
  function TaskMapInner({ tasks, onTaskClick }, ref) {
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markersByIdRef = useRef<Map<string, L.Marker>>(new Map())
    const snapshotByIdRef = useRef<Map<string, string>>(new Map())
    const userMarkerRef = useRef<L.Marker | null>(null)
    const tasksRef = useRef<MapIssue[]>(tasks)
    tasksRef.current = tasks

    const onTaskClickRef = useRef(onTaskClick)
    onTaskClickRef.current = onTaskClick

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const syncMarkersToViewport = useCallback(() => {
      const map = mapRef.current
      if (!map) return

      const taskList = tasksRef.current
      const bounds = map.getBounds().pad(BOUNDS_PAD)
      const visible = taskList.filter((t) => bounds.contains(L.latLng(t.lat, t.lng)))
      const visibleIds = new Set(visible.map((t) => t.id))

      for (const [id, marker] of markersByIdRef.current) {
        if (!visibleIds.has(id)) {
          marker.remove()
          markersByIdRef.current.delete(id)
          snapshotByIdRef.current.delete(id)
        }
      }

      for (const issue of visible) {
        const snap = snapshotTask(issue)
        const prevSnap = snapshotByIdRef.current.get(issue.id)
        const existing = markersByIdRef.current.get(issue.id)

        if (existing && prevSnap === snap) continue

        if (existing) {
          existing.remove()
          markersByIdRef.current.delete(issue.id)
        }

        const marker = createIssueMarker(issue, (id) => onTaskClickRef.current?.(id))
        marker.addTo(map)
        markersByIdRef.current.set(issue.id, marker)
        snapshotByIdRef.current.set(issue.id, snap)
      }
    }, [])

    const scheduleSync = useCallback(() => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        syncMarkersToViewport()
      }, VIEWPORT_SYNC_DEBOUNCE_MS)
    }, [syncMarkersToViewport])

    useImperativeHandle(ref, () => ({
      centerOnUser() {
        if (!navigator.geolocation || !mapRef.current) return
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords
            mapRef.current!.setView([lat, lng], 16, { animate: true })

            if (userMarkerRef.current) userMarkerRef.current.remove()

            const icon = L.divIcon({
              className: '',
              html: `<div style="
                width:18px;height:18px;border-radius:50%;
                background:#3b82f6;border:3px solid white;
                box-shadow:0 0 0 6px rgba(59,130,246,0.25);
              "></div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            })
            userMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current!)
            scheduleSync()
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 },
        )
      },
    }))

    useEffect(() => {
      if (!mapContainerRef.current || mapRef.current) return

      const map = L.map(mapContainerRef.current).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM)
      mapRef.current = map

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 20,
          subdomains: ['a', 'b', 'c', 'd'],
        },
      ).addTo(map)

      const onMoveDone = () => {
        scheduleSync()
      }

      map.whenReady(() => {
        syncMarkersToViewport()
      })
      map.on('moveend', onMoveDone)
      map.on('zoomend', onMoveDone)

      return () => {
        map.off('moveend', onMoveDone)
        map.off('zoomend', onMoveDone)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        markersByIdRef.current.forEach((m) => m.remove())
        markersByIdRef.current.clear()
        snapshotByIdRef.current.clear()
        map.remove()
        mapRef.current = null
      }
    }, [scheduleSync, syncMarkersToViewport])

    useEffect(() => {
      tasksRef.current = tasks
      if (mapRef.current) {
        syncMarkersToViewport()
      }
    }, [tasks, syncMarkersToViewport])

    return (
      <div
        ref={mapContainerRef}
        className="task-map h-full w-full"
        style={{ minHeight: '100%' }}
      />
    )
  },
)
