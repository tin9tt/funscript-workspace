'use client'

import { useEditorContext } from '../editor'
import { useEffect, useCallback } from 'react'

/**
 * グラフ編集のキーボード・ホイール操作を処理するフック
 * UI を持たないため、コンポーネントではなくフックとして実装
 */
export const useEditorGraphHandler = () => {
  const { state, moveSelected, scaleSelected, deleteActions } =
    useEditorContext()

  // キーボードによる編集操作
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 再生中は編集操作を無効化（J/Kは作成モード）
      if (state.isPlaying) return

      // 選択されていない場合は何もしない
      if (state.selectedIndices.length === 0) return

      const key = e.key.toLowerCase()

      // J/K で上下移動
      if (key === 'j') {
        e.preventDefault()
        const delta = e.altKey || e.metaKey ? -1 : -5
        moveSelected(delta)
      } else if (key === 'k') {
        e.preventDefault()
        const delta = e.altKey || e.metaKey ? 1 : 5
        moveSelected(delta)
      }
      // Delete または Backspace で削除
      else if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        deleteActions(state.selectedIndices)
      }
    },
    [state.isPlaying, state.selectedIndices, moveSelected, deleteActions],
  )

  // ホイールスクロールによる編集操作
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // グラフエリアの外ではスクロール操作を無効化
      const target = e.target as HTMLElement
      if (!target.closest('[data-graph-container]')) return

      // 選択されていない場合は何もしない
      if (state.selectedIndices.length === 0) return

      e.preventDefault()

      const delta = e.deltaY > 0 ? -5 : 5

      if (e.altKey || e.metaKey) {
        // Alt/Option + スクロール: 拡大/縮小
        const factor = delta > 0 ? 1.1 : 0.9
        scaleSelected(factor)
      } else {
        // 通常スクロール: 上下移動
        moveSelected(delta)
      }
    },
    [state.selectedIndices, moveSelected, scaleSelected],
  )

  // イベントリスナーを登録
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [handleKeyDown, handleWheel])
}
