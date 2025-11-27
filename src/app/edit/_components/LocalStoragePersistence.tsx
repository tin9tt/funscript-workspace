'use client'

import { useEditorContext } from '../_hooks/editor'
import { useEffect } from 'react'
import { generateFileId } from '@/lib/utils/fileId'

export const LocalStoragePersistence = () => {
  const { state, loadActions } = useEditorContext()

  // ファイルが変更されたら localStorage からデータを読み込む
  useEffect(() => {
    if (!state.file) return

    const storageKey = `edit-${generateFileId(state.file)}`
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
  }, [state.file, loadActions])

  // アクションが変更されたら localStorage に保存
  useEffect(() => {
    if (!state.file || state.actions.length === 0) return

    const storageKey = `edit-${generateFileId(state.file)}`
    const data = {
      actions: state.actions,
      lastModified: Date.now(),
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }, [state.file, state.actions])

  return null
}
