'use client'

import { useEffect, useRef, useState } from 'react'
import { useSeekContext } from '../_hooks/seek'

export const VideoViewer = ({ file }: { file?: File }) => {
  const [src, setSrc] = useState<string>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { currentTime, init, seek: seekState } = useSeekContext(1)

  useEffect(() => {
    if (!file) {
      return
    }
    setSrc(URL.createObjectURL(file))
    videoRef.current?.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  useEffect(() => {
    videoRef.current?.pause()
    videoRef.current!.currentTime = currentTime
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
