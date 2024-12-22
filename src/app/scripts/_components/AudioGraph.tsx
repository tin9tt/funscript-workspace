'use client'

import { useState } from 'react'
import WavesurferPlayer from '@wavesurfer/react'
import clsx from 'clsx'
import { AudioSelector } from './AudioSelector'

export const AudioGraph = () => {
  const [url, setURL] = useState<string | undefined>()
  const [filename, setName] = useState('')

  const onAudioFileSelected = (file: File) => {
    setURL(URL.createObjectURL(file))
    setName(file.name)
  }

  return (
    <div className={clsx('grid', 'gap-2')}>
      <div className={clsx('flex', 'justify-between')}>
        {filename}
        <AudioSelector set={onAudioFileSelected} />
      </div>
      {url && <WavesurferPlayer url={url} />}
    </div>
  )
}
