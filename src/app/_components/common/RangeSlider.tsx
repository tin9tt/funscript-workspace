import clsx from 'clsx'
import { useRef, useState, useCallback } from 'react'

export const VerticalRangeSlider = ({
  offsetValue,
  limitValue,
  onChange,
  disabled = false,
}: {
  offsetValue: number
  limitValue: number
  onChange: (offset: number, limit: number) => void
  disabled?: boolean
}) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState<'offset' | 'limit' | null>(null)

  const getValueFromPosition = useCallback((clientY: number): number => {
    if (!sliderRef.current) return 0
    const rect = sliderRef.current.getBoundingClientRect()
    const percentage = Math.max(
      0,
      Math.min(1, (rect.bottom - clientY) / rect.height),
    )
    return Math.round(percentage * 100)
  }, [])

  const handleMouseDown = useCallback(
    (type: 'offset' | 'limit', e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragging(type)

      const handleMouseMove = (e: MouseEvent) => {
        const newValue = getValueFromPosition(e.clientY)
        if (type === 'offset') {
          onChange(Math.min(newValue, limitValue - 1), limitValue)
        } else {
          onChange(offsetValue, Math.max(newValue, offsetValue + 1))
        }
      }

      const handleMouseUp = () => {
        setIsDragging(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [disabled, offsetValue, limitValue, onChange, getValueFromPosition],
  )

  return (
    <div className={clsx('flex', 'items-center', 'space-x-4')}>
      {/* Slider */}
      <div
        ref={sliderRef}
        className={clsx(
          'relative',
          'w-4',
          'h-48',
          'bg-primary-content',
          'rounded-full',
          'cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {/* Track for range */}
        <div
          className={clsx('absolute', 'w-full', 'bg-primary-variant')}
          style={{
            bottom: `${offsetValue}%`,
            height: `calc(${limitValue - offsetValue}% - 8px)`,
          }}
        />

        {/* Offset handle */}
        <div
          className={clsx(
            'absolute',
            'z-20',
            'w-6',
            'h-2',
            'bg-white',
            'border-2',
            'border-primary-variant',
            'rounded-lg',
            'cursor-grab',
            'transform',
            '-translate-x-1/2',
            'left-1/2',
            isDragging === 'offset' && 'cursor-grabbing',
            disabled && 'cursor-not-allowed',
          )}
          style={{ bottom: `calc(${offsetValue}% - 8px)` }}
          onMouseDown={(e) => handleMouseDown('offset', e)}
        />

        {/* Limit handle */}
        <div
          className={clsx(
            'absolute',
            'z-20',
            'w-6',
            'h-2',
            'bg-white',
            'border-2',
            'border-primary-variant',
            'rounded-lg',
            'cursor-grab',
            'transform',
            '-translate-x-1/2',
            'left-1/2',
            isDragging === 'limit' && 'cursor-grabbing',
            disabled && 'cursor-not-allowed',
          )}
          style={{ bottom: `calc(${limitValue}% - 8px)` }}
          onMouseDown={(e) => handleMouseDown('limit', e)}
        />
      </div>

      {/* Values display */}
      <div className={clsx('flex', 'flex-col', 'space-y-2', 'text-sm')}>
        <div className={clsx('text-gray-600')}>
          <div>Limit: {limitValue}</div>
          <div>Offset: {offsetValue}</div>
        </div>
      </div>
    </div>
  )
}

export const HorizontalRangeSlider = ({
  offsetValue,
  limitValue,
  onChange,
  disabled = false,
  duration = 100,
}: {
  offsetValue: number
  limitValue: number
  onChange: (offset: number, limit: number) => void
  disabled?: boolean
  duration?: number
}) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState<'offset' | 'limit' | null>(null)

  const getValueFromPosition = useCallback(
    (clientX: number): number => {
      if (!sliderRef.current) return 0
      const rect = sliderRef.current.getBoundingClientRect()
      const percentage = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      )
      return Math.round(percentage * duration)
    },
    [duration],
  )

  const handleMouseDown = useCallback(
    (type: 'offset' | 'limit', e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragging(type)

      const handleMouseMove = (e: MouseEvent) => {
        const newValue = getValueFromPosition(e.clientX)
        if (type === 'offset') {
          onChange(Math.min(newValue, limitValue - 1), limitValue)
        } else {
          onChange(offsetValue, Math.max(newValue, offsetValue + 1))
        }
      }

      const handleMouseUp = () => {
        setIsDragging(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [disabled, offsetValue, limitValue, onChange, getValueFromPosition],
  )

  return (
    <div className={clsx('flex', 'flex-col', 'space-y-4', 'w-full')}>
      {/* Slider */}
      <div
        ref={sliderRef}
        className={clsx(
          'relative',
          'h-4',
          'w-full',
          'bg-primary-content',
          'rounded-full',
          'cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {/* Track for range */}
        <div
          className={clsx(
            'absolute',
            'h-full',
            'bg-primary-variant',
            'rounded-full',
          )}
          style={{
            left: `${(offsetValue / duration) * 100}%`,
            width: `${((limitValue - offsetValue) / duration) * 100}%`,
          }}
        />

        {/* Offset handle */}
        <div
          className={clsx(
            'absolute',
            'z-20',
            'w-2',
            'h-6',
            'bg-white',
            'border-2',
            'border-primary-variant',
            'rounded-lg',
            'cursor-grab',
            'transform',
            '-translate-y-1/2',
            'top-1/2',
            isDragging === 'offset' && 'cursor-grabbing',
            disabled && 'cursor-not-allowed',
          )}
          style={{ left: `calc(${(offsetValue / duration) * 100}% - 4px)` }}
          onMouseDown={(e) => handleMouseDown('offset', e)}
        />

        {/* Limit handle */}
        <div
          className={clsx(
            'absolute',
            'z-20',
            'w-2',
            'h-6',
            'bg-white',
            'border-2',
            'border-primary-variant',
            'rounded-lg',
            'cursor-grab',
            'transform',
            '-translate-y-1/2',
            'top-1/2',
            isDragging === 'limit' && 'cursor-grabbing',
            disabled && 'cursor-not-allowed',
          )}
          style={{ left: `calc(${(limitValue / duration) * 100}% - 4px)` }}
          onMouseDown={(e) => handleMouseDown('limit', e)}
        />
      </div>

      {/* Values display */}
      <div
        className={clsx('flex', 'justify-between', 'text-sm', 'text-gray-600')}
      >
        <div>
          Start: {Math.floor(offsetValue / 60)}:
          {(Math.round(offsetValue) % 60).toString().padStart(2, '0')}
        </div>
        <div>
          End: {Math.floor(limitValue / 60)}:
          {(Math.round(limitValue) % 60).toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  )
}
