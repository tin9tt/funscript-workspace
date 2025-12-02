'use client'

import { usePlayback } from '../playback'
import { useActions } from '../actions'
import { useEffect } from 'react'
import { generateFileId } from '@/lib/utils/fileId'

/**
 * localStorage への自動保存・読み込みを処理するフック
 * UI を持たないため、コンポーネントではなくフックとして実装
 */
export const useLocalStoragePersistence = () => {
  const { file } = usePlayback()
  const { actions, loadActions } = useActions(null)

  // ファイルが変更されたら localStorage からデータを読み込む
  useEffect(() => {
    if (!file) return

    const storageKey = `edit-${generateFileId(file)}`
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (data.actions && Array.isArray(data.actions)) {
          loadActions(data.actions)
        }
      } catch (e) {
        console.error('Failed to load from localStorage:', e)
      }
    }
  }, [file, loadActions])

  // アクションが変更されたら localStorage に保存
  useEffect(() => {
    if (!file || actions.length === 0) return

    const storageKey = `edit-${generateFileId(file)}`
    const data = {
      actions: actions,
      lastModified: Date.now(),
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }, [file, actions])
}
