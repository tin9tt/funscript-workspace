'use client'

import { usePlayback } from '../_hooks/playback'
import { useActions } from '../_hooks/actions'
import { useSelect } from '../_hooks/select'
import { useCallback } from 'react'
import {
  sanitizeFunscript,
  Funscript,
  findOutOfRangeSpeedSegments,
} from '@/lib/funscript'

export const Controls = () => {
  const { file, seekTo } = usePlayback()
  const { actions, clearActions } = useActions(null)
  const { selectedIndices } = useSelect()

  const handleExport = useCallback(() => {
    if (!file || actions.length === 0) {
      alert('エクスポートするデータがありません')
      return
    }

    // Funscript 形式に変換
    const funscript: Funscript = {
      version: '1.0',
      actions: actions,
    }

    // 検証と正規化
    const sanitized = sanitizeFunscript(funscript)

    // 速度が範囲外のセグメントをチェック
    const outOfRangeIndices = findOutOfRangeSpeedSegments(sanitized.actions)
    if (outOfRangeIndices.length > 0) {
      const count = outOfRangeIndices.length
      const confirmed = confirm(
        `速度が範囲外（5～80）のセグメントが${count}個検出されました。\nエクスポートを続行しますか？`,
      )
      if (!confirmed) {
        const firstSegmentAction = sanitized.actions[outOfRangeIndices[0]]
        seekTo(firstSegmentAction.at)
        return
      }
    }

    // JSON に変換
    const json = JSON.stringify(sanitized, null, 2)
    const blob = new Blob([json], { type: 'application/json' })

    // ファイル名を生成（元のファイル名から拡張子を除いて .funscript を追加）
    const originalName = file.name
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
    const fileName = `${nameWithoutExt}.funscript`

    // ダウンロード
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [file, actions, seekTo])

  const handleClear = useCallback(() => {
    if (!file) return

    if (confirm('すべてのアクションをクリアしますか？')) {
      clearActions()
    }
  }, [file, clearActions])

  return (
    <div className="flex gap-4 items-center">
      <button
        onClick={handleExport}
        disabled={!file || actions.length === 0}
        className="px-4 py-2 rounded disabled:cursor-not-allowed"
      >
        📥 エクスポート
      </button>

      <button onClick={handleClear} className="px-4 py-2 rounded">
        🗑️ クリア
      </button>

      <div className="text-sm">
        選択中: {selectedIndices.length}点 | 合計: {actions.length}点
      </div>
    </div>
  )
}
