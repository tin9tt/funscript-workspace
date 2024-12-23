'use client'

import { useRef, useState } from 'react'
import WavesurferPlayer from '@wavesurfer/react'
import clsx from 'clsx'
import { AudioSelector } from './AudioSelector'
import WaveSurfer from 'wavesurfer.js'

export const AudioGraph = () => {
  const [url, setURL] = useState<string | undefined>()
  const [filename, setName] = useState('')
  const onAudioFileSelected = (file: File) => {
    setURL(URL.createObjectURL(file))
    setName(file.name)
  }

  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | undefined>()
  const [duration, setDuration] = useState(0)
  const onReady = (ws: WaveSurfer) => {
    setWavesurfer(ws)
    setDuration(ws.getDuration())
  }

  const waveContainerRef = useRef<HTMLDivElement>(null)
  const scrollToQuarter = (currentTime: number) => {
    const containerWidth = waveContainerRef.current?.clientWidth ?? 0
    const offset = -containerWidth / 4
    waveContainerRef.current?.scroll({
      left: offset + currentTime * 100,
    })
  }

  const [isPlaying, setIsPlaying] = useState(false)
  const onPlayPause = () => {
    wavesurfer?.playPause()
  }

  return (
    <div className={clsx('grid', 'gap-2')}>
      <div className={clsx('flex', 'justify-between')}>
        {filename && `${filename} (${duration} ms)`}
        <AudioSelector set={onAudioFileSelected} />
      </div>
      {url && (
        <div
          className={clsx('overflow-x-scroll', 'scrollbar-hidden ')}
          ref={waveContainerRef}
        >
          <div style={{ width: duration * 100 }}>
            <WavesurferPlayer
              url={url}
              onReady={onReady}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onAudioprocess={(_, currentTime) => scrollToQuarter(currentTime)}
              onSeeking={(_, currentTime) => scrollToQuarter(currentTime)}
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
