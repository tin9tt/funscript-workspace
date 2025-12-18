'use client'

import { usePlayback } from '../_hooks/playback'
import { useActions } from '../_hooks/actions'
import { useCallback } from 'react'
import { Funscript, isFunscript, sanitizeFunscript } from '@/lib/funscript'

export const FileSelector = () => {
  const { file, loadFile } = usePlayback()
  const { loadActions } = useActions(null)

  const isFunscriptFile = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith('.funscript')
  }

  const handleFunscriptFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text()
        const json = JSON.parse(text)

        if (!isFunscript(json)) {
          alert('無効な funscript ファイルです')
          return
        }

        const sanitized = sanitizeFunscript(json)
        loadActions(sanitized.actions)
      } catch (error) {
        console.error('Funscript ファイルの読み込みエラー:', error)
        alert('funscript ファイルの読み込みに失敗しました')
      }
    },
    [loadActions],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files) {
        for (const file of files) {
          if (isFunscriptFile(file.name)) {
            handleFunscriptFile(file)
          } else {
            loadFile(file)
          }
        }
      }
    },
    [loadFile, handleFunscriptFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const files = e.dataTransfer.files
      if (files) {
        for (const file of files) {
          if (isFunscriptFile(file.name)) {
            handleFunscriptFile(file)
          } else if (
            file.type.startsWith('video') ||
            file.type.startsWith('audio')
          ) {
            loadFile(file)
          }
        }
      }
    },
    [loadFile, handleFunscriptFile],
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
              accept="video/*,audio/*,.funscript"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-600">
            ドラッグ&ドロップまたはクリックしてファイルを選択
            <br />
            <span className="text-xs">
              （動画・音声・funscript ファイル対応）
            </span>
          </p>
          <label className="inline-block px-4 py-2 bg-primary-variant text-primary-content rounded cursor-pointer hover:bg-primary-variant/80">
            ファイルを選択
            <input
              type="file"
              accept="video/*,audio/*,.funscript"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  )
}
