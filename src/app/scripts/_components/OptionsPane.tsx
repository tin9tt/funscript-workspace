'use client'

import clsx from 'clsx'
import { Card } from '../../_components/common'
import { useState, useRef, useCallback } from 'react'

export interface OptionsState {
  inverted: boolean
  range: {
    offset: number
    limit: number
  }
}

interface OptionsPaneProps {
  options: OptionsState
  onOptionsChange: (options: OptionsState) => void
  className?: string
  isPlaying?: boolean
  onPaneOpen?: () => void
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

// Toggle Switch Component
const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) => {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={clsx(
        'relative',
        'inline-flex',
        'h-6',
        'w-11',
        'items-center',
        'rounded-full',
        'transition-colors',
        'ring-2',
        'ring-primary-variant',
        checked ? 'bg-primary-variant' : 'bg-primary-content',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={clsx(
          'inline-block',
          'h-4',
          'w-4',
          'transform',
          'rounded-full',
          'transition-transform',
          checked
            ? [
                'translate-x-6',
                'ring-1',
                'ring-primary-content',
                'bg-primary-content',
              ]
            : ['translate-x-1', 'bg-primary-variant'],
        )}
      />
    </button>
  )
}

// Vertical Range Slider Component
const VerticalRangeSlider = ({
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

export const OptionsPane = ({
  options,
  onOptionsChange,
  className,
  isPlaying = false,
  onPaneOpen,
  isExpanded: externalIsExpanded,
  onExpandedChange,
}: OptionsPaneProps) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false)

  // Use external control if provided, otherwise use internal state
  const isExpanded =
    externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded
  const setIsExpanded = onExpandedChange || setInternalIsExpanded

  const handleToggleExpand = () => {
    if (!isExpanded && isPlaying && onPaneOpen) {
      onPaneOpen()
    }
    setIsExpanded(!isExpanded)
  }

  const handleInvertToggle = (checked: boolean) => {
    onOptionsChange({
      ...options,
      inverted: checked,
    })
  }

  const handleRangeChange = (offset: number, limit: number) => {
    onOptionsChange({
      ...options,
      range: { offset, limit },
    })
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Toggle button - always visible */}
      <div
        className={clsx(
          'absolute',
          'top-40',
          'z-20',
          'border-l',
          'border-y',
          'hover:border-primary-variant',
          'rounded-l-full',
          'shadow-lg',
          'cursor-pointer',
          'bg-background',
          'transition-all',
          'duration-300',
          'ease-in-out',
          isExpanded
            ? ['right-64', 'border-primary-variant']
            : ['right-1', 'border-primary-content'],
        )}
        onClick={handleToggleExpand}
      >
        <div className={clsx('px-3', 'py-6', 'text-sm', 'font-medium')}>
          {isExpanded ? '→' : '←'}
        </div>
      </div>

      {/* Main pane */}
      <div
        className={clsx(
          'absolute',
          'top-0',
          'right-0',
          'transition-all',
          'duration-300',
          'ease-in-out',
          isExpanded ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{
          width: isExpanded ? '256px' : '0px',
        }}
      >
        <Card className={clsx('p-4', 'space-y-6', 'w-64', 'ml-auto')}>
          <div className={clsx('text-lg', 'font-semibold')}>Script Options</div>

          {/* Invert Toggle */}
          <div className={clsx('space-y-3')}>
            <label className={clsx('text-sm', 'font-medium')}>
              Invert Script
            </label>
            <div className={clsx('flex', 'items-center', 'space-x-3')}>
              <ToggleSwitch
                checked={options.inverted}
                onChange={handleInvertToggle}
                disabled={isPlaying}
              />
              <span className={clsx('text-sm', 'text-gray-600')}>
                {options.inverted ? 'Inverted' : 'Normal'}
              </span>
            </div>
          </div>

          {/* Range Slider */}
          <div className={clsx('space-y-3')}>
            <label className={clsx('text-sm', 'font-medium')}>
              Range Settings
            </label>
            <VerticalRangeSlider
              offsetValue={options.range.offset}
              limitValue={options.range.limit}
              onChange={handleRangeChange}
              disabled={isPlaying}
            />
          </div>

          {isPlaying && (
            <div className={clsx('text-xs', 'text-orange-600', 'text-center')}>
              Stop playback to edit options
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
