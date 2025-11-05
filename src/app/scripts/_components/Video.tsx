'use client'

import { useEffect, useRef, useState } from 'react'
import { useSeekContext } from '../_hooks/seek'

export const VideoViewer = ({ file }: { file?: File }) => {
  const [src, setSrc] = useState<string>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isPlaying, seeking, currentTime, init, play, pause, seek } =
    useSeekContext(1)

  useEffect(() => {
    if (!file) {
      return
    }
    setSrc(URL.createObjectURL(file))
    videoRef.current?.focus()
    videoRef.current?.load()
    videoRef.current!.currentTime = 0
    if (isPlaying) pause()
    seek(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  useEffect(() => {
    if (!isPlaying) {
      videoRef.current?.pause()
    } else {
      videoRef.current?.play()
    }
  }, [isPlaying])

  useEffect(() => {
    if (seeking === 2 && isPlaying) {
      pause()
    }
    videoRef.current!.currentTime = currentTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime])

  return (
    <video
      controls
      ref={videoRef}
      onDurationChange={(e) => init(e.currentTarget.duration)}
      onSeeking={(e) => seek(e.currentTarget.currentTime)}
      onTimeUpdate={(e) => seek(e.currentTarget.currentTime)}
      onPlay={play}
      onPause={pause}
    >
      <source src={src} />
    </video>
  )
}
