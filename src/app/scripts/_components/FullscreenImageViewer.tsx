'use client'

import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useImageViewer } from '../_hooks/useImageViewer'

type Size = {
  width: number
  height: number
}

export const FullscreenImageViewer = ({
  src,
  alt,
  isOpen,
  onClose,
}: {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
}) => {
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  })
  const [imageSize, setImageSize] = useState<Size>({ width: 0, height: 0 })
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

  if (!isOpen) {
    return null
  }

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
          src={src}
          alt={alt}
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
