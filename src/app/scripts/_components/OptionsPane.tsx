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
