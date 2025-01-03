'use client'

import { useEffect, useRef, useState } from 'react'
import { useSeekContext } from '../_hooks/seek'

export const VideoViewer = ({ file }: { file?: File }) => {
  const [src, setSrc] = useState<string>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { seeking, currentTime, init, seek: seekState } = useSeekContext(1)

  useEffect(() => {
    if (!file) {
      return
    }
    setSrc(URL.createObjectURL(file))
    videoRef.current?.focus()
    videoRef.current?.load()
    videoRef.current!.currentTime = 0
    seekState(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  useEffect(() => {
    if (seeking === 2) {
      videoRef.current?.pause()
    }
    videoRef.current!.currentTime = currentTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime])

  return (
    <video
      controls
      ref={videoRef}
      onDurationChange={(e) => init(e.currentTarget.duration)}
      onSeeking={(e) => seekState(e.currentTarget.currentTime)}
      onTimeUpdate={(e) => seekState(e.currentTarget.currentTime)}
    >
      <source src={src} />
    </video>
  )
}
