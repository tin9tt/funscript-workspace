'use client'

import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import { useImageViewer } from '../_hooks/useImageViewer'

type Size = {
  width: number
  height: number
}

type ImageEntry = { src: string; alt: string }

export const FullscreenImageViewer = ({
  images,
  currentIndex,
  onIndexChange,
  isOpen,
  onClose,
}: {
  images: ImageEntry[]
  currentIndex: number
  onIndexChange: (index: number) => void
  isOpen: boolean
  onClose: () => void
}) => {
  const current = images[currentIndex]
  const canNavigate = images.length > 1

  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  })
  const [imageSize, setImageSize] = useState<Size>({ width: 0, height: 0 })

  // Reset zoom/pan immediately when navigating to a different image
  useEffect(() => {
    setImageSize({ width: 0, height: 0 })
  }, [currentIndex])

  const { scale, offset, canDrag, isDragging, handleWheel, handleMouseDown } =
    useImageViewer({
      containerSize,
      imageSize,
      isOpen,
      onClose,
    })

  useEffect(() => {
    if (!containerElement || !isOpen) {
      return
    }

    const updateSize = () => {
      setContainerSize({
        width: containerElement.clientWidth,
        height: containerElement.clientHeight,
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(containerElement)

    return () => observer.disconnect()
  }, [containerElement, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen || !current) {
    return null
  }

  const toPrev = () =>
    onIndexChange((currentIndex - 1 + images.length) % images.length)
  const toNext = () => onIndexChange((currentIndex + 1) % images.length)

  return (
    <div className={clsx('fixed', 'inset-0', 'z-50', 'bg-black/90')}>
      <button
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
        onClick={onClose}
        aria-label="Close fullscreen image"
      >
        <FiX size={20} />
      </button>

      {canNavigate && (
        <button
          className={clsx(
            'absolute',
            'left-0',
            'top-1/2',
            '-translate-y-1/2',
            'z-10',
            'rounded-r-md',
            'bg-black/40',
            'px-4',
            'py-20',
            'text-white',
            'opacity-0',
            'transition-opacity',
            'hover:opacity-60',
          )}
          onClick={toPrev}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Previous image"
        >
          <FiChevronLeft size={40} />
        </button>
      )}

      {canNavigate && (
        <button
          className={clsx(
            'absolute',
            'right-0',
            'top-1/2',
            '-translate-y-1/2',
            'z-10',
            'rounded-l-md',
            'bg-black/40',
            'px-4',
            'py-20',
            'text-white',
            'opacity-0',
            'transition-opacity',
            'hover:opacity-60',
          )}
          onClick={toNext}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Next image"
        >
          <FiChevronRight size={40} />
        </button>
      )}

      {canNavigate && (
        <div
          className={clsx(
            'absolute',
            'bottom-4',
            'left-1/2',
            '-translate-x-1/2',
            'z-10',
            'text-sm',
            'text-white/60',
          )}
        >
          {currentIndex + 1} / {images.length}
        </div>
      )}

      <div
        ref={setContainerElement}
        className={clsx(
          'flex',
          'h-full',
          'w-full',
          'items-center',
          'justify-center',
          canDrag
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-default',
          'overflow-hidden',
          'px-6',
          'py-6',
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <img
          src={current.src}
          alt={current.alt}
          className={clsx('max-h-full', 'max-w-full', 'select-none')}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transformOrigin: 'center center',
          }}
          onDragStart={(event) => event.preventDefault()}
          onLoad={(event) =>
            setImageSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
        />
      </div>
    </div>
  )
}
