'use client'

import { Card } from '../_components/common'
import { ScriptGraph } from './_components/ScriptGraph'
import clsx from 'clsx'
import { AudioGraph } from './_components/AudioGraph'
import { useFileContext } from './_hooks/file'
import { VideoViewer } from './_components/Video'
import { useDeviceContext } from './_hooks/device'
import { useEffect } from 'react'
import { useSeekContext } from './_hooks/seek'

export default function Scripts() {
  const { tracks } = useFileContext()
  const { devices, requestDevices, ...device } = useDeviceContext()
  const { isPlaying, currentTime, playPause } = useSeekContext(0)

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
      <Card className={clsx('py-8', 'grid', 'gap-8', 'min-h-64')}>
        <ScriptGraph
          actions={tracks[0]?.script?.actions ?? []}
          graphLeftPaddingPercentage={0.25}
        />
      </Card>
    </div>
  )
}
