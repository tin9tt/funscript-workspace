'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import WavesurferPlayer from '@wavesurfer/react'
import clsx from 'clsx'
import { AudioSelector } from './AudioSelector'
import WaveSurfer from 'wavesurfer.js'
import { roundTime, useSeekContext } from '../_hooks/seek'

export const AudioGraph = ({
  file,
  graphLeftPaddingPercentage,
}: {
  file?: File
  /** percentage of width as [0..1] (0 = 0%, 1 = 100%) */
  graphLeftPaddingPercentage: number
}) => {
  const [url, setURL] = useState<string | undefined>()
  const [filename, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const onAudioFileSelected = (file: File) => {
    setURL(URL.createObjectURL(file))
    setName(file.name)
    setLoading(true)
    wavesurfer?.seekTo(0)
  }
  useLayoutEffect(() => {
    if (file && file.type.split('/')[0] === 'audio') {
      onAudioFileSelected(file)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | undefined>()
  const onReady = (ws: WaveSurfer) => {
    setWavesurfer(ws)
    init(ws.getDuration())
    setLoading(false)
  }

  const {
    duration,
    number,
    isPlaying,
    seeking,
    currentTime,
    init,
    playPause,
    seek: seekState,
    syncPlayStateOnFinish,
  } = useSeekContext(1)

  const [isFinished, setIsFinished] = useState(false)

  useEffect(() => {
    // 再生終了フラグがセットされている場合は自動再生を防ぐ
    if (!isFinished) {
      wavesurfer?.playPause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isFinished])
  const scroll = (currentTime: number) => {
    graphContainerRef.current?.scrollTo({ left: currentTime * 100 })
    if (seeking === 2) {
      return
    }
    seekState(currentTime)
  }
  const graphContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    graphContainerRef.current?.scrollTo({ left: currentTime * 100 })
    wavesurfer?.seekTo(currentTime / duration)
    if (seeking === 2 && isPlaying) {
      playPause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, duration, wavesurfer])

  return (
    <div className={clsx('grid', 'gap-2')}>
      <div className={clsx('flex', 'justify-between')}>
        {filename &&
          `${filename}` + (loading ? '' : ` (${roundTime(duration)} s)`)}
        <AudioSelector set={onAudioFileSelected} />
      </div>
      {loading && <>{`Loading...`}</>}
      <div
        className={clsx('flex', 'overflow-x-scroll', 'scrollbar-primary')}
        hidden={loading}
        ref={graphContainerRef}
        onWheel={(e) => {
          if (e.deltaX !== 0) {
            const seekTime = e.currentTarget.scrollLeft / 100
            if (isPlaying) {
              playPause()
            }
            seekState(seekTime)
          }
        }}
        onScroll={(e) => {
          if (seeking !== number) {
            return
          }
          const seekTime = e.currentTarget.scrollLeft / 100
          seekState(seekTime)
          if (!isPlaying) {
            wavesurfer?.seekTo(seekTime / duration)
          }
        }}
      >
        <div
          className={clsx('h-full')}
          style={{
            minWidth:
              (graphContainerRef.current?.clientWidth ?? 0) *
              graphLeftPaddingPercentage,
          }}
          onClick={() => wavesurfer?.seekTo(0)}
        />
        <WavesurferPlayer
          width={duration * 100}
          url={url}
          onReady={onReady}
          onClick={async () => {
            const sleep = (ms: number) =>
              new Promise((res) => setTimeout(res, ms))
            await sleep(50)
            seekState(currentTime)
            scroll(currentTime)
          }}
          onAudioprocess={(_, currentTime) => scroll(currentTime)}
          onSeeking={(_, currentTime) => scroll(currentTime)}
          onFinish={() => {
            // 再生終了フラグを設定
            setIsFinished(true)
            // wavesurferを停止し、位置をリセット
            wavesurfer?.pause()
            wavesurfer?.seekTo(0)
            seekState(0)
            syncPlayStateOnFinish()
          }}
        />
        <div
          className={clsx('h-full')}
          style={{
            minWidth:
              (graphContainerRef.current?.clientWidth ?? 0) *
              (1 - graphLeftPaddingPercentage),
          }}
          onClick={() => wavesurfer?.seekTo(duration)}
        />
      </div>
      {url && !loading && (
        <div className={clsx('flex', 'justify-start', 'gap-4')}>
          <button
            onClick={() => {
              setIsFinished(false)
              playPause()
            }}
            autoFocus
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          {`${roundTime(wavesurfer?.getCurrentTime() ?? 0)} s`}
        </div>
      )}
    </div>
  )
}
