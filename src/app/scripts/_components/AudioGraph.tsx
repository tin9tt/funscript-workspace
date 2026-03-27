'use client'

import { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from '@wavesurfer/react'
import clsx from 'clsx'
import { AudioSelector } from './AudioSelector'
import WaveSurfer from 'wavesurfer.js'
import { roundTime, useSeekContext } from '../_hooks/seek'
import { ImageSelector } from './ImageSelector'

export const AudioGraph = ({
  file,
  onAddImage,
  graphLeftPaddingPercentage,
}: {
  file?: File
  onAddImage: (file: File) => void
  /** percentage of width as [0..1] (0 = 0%, 1 = 100%) */
  graphLeftPaddingPercentage: number
}) => {
  const [audioFile, setAudioFile] = useState<File | undefined>()
  const [url, setURL] = useState<string | undefined>()
  const [filename, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const onAudioFileSelected = (file: File) => {
    setAudioFile(file)
  }
  useEffect(() => {
    if (file && file.type.split('/')[0] === 'audio') {
      setAudioFile(file)
    }
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
    play,
    pause,
    seek,
    syncPlayStateOnFinish,
  } = useSeekContext(1)

  const [isFinished, setIsFinished] = useState(false)

  useEffect(() => {
    if (!audioFile) {
      setURL(undefined)
      setName('')
      setLoading(false)
      return
    }

    const objectURL = URL.createObjectURL(audioFile)
    setURL(objectURL)
    setName(audioFile.name)
    setLoading(true)
    setIsFinished(false)
    wavesurfer?.seekTo(0)

    return () => URL.revokeObjectURL(objectURL)
  }, [audioFile])

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
    seek(currentTime)
  }
  const graphContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    graphContainerRef.current?.scrollTo({ left: currentTime * 100 })
    wavesurfer?.seekTo(currentTime / duration)
    if (seeking === 2 && isPlaying) {
      pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, duration, wavesurfer])

  return (
    <div className={clsx('grid', 'gap-2')}>
      <div className={clsx('flex', 'justify-between')}>
        {filename &&
          `${filename}` + (loading ? '' : ` (${roundTime(duration)} s)`)}
        <div className={clsx('flex', 'gap-2')}>
          <ImageSelector set={onAddImage} />
          <AudioSelector set={onAudioFileSelected} />
        </div>
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
              pause()
            }
            seek(seekTime)
          }
        }}
        onScroll={(e) => {
          if (seeking !== number) {
            return
          }
          const seekTime = e.currentTarget.scrollLeft / 100
          seek(seekTime)
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
            seek(currentTime)
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
            seek(0)
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
              if (isPlaying) {
                pause()
              } else {
                play()
              }
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
