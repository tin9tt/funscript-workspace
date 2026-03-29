'use client'

import clsx from 'clsx'
import { FiPause, FiPlay, FiX } from 'react-icons/fi'
import { ToggleSwitch, VerticalRangeSlider } from '@/app/_components/common'
import { DeviceControlPanel } from './DeviceControlPanel'
import type { OptionsState } from './OptionsPane'

export type FullscreenOverlayProps = {
  options: OptionsState
  onOptionsChange: (options: OptionsState) => void
  isMediaPlaying: boolean
  onPlayToggle: () => void
  isManualPlaying: boolean
  onManualPlayToggle: (playing: boolean) => void
  hasScript: boolean
  hasConnectedDevice: boolean
}

type Props = FullscreenOverlayProps & {
  onClose: () => void
}

export const FullscreenControlOverlay = ({
  options,
  onOptionsChange,
  isMediaPlaying,
  onPlayToggle,
  isManualPlaying,
  onManualPlayToggle,
  hasScript,
  hasConnectedDevice,
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
