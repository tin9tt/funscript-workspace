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
    if (seeking === 2) {
      wavesurfer?.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, duration, wavesurfer])

  const [isPlaying, setIsPlaying] = useState(false)
  const onPlayPause = () => {
    wavesurfer?.playPause()
  }

  return (
    <div className={clsx('grid', 'gap-2')}>
      <div className={clsx('flex', 'justify-between')}>
        {filename &&
          `${filename}` + (loading ? '' : ` (${roundTime(duration)} s)`)}
        <AudioSelector set={onAudioFileSelected} />
      </div>
      {loading && <>{`Loading...`}</>}
      <div
        className={clsx('flex', 'overflow-x-scroll', 'scrollbar-hidden')}
        hidden={loading}
        ref={graphContainerRef}
        onWheel={(e) => {
          if (e.deltaX !== 0) {
            const seekTime = e.currentTarget.scrollLeft / 100
            wavesurfer?.pause()
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
      {url && !loading && (
        <div className={clsx('flex', 'justify-start', 'gap-4')}>
          <button onClick={onPlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
          {`${roundTime(wavesurfer?.getCurrentTime() ?? 0)} s`}
        </div>
      )}
    </div>
  )
}
