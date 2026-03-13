'use client'

import clsx from 'clsx'
import type { ChangeEvent } from 'react'
import { ToggleSwitch, VerticalRangeSlider } from '@/app/_components/common'
import { OptionsState } from './OptionsPane'

interface DeviceControlPanelProps {
  options: OptionsState
  onOptionsChange: (options: OptionsState) => void
  isMediaPlaying: boolean
  isManualPlaying: boolean
  onManualPlayToggle: (playing: boolean) => void
}

export const DeviceControlPanel = ({
  options,
  onOptionsChange,
  isMediaPlaying,
  isManualPlaying,
  onManualPlayToggle,
}: DeviceControlPanelProps) => {
  const handleRangeChange = (offset: number, limit: number) => {
    onOptionsChange({
      ...options,
      range: { offset, limit },
    })
  }

  const handleInvertToggle = (checked: boolean) => {
    onOptionsChange({
      ...options,
      inverted: checked,
    })
  }

  const handleEnabledToggle = (checked: boolean) => {
    onOptionsChange({
      ...options,
      continuous: {
        ...options.continuous,
        enabled: checked,
      },
    })
  }

  const handleSpeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const speed = Number(e.target.value)
    onOptionsChange({
      ...options,
      continuous: {
        ...options.continuous,
        speed,
      },
    })
  }

  const handleDutyRatioChange = (e: ChangeEvent<HTMLInputElement>) => {
    const dutyRatio = Number(e.target.value)
    onOptionsChange({
      ...options,
      continuous: {
        ...options.continuous,
        dutyRatio,
      },
    })
  }

  return (
    <div className={clsx('grid', 'gap-6')}>
      <div className={clsx('flex', 'items-start', 'gap-16')}>
        <div className={clsx('text-lg', 'font-semibold')}>
          Device Control Panel
        </div>

        <button
          className={clsx(
            'px-4',
            'py-2',
            'rounded-md',
            'font-semibold',
            'transition-colors',
            options.continuous.enabled
              ? ['bg-primary-variant', 'text-primary-content']
              : ['bg-primary-content', 'text-primary-variant'],
          )}
          onClick={() => handleEnabledToggle(!options.continuous.enabled)}
        >
          {options.continuous.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {!isMediaPlaying && !isManualPlaying && options.continuous.enabled && (
        <div className={clsx('text-xs', 'text-gray-600')}>
          Media playback is paused. Device commands are not sent.
        </div>
      )}

      <div className={clsx('flex', 'items-center', 'gap-3')}>
        <button
          className={clsx(
            'px-4',
            'py-2',
            'rounded-md',
            'font-semibold',
            'transition-colors',
            isManualPlaying
              ? ['bg-primary-variant', 'text-primary-content']
              : ['bg-primary-content', 'text-primary-variant'],
            (isMediaPlaying || !options.continuous.enabled) && 'opacity-50',
          )}
          disabled={isMediaPlaying || !options.continuous.enabled}
          onClick={() => onManualPlayToggle(!isManualPlaying)}
        >
          {isManualPlaying ? 'Stop Manual' : 'Manual Play'}
        </button>
        <span className={clsx('text-xs', 'text-gray-600')}>
          {isMediaPlaying
            ? 'Disabled while media is playing'
            : options.continuous.enabled
              ? 'Play device motion without media playback'
              : 'Turn ON first'}
        </span>
      </div>

      <div className={clsx('grid', 'grid-cols-[240px_1fr]', 'gap-12')}>
        <div className={clsx('grid', 'gap-4', 'w-60')}>
          <div className={clsx('grid', 'gap-3')}>
            <div className={clsx('text-sm', 'font-medium')}>Speed</div>
            <input
              type="range"
              min={1}
              max={100}
              value={options.continuous.speed}
              onChange={handleSpeedChange}
              className={clsx('w-full')}
            />
            <div className={clsx('text-xs', 'text-gray-600')}>
              {options.continuous.speed}
            </div>
          </div>

          <div className={clsx('grid', 'gap-3')}>
            <div className={clsx('text-sm', 'font-medium')}>Up Time Ratio</div>
            <input
              type="range"
              min={20}
              max={80}
              value={options.continuous.dutyRatio}
              onChange={handleDutyRatioChange}
              className={clsx('w-full')}
            />
            <div className={clsx('text-xs', 'text-gray-600')}>
              {options.continuous.dutyRatio}%
            </div>
          </div>

          <div className={clsx('grid', 'gap-3')}>
            <div className={clsx('text-sm', 'font-medium')}>Invert Script</div>
            <div className={clsx('flex', 'items-center', 'gap-3')}>
              <ToggleSwitch
                checked={options.inverted}
                onChange={handleInvertToggle}
              />
              <span className={clsx('text-sm', 'text-gray-600')}>
                {options.inverted ? 'Inverted' : 'Normal'}
              </span>
            </div>
          </div>
        </div>

        <div className={clsx('grid', 'gap-4')}>
          <div className={clsx('text-sm', 'font-medium')}>Range Settings</div>
          <VerticalRangeSlider
            offsetValue={options.range.offset}
            limitValue={options.range.limit}
            onChange={handleRangeChange}
          />
        </div>
      </div>
    </div>
  )
}
