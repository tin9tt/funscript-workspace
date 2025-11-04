'use client'

import { Card } from '../_components/common'
import { ScriptGraph } from './_components/ScriptGraph'
import clsx from 'clsx'
import { AudioGraph } from './_components/AudioGraph'
import { useFileContext } from './_hooks/file'
import { VideoViewer } from './_components/Video'
import { useDeviceContext } from './_hooks/device'
import { useEffect, useState } from 'react'
import { useSeekContext } from './_hooks/seek'
import { OptionsPane, OptionsState } from './_components/OptionsPane'
import { useScriptInvert } from './_hooks/fileWithLinearOptions/invert/hook'
import { useScriptRange } from './_hooks/fileWithLinearOptions/range/hook'

const usePersistentOption = () => {
  const STORAGE_KEY = 'funscript-options'

  const defaultOptions: OptionsState = {
    inverted: false,
    range: {
      offset: 0,
      limit: 100,
    },
  }

  const [options, setOption] = useState<OptionsState>(defaultOptions)

  // クライアントサイドでlocalStorageから読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // 基本的なバリデーション
        if (
          typeof parsed.inverted === 'boolean' &&
          typeof parsed.range?.offset === 'number' &&
          typeof parsed.range?.limit === 'number'
        ) {
          setOption(parsed)
        }
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

const useFile = () => {
  const { tracks } = useFileContext()
  const { options, saveOption } = usePersistentOption()
  const invertedTracks = useScriptInvert({ tracks }, options.inverted)
  const finalTracks = useScriptRange(invertedTracks, options.range)
  return { ...finalTracks, option: options, saveOption }
}

export default function Scripts() {
  const { devices, requestDevices, ...device } = useDeviceContext()
  const { isPlaying, currentTime, playPause } = useSeekContext(0)

  const { tracks, option, saveOption } = useFile()

  // OptionsPane expansion state
  const [isPaneExpanded, setIsPaneExpanded] = useState(false)

  // Close OptionsPane when playback starts
  useEffect(() => {
    if (isPlaying && isPaneExpanded) {
      setIsPaneExpanded(false)
    }
  }, [isPlaying, isPaneExpanded])

  const handlePaneOpen = () => {
    if (isPlaying) {
      playPause() // Stop playback when pane is opened during playback
    }
  }

  useEffect(() => {
    if (tracks.length === 0) {
      return
    }
    const track = tracks[0]
    if (!track.script) {
      return
    }
    const isPlayed = isPlaying
    if (isPlayed) {
      playPause()
      device.pause()
    }
    device.load(track.script).then(async () => {
      await device.seek(currentTime)
      if (isPlayed) {
        playPause()
        device.play(Date.now(), currentTime * 1000)
      }
    })
    // Note: This effect should only run with changes to devices or tracks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, tracks])

  useEffect(() => {
    if (isPlaying) {
      device.seek(currentTime)
      device.play(Date.now(), currentTime * 1000)
    } else {
      device.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  return (
    <div className={clsx('grid', 'gap-8')}>
      <div className={clsx('flex', 'justify-center')}>
        <button onClick={requestDevices}>Connect</button>
      </div>
      <Card className={clsx('py-8', 'grid', 'gap-8')}>
        {tracks[0]?.kind === 'audio' && (
          <AudioGraph
            file={tracks[0]?.audio}
            graphLeftPaddingPercentage={0.25}
          />
        )}
        {tracks[0]?.kind === 'video' && (
          <div className={clsx('flex', 'justify-center')}>
            <VideoViewer file={tracks[0]?.video} />
          </div>
        )}
      </Card>
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
      </Card>
    </div>
  )
}
