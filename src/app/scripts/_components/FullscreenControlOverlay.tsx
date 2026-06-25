'use client'

import clsx from 'clsx'
import { FiPause, FiPlay, FiX } from 'react-icons/fi'
import { ToggleSwitch, VerticalRangeSlider } from '@/app/_components/common'
import { DeviceControlPanel } from './DeviceControlPanel'
import type { OptionsState } from './OptionsPane'

export type FullscreenOverlayProps = {
  options: OptionsState
  onOptionsChange: (options: OptionsState) => void
  timingOffsetMs: number
  onTimingOffsetChange: (ms: number) => void
  isMediaPlaying: boolean
  onPlayToggle: () => void
  isManualPlaying: boolean
  onManualPlayToggle: (playing: boolean) => void
  hasScript: boolean
  hasConnectedDevice: boolean
  isDeviceSyncEnabled: boolean
  onDeviceSyncToggle: (enabled: boolean) => void
}

type Props = FullscreenOverlayProps & {
  onClose: () => void
}

export const FullscreenControlOverlay = ({
  options,
  onOptionsChange,
  timingOffsetMs,
  onTimingOffsetChange,
  isMediaPlaying,
  onPlayToggle,
  isManualPlaying,
  onManualPlayToggle,
  hasScript,
  hasConnectedDevice,
  isDeviceSyncEnabled,
  onDeviceSyncToggle,
  onClose,
}: Props) => {
  const handleInvertToggle = (checked: boolean) =>
    onOptionsChange({ ...options, inverted: checked })

  const handleRangeChange = (offset: number, limit: number) =>
    onOptionsChange({ ...options, range: { offset, limit } })

  return (
    <div
      className={clsx(
        'absolute',
        'inset-0',
        'z-20',
        'flex',
        'items-end',
        'justify-end',
        'bg-black/20',
      )}
      onClick={onClose}
    >
      <div
        className={clsx(
          'm-4',
          'w-96',
          'max-h-[80vh]',
          'overflow-y-auto',
          'rounded-xl',
          'bg-zinc-900/90',
          'p-4',
          'text-white',
          'space-y-6',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx('flex', 'items-center', 'justify-between')}>
          <div className={clsx('text-lg', 'font-semibold')}>Controls</div>
          <button
            type="button"
            className={clsx('rounded-full', 'p-2', 'hover:bg-white/10')}
            onClick={onClose}
            aria-label="Close controls"
          >
            <FiX size={16} />
          </button>
        </div>

        <button
          type="button"
          className={clsx(
            'flex',
            'w-full',
            'items-center',
            'justify-center',
            'gap-2',
            'rounded-lg',
            'border',
            'border-white/20',
            'py-3',
            'font-semibold',
            'transition-colors',
            isMediaPlaying
              ? ['bg-white/10', 'hover:bg-white/20']
              : ['bg-white/20', 'hover:bg-white/30'],
          )}
          onClick={onPlayToggle}
          aria-label={isMediaPlaying ? 'Pause' : 'Play'}
        >
          {isMediaPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
          {isMediaPlaying ? 'Pause' : 'Play'}
        </button>

        {hasConnectedDevice && hasScript && (
          <div
            className={clsx('flex', 'items-center', 'justify-between', 'py-1')}
          >
            <span className={clsx('text-sm', 'font-medium')}>Sync Device</span>
            <ToggleSwitch
              checked={isDeviceSyncEnabled}
              onChange={onDeviceSyncToggle}
            />
          </div>
        )}

        {hasScript && (
          <div className={clsx('space-y-4')}>
            <div
              className={clsx(
                'text-xs',
                'font-semibold',
                'uppercase',
                'tracking-wider',
                'text-white/50',
              )}
            >
              Script Options
            </div>

            <div className={clsx('space-y-3')}>
              <div className={clsx('text-sm', 'font-medium')}>
                Invert Script
              </div>
              <div className={clsx('flex', 'items-center', 'gap-3')}>
                <ToggleSwitch
                  checked={options.inverted}
                  onChange={handleInvertToggle}
                  disabled={isMediaPlaying}
                />
                <span className={clsx('text-sm', 'text-white/60')}>
                  {options.inverted ? 'Inverted' : 'Normal'}
                </span>
              </div>
            </div>

            <div className={clsx('space-y-3')}>
              <div className={clsx('text-sm', 'font-medium')}>
                Range Settings
              </div>
              <VerticalRangeSlider
                offsetValue={options.range.offset}
                limitValue={options.range.limit}
                onChange={handleRangeChange}
                disabled={isMediaPlaying}
              />
            </div>

            <div className={clsx('space-y-3')}>
              <div className={clsx('text-sm', 'font-medium')}>
                Script Offset
              </div>
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
                  disabled={isMediaPlaying}
                  className={clsx(
                    'w-20',
                    'rounded',
                    'border',
                    'border-white/30',
                    'bg-white/10',
                    'px-2',
                    'py-1',
                    'text-center',
                    'text-sm',
                    'text-white',
                    'focus:outline-none',
                    'focus:ring-1',
                    'focus:ring-white/50',
                    isMediaPlaying && 'opacity-50 cursor-not-allowed',
                  )}
                />
                <span className={clsx('text-sm', 'text-white/60')}>ms</span>
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
                      isMediaPlaying ||
                      (delta < 0 && timingOffsetMs <= -600) ||
                      (delta > 0 && timingOffsetMs >= 600)
                    }
                    className={clsx(
                      'rounded',
                      'border',
                      'border-white/20',
                      'px-1',
                      'py-1',
                      'text-xs',
                      'transition-colors',
                      'hover:border-white/50',
                      'hover:bg-white/10',
                      'disabled:opacity-50',
                      'disabled:cursor-not-allowed',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isMediaPlaying && (
              <div
                className={clsx('text-center', 'text-xs', 'text-orange-400')}
              >
                Stop playback to edit options
              </div>
            )}
          </div>
        )}

        {hasConnectedDevice && !hasScript && (
          <DeviceControlPanel
            options={options}
            onOptionsChange={onOptionsChange}
            isMediaPlaying={isMediaPlaying}
            isManualPlaying={isManualPlaying}
            onManualPlayToggle={onManualPlayToggle}
            compact
          />
        )}
      </div>
    </div>
  )
}
