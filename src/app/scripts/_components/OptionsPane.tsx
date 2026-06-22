'use client'

import clsx from 'clsx'
import { Card } from '../../_components/common'
import { useState } from 'react'
import { ToggleSwitch, VerticalRangeSlider } from '@/app/_components/common'

export interface OptionsState {
  inverted: boolean
  range: {
    offset: number
    limit: number
  }
  continuous: {
    speed: number
    dutyRatio: number
    enabled: boolean
  }
}

interface OptionsPaneProps {
  options: OptionsState
  onOptionsChange: (options: OptionsState) => void
  timingOffsetMs: number
  onTimingOffsetChange: (ms: number) => void
  className?: string
  isPlaying?: boolean
  onPaneOpen?: () => void
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

export const OptionsPane = ({
  options,
  onOptionsChange,
  timingOffsetMs,
  onTimingOffsetChange,
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
          ['bg-background', 'dark:bg-foreground'],
          'transition-all',
          'duration-300',
          'ease-in-out',
          isExpanded
            ? ['right-64', 'border-primary-variant']
            : ['right-1', 'border-primary-content'],
        )}
        onClick={handleToggleExpand}
      >
        <div
          className={clsx('px-3', 'py-6', 'text-sm', 'font-medium', [
            'text-foreground',
            'dark:text-background',
          ])}
        >
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
        <Card className={clsx('p-4', 'space-y-4', 'w-64', 'ml-auto')}>
          <div className={clsx('text-lg', 'font-semibold')}>Script Options</div>

          {/* Row: Invert Toggle + Range Slider side by side */}
          <div className={clsx('grid', 'grid-cols-2', 'gap-3')}>
            {/* Invert Toggle */}
            <div className={clsx('space-y-2')}>
              <label className={clsx('text-sm', 'font-medium')}>
                Invert Script
              </label>
              <div className={clsx('flex', 'items-center', 'gap-2')}>
                <ToggleSwitch
                  checked={options.inverted}
                  onChange={handleInvertToggle}
                  disabled={isPlaying}
                />
                <span className={clsx('text-xs', 'text-gray-600')}>
                  {options.inverted ? 'On' : 'Off'}
                </span>
              </div>
            </div>

            {/* Range Slider */}
            <div className={clsx('space-y-2')}>
              <label className={clsx('text-sm', 'font-medium')}>Range</label>
              <VerticalRangeSlider
                offsetValue={options.range.offset}
                limitValue={options.range.limit}
                onChange={handleRangeChange}
                disabled={isPlaying}
                hideValues
              />
            </div>
          </div>

          {/* Timing Offset — full width */}
          <div className={clsx('space-y-3')}>
            <label className={clsx('text-sm', 'font-medium')}>
              Script Offset
            </label>
            <div className={clsx('flex', 'items-center', 'gap-2')}>
              <input
                type="number"
                min={-600}
                max={600}
                value={timingOffsetMs}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v)) {
                    onTimingOffsetChange(Math.max(-600, Math.min(600, v)))
                  }
                }}
                disabled={isPlaying}
                className={clsx(
                  'w-20',
                  'rounded',
                  'border',
                  'border-primary-content',
                  'bg-transparent',
                  'px-2',
                  'py-1',
                  'text-center',
                  'text-sm',
                  'focus:outline-none',
                  'focus:ring-1',
                  'focus:ring-primary-variant',
                  isPlaying && 'opacity-50 cursor-not-allowed',
                )}
              />
              <span className={clsx('text-sm', 'text-gray-500')}>ms</span>
            </div>
            <div className={clsx('grid', 'grid-cols-4', 'gap-1')}>
              {(
                [
                  { label: '−200', delta: -200 },
                  { label: '−20', delta: -20 },
                  { label: '+20', delta: 20 },
                  { label: '+200', delta: 200 },
                ] as const
              ).map(({ label, delta }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    onTimingOffsetChange(
                      Math.max(-600, Math.min(600, timingOffsetMs + delta)),
                    )
                  }
                  disabled={
                    isPlaying ||
                    (delta < 0 && timingOffsetMs <= -600) ||
                    (delta > 0 && timingOffsetMs >= 600)
                  }
                  className={clsx(
                    'rounded',
                    'border',
                    'border-primary-content',
                    'px-1',
                    'py-1',
                    'text-xs',
                    'transition-colors',
                    'hover:border-primary-variant',
                    'disabled:opacity-50',
                    'disabled:cursor-not-allowed',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
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
