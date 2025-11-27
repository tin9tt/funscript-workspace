'use client'

import { useEditorContext } from '../_hooks/editor'
import { useCallback } from 'react'

export const FileSelector = () => {
  const { state, loadFile } = useEditorContext()

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
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {state.file ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{state.file.name}</p>
          <label className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded cursor-pointer hover:bg-gray-300">
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
          <label className="inline-block px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600">
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
