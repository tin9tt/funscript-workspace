'use client'

import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { FiMaximize2, FiMinimize2, FiSettings } from 'react-icons/fi'
import { VideoViewer } from './Video'
import {
  FullscreenControlOverlay,
  type FullscreenOverlayProps,
} from './FullscreenControlOverlay'

type Props = {
  file?: File
  overlayProps?: FullscreenOverlayProps
}

export const FullscreenVideoViewer = ({ file, overlayProps }: Props) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasOverlayContent =
    overlayProps && (overlayProps.hasConnectedDevice || overlayProps.hasScript)

  const handleEnterFullscreen = () => {
    containerRef.current?.requestFullscreen()
  }

  const handleExitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
  }

  const handleClose = () => {
    setIsOverlayOpen(false)
    handleExitFullscreen()
  }

  // Sync React state with browser fullscreen state (handles Escape key exit too)
  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === containerRef.current
      setIsFullscreen(active)
      if (!active) setIsOverlayOpen(false)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  return (
    <div
      ref={containerRef}
      className={clsx(
        isFullscreen
          ? ['bg-black', 'h-full', 'w-full']
          : ['relative', 'flex', 'justify-center'],
      )}
    >
      <VideoViewer
        file={file}
        className={
          isFullscreen ? clsx('h-full', 'w-full', 'object-contain') : undefined
        }
      />

      {!isFullscreen && (
        <button
          type="button"
          className={clsx(
            'absolute',
            'bottom-3',
            'right-3',
            'rounded-full',
            'border',
            'border-white/40',
            'bg-black/60',
            'p-2',
            'text-white',
          )}
          onClick={handleEnterFullscreen}
          aria-label="Open video fullscreen"
        >
          <FiMaximize2 size={18} />
        </button>
      )}

      {isFullscreen && (
        <>
          <button
            type="button"
            className={clsx(
              'absolute',
              'right-4',
              'top-4',
              'z-10',
              'rounded-full',
              'border',
              'border-white/40',
              'bg-black/40',
              'p-3',
              'text-white',
            )}
            onClick={handleClose}
            aria-label="Close fullscreen"
          >
            <FiMinimize2 size={20} />
          </button>

          {hasOverlayContent && !isOverlayOpen && (
            <button
              type="button"
              className={clsx(
                'absolute',
                'bottom-16',
                'right-4',
                'z-10',
                'rounded-full',
                'border',
                'border-white/40',
                'bg-black/40',
                'p-3',
                'text-white',
              )}
              onClick={() => setIsOverlayOpen(true)}
              aria-label="Open controls"
            >
              <FiSettings size={20} />
            </button>
          )}

          {isOverlayOpen && overlayProps && (
            <FullscreenControlOverlay
              {...overlayProps}
              onClose={() => setIsOverlayOpen(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
