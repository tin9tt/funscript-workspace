'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { FiChevronLeft, FiChevronRight, FiMaximize2 } from 'react-icons/fi'
import { FullscreenImageViewer } from './FullscreenImageViewer'

type ImageEntry = { src: string; alt: string }

export const ImageCarousel = ({ images }: { images: File[] }) => {
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const entries = images.map((file) => ({
      src: URL.createObjectURL(file),
      alt: file.name,
    }))
    setImageEntries(entries)
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, images.length - 1)))
    return () => entries.forEach((e) => URL.revokeObjectURL(e.src))
  }, [images])

  if (imageEntries.length === 0) {
    return null
  }

  const current = imageEntries[currentIndex]
  const canNavigate = imageEntries.length > 1

  const toPrev = () =>
    setCurrentIndex((i) => (i - 1 + imageEntries.length) % imageEntries.length)
  const toNext = () => setCurrentIndex((i) => (i + 1) % imageEntries.length)

  return (
    <div
      className={clsx(
        'grid',
        'gap-2',
        'rounded-lg',
        'border',
        'border-primary-content',
        'bg-black/5',
        'p-3',
      )}
    >
      <div className={clsx('flex', 'items-center', 'justify-between', 'gap-2')}>
        <div className={clsx('text-sm', 'font-medium', 'truncate')}>
          {current.alt}
        </div>
        {canNavigate && (
          <div className={clsx('shrink-0', 'text-sm', 'text-gray-500')}>
            {currentIndex + 1} / {imageEntries.length}
          </div>
        )}
      </div>

      <div className={clsx('relative', 'overflow-hidden', 'rounded-md')}>
        <img
          src={current.src}
          alt={current.alt}
          className={clsx(
            'h-64',
            'w-full',
            'cursor-pointer',
            'rounded-md',
            'bg-black/10',
            'object-contain',
          )}
          onClick={() => setIsFullscreen(true)}
        />

        {canNavigate && (
          <button
            className={clsx(
              'absolute',
              'left-2',
              'top-1/2',
              '-translate-y-1/2',
              'rounded-full',
              'border',
              'border-white/40',
              'bg-black/60',
              'p-2',
              'text-white',
            )}
            onClick={toPrev}
            aria-label="Previous image"
          >
            <FiChevronLeft size={18} />
          </button>
        )}

        {canNavigate && (
          <button
            className={clsx(
              'absolute',
              'right-12',
              'top-1/2',
              '-translate-y-1/2',
              'rounded-full',
              'border',
              'border-white/40',
              'bg-black/60',
              'p-2',
              'text-white',
            )}
            onClick={toNext}
            aria-label="Next image"
          >
            <FiChevronRight size={18} />
          </button>
        )}

        <button
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
          onClick={() => setIsFullscreen(true)}
          aria-label="Open image fullscreen"
        >
          <FiMaximize2 size={18} />
        </button>
      </div>

      <FullscreenImageViewer
        images={imageEntries}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
      />
    </div>
  )
}
