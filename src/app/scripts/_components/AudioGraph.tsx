'use client'

import { useEffect, useRef, useState } from 'react'
import WavesurferPlayer from '@wavesurfer/react'
import clsx from 'clsx'
import { AudioSelector } from './AudioSelector'
import WaveSurfer from 'wavesurfer.js'
import { useSeekContext } from '../_hooks/seek'
import { scrollToQuarter } from '../_hooks/seek/tool'

export const AudioGraph = () => {
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

  const { duration, currentTime, init, seek: scroll } = useSeekContext()
  const graphContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollToQuarter(graphContainerRef, currentTime)
  }, [currentTime])

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
          className={clsx('overflow-x-scroll', 'scrollbar-hidden ')}
          ref={graphContainerRef}
        >
          <div style={{ width: duration * 100 }}>
            <WavesurferPlayer
              url={url}
              onReady={onReady}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onAudioprocess={(_, currentTime) => scroll(currentTime)}
              onSeeking={(_, currentTime) => scroll(currentTime)}
            />
          </div>
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
