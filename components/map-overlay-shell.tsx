'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Shared width for every map overlay (modal over map). */
export const MAP_OVERLAY_PANEL_CLASS = 'w-full max-w-md'

interface MapOverlayShellProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Extra class on the outer panel (width is usually fixed via MAP_OVERLAY_PANEL_CLASS) */
  panelClassName?: string
  /** Scrollable main region */
  bodyClassName?: string
  footer?: ReactNode
  closeOnBackdrop?: boolean
}

export function MapOverlayShell({
  title,
  onClose,
  children,
  panelClassName,
  bodyClassName,
  footer,
  closeOnBackdrop = true,
}: MapOverlayShellProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto flex max-h-[85vh] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl',
            MAP_OVERLAY_PANEL_CLASS,
            panelClassName,
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-overlay-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <h2 id="map-overlay-title" className="text-lg font-semibold text-card-foreground">
              {title}
            </h2>
            <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto', bodyClassName)}>{children}</div>
          {footer ? (
            <div className="shrink-0 border-t border-border bg-card px-4 py-3">{footer}</div>
          ) : null}
        </div>
      </div>
    </>
  )
}
