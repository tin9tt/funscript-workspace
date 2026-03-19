'use client'

import { MouseEvent, useCallback, useEffect, useState } from 'react'

type Size = {
  width: number
  height: number
}

type Point = {
  x: number
  y: number
}

type DragState = {
  origin: Point
  startX: number
  startY: number
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const ZOOM_IN_RATIO = 1.12
const ZOOM_OUT_RATIO = 0.88

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const getContainedSize = (imageSize: Size, containerSize: Size): Size => {
  if (
    imageSize.width <= 0 ||
    imageSize.height <= 0 ||
    containerSize.width <= 0 ||
    containerSize.height <= 0
  ) {
    return { width: 0, height: 0 }
  }

  const ratio = Math.min(
    containerSize.width / imageSize.width,
    containerSize.height / imageSize.height,
  )

  return {
    width: imageSize.width * ratio,
    height: imageSize.height * ratio,
  }
}

const clampOffset = (
  offset: Point,
  scale: number,
  imageSize: Size,
  containerSize: Size,
): Point => {
  const containedSize = getContainedSize(imageSize, containerSize)
  const maxOffsetX = Math.max(0, (containedSize.width * scale - containerSize.width) / 2)
  const maxOffsetY = Math.max(
    0,
    (containedSize.height * scale - containerSize.height) / 2,
  )

  return {
    x: clamp(offset.x, -maxOffsetX, maxOffsetX),
    y: clamp(offset.y, -maxOffsetY, maxOffsetY),
  }
}

export const useImageViewer = ({
  containerSize,
  imageSize,
  isOpen,
  onClose,
}: {
  containerSize: Size
  imageSize: Size
  isOpen: boolean
  onClose: () => void
}) => {
  const [scale, setScale] = useState(MIN_SCALE)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<DragState | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setDragState(null)
      return
    }

    setScale(MIN_SCALE)
    setOffset({ x: 0, y: 0 })
    setDragState(null)
  }, [isOpen, imageSize.height, imageSize.width])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !dragState) {
      return
    }

    const onMouseMove = (event: MouseEvent | globalThis.MouseEvent) => {
      const nextOffset = {
        x: dragState.origin.x + (event.clientX - dragState.startX),
        y: dragState.origin.y + (event.clientY - dragState.startY),
      }

      setOffset(clampOffset(nextOffset, scale, imageSize, containerSize))
    }

    const onMouseUp = () => {
      setDragState(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [containerSize, dragState, imageSize, isOpen, scale])

  useEffect(() => {
    setOffset((currentOffset) =>
      clampOffset(currentOffset, scale, imageSize, containerSize),
    )
  }, [containerSize, imageSize, scale])

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault()

      const nextScale = clamp(
        scale * (event.deltaY < 0 ? ZOOM_IN_RATIO : ZOOM_OUT_RATIO),
        MIN_SCALE,
        MAX_SCALE,
      )

      setScale(nextScale)
      setOffset((currentOffset) =>
        clampOffset(currentOffset, nextScale, imageSize, containerSize),
      )
    },
    [containerSize, imageSize, scale],
  )

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || scale <= MIN_SCALE) {
        return
      }

      event.preventDefault()
      setDragState({
        origin: offset,
        startX: event.clientX,
        startY: event.clientY,
      })
    },
    [offset, scale],
  )

  return {
    scale,
    offset,
    isDragging: dragState !== null,
    canDrag: scale > MIN_SCALE,
    handleWheel,
    handleMouseDown,
  }
}
