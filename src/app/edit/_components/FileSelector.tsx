'use client'

import { usePlayback } from '../_hooks/playback'
import { useCallback } from 'react'

export const FileSelector = () => {
  const { file, loadFile } = usePlayback()

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        loadFile(file)
      }
    },
    [loadFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (
        file &&
        (file.type.startsWith('video') || file.type.startsWith('audio'))
      ) {
        loadFile(file)
      }
    },
    [loadFile],
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  return (
    <div
      className="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {file ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{file.name}</p>
          <label className="inline-block px-4 py-2 bg-primary-variant text-primary-content rounded cursor-pointer hover:bg-primary-variant/80">
            ファイルを変更
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-600">
            ドラッグ&ドロップまたはクリックしてファイルを選択
          </p>
          <label className="inline-block px-4 py-2 bg-primary-variant text-primary-content rounded cursor-pointer hover:bg-primary-variant/80">
            ファイルを選択
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  )
}
