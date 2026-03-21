'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Task } from '@/lib/task-store'

export interface TaskMapHandle {
  centerOnUser: () => void
}

interface TaskMapInnerProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

const priorityColors = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

export const TaskMapInner = forwardRef<TaskMapHandle, TaskMapInnerProps>(
  function TaskMapInner({ tasks, onTaskClick }, ref) {
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markersRef = useRef<L.Marker[]>([])
    const userMarkerRef = useRef<L.Marker | null>(null)

    useImperativeHandle(ref, () => ({
      centerOnUser() {
        if (!navigator.geolocation || !mapRef.current) return
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords
            mapRef.current!.setView([lat, lng], 16, { animate: true })

            if (userMarkerRef.current) {
              userMarkerRef.current.remove()
            }

            const icon = L.divIcon({
              className: '',
              html: `<div style="
                width: 18px; height: 18px; border-radius: 50%;
                background: #3b82f6; border: 3px solid white;
                box-shadow: 0 0 0 6px rgba(59,130,246,0.25);
              "></div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            })
            userMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current!)
          },
          (err) => console.error('Geolocation error:', err),
          { enableHighAccuracy: true, timeout: 8000 }
        )
      },
    }))

    useEffect(() => {
      if (!mapContainerRef.current || mapRef.current) return

      mapRef.current = L.map(mapContainerRef.current).setView([40.7128, -74.006], 14)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
        minZoom: 0,
        subdomains: ['a', 'b', 'c', 'd'],
      }).addTo(mapRef.current)

      return () => {
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }
      }
    }, [])

    useEffect(() => {
      if (!mapRef.current) return

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      tasks.forEach((task) => {
        const color = priorityColors[task.priority]
        const hasThumbnail = !!task.thumbnail

        const svgIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="position: relative; cursor: pointer;">
              <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 0C10.74 0 0 10.74 0 24C0 42 24 56 24 56C24 56 48 42 48 24C48 10.74 37.26 0 24 0Z" fill="${color}"/>
                <circle cx="24" cy="22" r="16" fill="white"/>
              </svg>
              ${hasThumbnail
                ? `<img src="${task.thumbnail}" style="position:absolute;top:6px;left:8px;width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid white;" />`
                : `<div style="position:absolute;top:6px;left:8px;width:32px;height:32px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:14px;">📋</div>`
              }
              <span style="position:absolute;top:-4px;right:2px;width:16px;height:16px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;color:${color};box-shadow:0 1px 3px rgba(0,0,0,0.2);">
                ${task.status === 'pending' ? '!' : task.status === 'in-progress' ? '~' : '✓'}
              </span>
            </div>
          `,
          iconSize: [48, 56],
          iconAnchor: [24, 56],
        })

        const marker = L.marker([task.location.lat, task.location.lng], { icon: svgIcon })
          .addTo(mapRef.current!)
          .on('click', () => onTaskClick?.(task))

        markersRef.current.push(marker)
      })
    }, [tasks, onTaskClick])

    return <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '100%' }} />
  }
)
