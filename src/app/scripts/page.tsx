'use client'

import { Card } from '../_components/common'
import { ScriptGraph } from './_components/ScriptGraph'
import clsx from 'clsx'
import { AudioGraph } from './_components/AudioGraph'
import { useFileContext } from './_hooks/file'
import { VideoViewer } from './_components/Video'
import { useDeviceContext } from './_hooks/device'
import { useEffect, useRef, useState } from 'react'
import { useSeekContext } from './_hooks/seek'
import { OptionsPane, OptionsState } from './_components/OptionsPane'
import { useScriptInvert } from './_hooks/fileWithLinearOptions/invert/hook'
import { useScriptRange } from './_hooks/fileWithLinearOptions/range/hook'
import { HorizontalRangeSlider, ToggleSwitch } from '../_components/common'
import { TrackAudio, TrackVideo } from './_hooks/file/reducer'
import { DeviceControlPanel } from './_components/DeviceControlPanel'

const usePersistentOption = () => {
  const STORAGE_KEY = 'funscript-options'

  const defaultOptions: OptionsState = {
    inverted: false,
    range: {
      offset: 0,
      limit: 100,
    },
    continuous: {
      speed: 50,
      dutyRatio: 50,
      enabled: true,
    },
  }

  const [options, setOption] = useState<OptionsState>(defaultOptions)

  // クライアントサイドでlocalStorageから読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // 既存データとの後方互換を維持しつつデフォルト値とマージする
        setOption({
          ...defaultOptions,
          ...parsed,
          range: {
            ...defaultOptions.range,
            ...(parsed?.range ?? {}),
          },
          continuous: {
            ...defaultOptions.continuous,
            ...(parsed?.continuous ?? {}),
          },
        })
      }
    } catch (error) {
      console.warn('Failed to load options from localStorage:', error)
    }
  }, [])

  const saveOption = (newOption: OptionsState) => {
    setOption(newOption)

    // localStorageに保存
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOption))
    } catch (error) {
      console.warn('Failed to save options to localStorage:', error)
    }
  }

  return { options, saveOption }
}

const useLoopOption = (fileId: string, duration: number) => {
  const STORAGE_KEY = 'loop-range-' + fileId

  const defaultLoopRange = {
    offset: 0,
    limit: duration,
  }

  const [loopRange, setLoopRange] = useState<{
    offset: number
    limit: number
  }>(defaultLoopRange)

  // クライアントサイドでlocalStorageから読み込み
  useEffect(() => {
    if (!fileId) return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (
          typeof parsed.offset === 'number' &&
          (parsed.limit === undefined || typeof parsed.limit === 'number')
        ) {
          setLoopRange(parsed)
          return
        }
      }
    } catch (error) {
      console.warn('Failed to load loop range from localStorage:', error)
    }

    if (duration !== undefined) {
      setLoopRange({ offset: 0, limit: duration })
    }
  }, [STORAGE_KEY, fileId, duration])

  const saveLoopRange = (newLoopRange: { offset: number; limit: number }) => {
    setLoopRange(newLoopRange)

    console.log('Saving loop range for fileId:', fileId)
    if (!fileId) return

    try {
      console.log('Saving loop range to localStorage:', newLoopRange)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLoopRange))
    } catch (error) {
      console.warn('Failed to save loop range to localStorage:', error)
    }
  }

  return { loopRange, saveLoopRange }
}

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebounced(value)
    }, delayMs)

    return () => window.clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}

// ファイル名とサイズからハッシュを生成する関数（同期版）
const generateFileId = (file?: File): string => {
  if (!file) return ''
  const fileInfo = `${file.name}_${file.size}_${file.lastModified || 0}`

  // シンプルなハッシュ関数（djb2アルゴリズム）
  let hash = 5381
  for (let i = 0; i < fileInfo.length; i++) {
    hash = (hash << 5) + hash + fileInfo.charCodeAt(i)
  }

  // 16進数に変換して正の値にする
  return (hash >>> 0).toString(16)
}

