'use client'

import { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from '@wavesurfer/react'
import clsx from 'clsx'
import { AudioSelector } from './AudioSelector'
import WaveSurfer from 'wavesurfer.js'
import { useSeekContext } from '../_hooks/seek'

export const AudioGraph = ({
  graphLeftPaddingPercentage,
}: {
  /** percentage of width as [0..1] (0 = 0%, 1 = 100%) */
  graphLeftPaddingPercentage: number
}) => {
  const [url, setURL] = useState<string | undefined>()
  const [filename, setName] = useState('')
  const onAudioFileSelected = (file: File) => {
    setURL(URL.createObjectURL(file))
    setName(file.name)
  }

  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | undefined>()
  const onReady = (ws: WaveSurfer) => {
    setWavesurfer(ws)
    init(ws.getDuration())
  }

  const {
    duration,
    number,
    seeking,
    currentTime,
    init,
    seek: seekState,
  } = useSeekContext(1)
  const scroll = (currentTime: number) => {
    if (seeking !== number) {
      return
    }
    graphContainerRef.current?.scrollTo({ left: currentTime * 100 })
    seekState(currentTime)
  }
  const graphContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    graphContainerRef.current?.scrollTo({ left: currentTime * 100 })
    wavesurfer?.seekTo(currentTime / duration)
    wavesurfer?.pause()
  }, [currentTime, duration, wavesurfer])

  const [isPlaying, setIsPlaying] = useState(false)
  const onPlayPause = () => {
    wavesurfer?.playPause()
  }

  return (
    <div className={clsx('grid', 'gap-2')}>
      <div className={clsx('flex', 'justify-between')}>
        {filename && `${filename} (${duration} s)`}
        <AudioSelector set={onAudioFileSelected} />
      </div>
      {url && (
        <div
          className={clsx('flex', 'overflow-x-scroll', 'scrollbar-hidden')}
          ref={graphContainerRef}
          onWheel={(e) => {
            const seekTime = e.currentTarget.scrollLeft / 100
            wavesurfer?.pause()
            seekState(seekTime)
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
            onPlay={() => {
              setIsPlaying(true)
              seekState(currentTime)
            }}
            onPause={() => setIsPlaying(false)}
            onAudioprocess={(_, currentTime) => scroll(currentTime)}
            onSeeking={(_, currentTime) => scroll(currentTime)}
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
      )}
      {url && (
        <div className={clsx('flex', 'justify-between')}>
          <button onClick={onPlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
        </div>
      )}
    </div>
  )
}