const useFile = (duration: number) => {
  const { tracks, image } = useFileContext()
  const track = tracks.find(
    (track) => track.kind === 'audio' || track.kind === 'video',
  ) as TrackAudio | TrackVideo | undefined
  const { options, saveOption } = usePersistentOption()
  const { loopRange, saveLoopRange } = useLoopOption(
    generateFileId(track?.file),
    duration,
  )
  const invertedTracks = useScriptInvert({ tracks }, options.inverted)
  const finalTracks = useScriptRange(invertedTracks, options.range)
  return {
    ...finalTracks,
    image,
    option: options,
    saveOption,
    loopRange,
    saveLoopRange,
  }
}

export default function Scripts() {
  const { devices, requestDevices, ...device } = useDeviceContext()
  const hasConnectedDevice = Object.keys(devices).length > 0
  const hasScriptRef = useRef(false)

  const { isPlaying, currentTime, duration, play, pause, seek } =
    useSeekContext(0, {
      preSeek: async (seekTime, isPlaying) => {
        if (!hasScriptRef.current) {
          return
        }
        console.log(
          `Preparing to seek device to ${seekTime} (isPlaying: ${isPlaying})`,
        )
        if (isPlaying) device.pause()
        await device.seek(seekTime)
        await new Promise((resolve) => setTimeout(resolve, 500))
      },
      onSeek: async (seekTime, isPlaying) => {
        if (!hasScriptRef.current) {
          return
        }
        console.log(`Seeking device to ${seekTime} (isPlaying: ${isPlaying})`)
        if (isPlaying) device.play(Date.now(), seekTime * 1000)
      },
    })

  const { tracks, image, option, saveOption, loopRange, saveLoopRange } =
    useFile(duration)
  const hasScript = Boolean(tracks[0]?.script)
  hasScriptRef.current = hasScript

  // OptionsPane expansion state
  const [isPaneExpanded, setIsPaneExpanded] = useState(false)

  // Loop state
  const [isLoopEnabled, setIsLoopEnabled] = useState(false)
  const [isManualContinuousPlaying, setIsManualContinuousPlaying] =
    useState(false)

  const debouncedContinuousSpeed = useDebouncedValue(
    option.continuous.speed,
    250,
  )
  const debouncedContinuousDutyRatio = useDebouncedValue(
    option.continuous.dutyRatio,
    250,
  )
  const debouncedContinuousOffset = useDebouncedValue(option.range.offset, 250)
  const debouncedContinuousLimit = useDebouncedValue(option.range.limit, 250)
  const debouncedContinuousInverted = useDebouncedValue(option.inverted, 250)

  // Close OptionsPane when playback starts
  useEffect(() => {
    if (isPlaying && isPaneExpanded) {
      setIsPaneExpanded(false)
    }
  }, [isPlaying, isPaneExpanded])

  const handlePaneOpen = () => pause()

  // Handle range slider changes
  const handleLoopRangeChange = (offset: number, limit: number) => {
    saveLoopRange({ offset, limit })
  }

  useEffect(() => {
    // Loop functionality: if currentTime goes outside loop range, pause and seek back
    if (!isLoopEnabled || !duration) return

    if (
      currentTime < loopRange.offset ||
      currentTime > loopRange.limit ||
      currentTime === duration
    ) {
      // Seek to loop start
      if (currentTime < loopRange.offset) {
        seek(loopRange.offset)
      } else {
        seek(0, { skipCallback: true })
      }
      // NOTE: When currentTime goes over loopRange.limit, we cannot seek directly to loopRange.offset
      //   because useSeekContext cannot detect the seek control properly and sync with video/audio fails.
      //   So we first seek to 0 to make the control clear, then seek to loopRange.offset in the next call of this effect.
    }
  }, [currentTime, isLoopEnabled, loopRange, duration, seek])

  useEffect(() => {
    if (!hasConnectedDevice || !hasScript) {
      return
    }
    if (tracks.length === 0) {
      return
    }
    const track = tracks[0]
    if (!track.script) {
      return
    }
    const wasPlayed = isPlaying
    if (wasPlayed) {
      pause()
      device.pause()
    }
    device.load(track.script).then(async () => {
      await device.seek(currentTime)
      if (wasPlayed) {
        play()
        device.play(Date.now(), currentTime * 1000)
      }
    })
    // Note: This effect should only run with changes to devices or tracks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, tracks, hasConnectedDevice, hasScript])

  useEffect(() => {
    if (!hasConnectedDevice || !hasScript) {
      return
    }
    if (isPlaying) {
      device.seek(currentTime)
      device.play(Date.now(), currentTime * 1000)
    } else {
      device.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, hasConnectedDevice, hasScript])

  useEffect(() => {
    if (isPlaying) {
      setIsManualContinuousPlaying(false)
    }
  }, [isPlaying])

  useEffect(() => {
    if (!hasConnectedDevice || hasScript || !option.continuous.enabled) {
      setIsManualContinuousPlaying(false)
    }
  }, [hasConnectedDevice, hasScript, option.continuous.enabled])

  useEffect(() => {
    if (!hasConnectedDevice || hasScript) {
      device.stopContinuousMotion()
      return
    }

    const shouldPlayContinuous = isPlaying || isManualContinuousPlaying
    if (!option.continuous.enabled || !shouldPlayContinuous) {
      device.stopContinuousMotion()
      return
    }

    device.startContinuousMotion({
      speed: debouncedContinuousSpeed,
      dutyRatio: debouncedContinuousDutyRatio,
      offset: debouncedContinuousOffset,
      limit: debouncedContinuousLimit,
      inverted: debouncedContinuousInverted,
    })
  }, [
    hasConnectedDevice,
    hasScript,
    isPlaying,
    isManualContinuousPlaying,
    option.continuous.enabled,
    debouncedContinuousSpeed,
    debouncedContinuousDutyRatio,
    debouncedContinuousOffset,
    debouncedContinuousLimit,
    debouncedContinuousInverted,
  ])

  useEffect(() => {
    return () => {
      device.stopContinuousMotion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={clsx('grid', 'gap-8')}>
      <div className={clsx('flex', 'justify-center')}>
        <button onClick={requestDevices}>Connect</button>
      </div>
      <Card className={clsx('py-8', 'grid', 'gap-8')}>
        {tracks[0]?.kind === 'audio' && (
          <AudioGraph
            file={tracks[0]?.file}
            imageFile={image}
            graphLeftPaddingPercentage={0.25}
          />
        )}
        {tracks[0]?.kind === 'video' && (
          <div className={clsx('flex', 'justify-center')}>
            <VideoViewer file={tracks[0]?.file} />
          </div>
        )}
        {/* Range Slider and Loop Toggle */}
        <div className={clsx('flex', 'flex-col', 'gap-4', 'w-full')}>
          {/* Horizontal Range Slider */}
          <HorizontalRangeSlider
            offsetValue={loopRange.offset}
            limitValue={loopRange.limit}
            onChange={handleLoopRangeChange}
            disabled={isPlaying}
            duration={duration}
          />

          {/* Loop Toggle */}
          <div className={clsx('flex', 'justify-start', 'gap-2')}>
            <span className={clsx('text-sm', 'text-gray-600')}>Loop:</span>
            <ToggleSwitch
              checked={isLoopEnabled}
              onChange={setIsLoopEnabled}
              disabled={isPlaying}
            />
          </div>
        </div>
      </Card>
      {hasConnectedDevice && (
        <Card
          className={clsx(
            'py-8',
            'grid',
            'gap-8',
            'min-h-[396px]',
            'relative',
            'overflow-hidden',
          )}
        >
          {hasScript ? (
            <>
              <ScriptGraph
                actions={tracks[0]?.script?.actions ?? []}
                graphLeftPaddingPercentage={0.25}
              />
              {/* Options pane overlay */}
              <div className={clsx('absolute', 'top-0', 'right-0', 'z-10')}>
                <OptionsPane
                  options={option}
                  onOptionsChange={saveOption}
                  isPlaying={isPlaying}
                  onPaneOpen={handlePaneOpen}
                  isExpanded={isPaneExpanded}
                  onExpandedChange={setIsPaneExpanded}
                />
              </div>
            </>
          ) : (
            <DeviceControlPanel
              options={option}
              onOptionsChange={saveOption}
              isMediaPlaying={isPlaying}
              isManualPlaying={isManualContinuousPlaying}
              onManualPlayToggle={setIsManualContinuousPlaying}
            />
          )}
        </Card>
      )}
    </div>
  )
}
