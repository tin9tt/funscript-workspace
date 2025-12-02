'use client'

import {
  RefObject,
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react'
import { FunscriptAction } from '@/lib/funscript'
import { useGUIEditInputHandle } from './useGUIEditInputHandle'
import { useGUIEditKeyboardHandle } from './useGUIEditKeyboardHandle'

const EDIT_COMMIT_DELAY = 300 // 編集終了後、実際にコミットするまでの待機時間（ms）

interface UseGUIEditParams {
  canvasRef: RefObject<HTMLCanvasElement>
  actions: FunscriptAction[]
  selectedIndices: number[]
  lastSelectedIndex: number | null
  currentTime: number
  setSelected: (indices: number[]) => void
  addSelected: (index: number) => void
  setRangeSelected: (startIndex: number, endIndex: number) => void
  clearSelected: () => void
  updateSelectedFromBase: (
    indices: number[],
    baseActions: FunscriptAction[],
    updateFn: (action: FunscriptAction, index: number) => FunscriptAction,
  ) => void
}

export const useGUIEdit = (params: UseGUIEditParams) => {
  // 編集中の一時状態を管理
  const [isEditing, setIsEditing] = useState(false)
  const [tmpActions, setTmpActions] = useState<FunscriptAction[]>([])
  const tmpActionsRef = useRef<FunscriptAction[]>([]) // コミット時に最新の値を取得するため
  const baseActionsRef = useRef<FunscriptAction[]>([])
  const baseIndicesRef = useRef<number[]>([])
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null)

  // tmpActionsが変更されたらrefも更新
  useEffect(() => {
    tmpActionsRef.current = tmpActions
  }, [tmpActions])

  // 編集中はtmpActionsを、それ以外はparamsのactionsを使用
  const effectiveActions = useMemo(() => {
    return isEditing && tmpActions.length > 0 ? tmpActions : params.actions
  }, [isEditing, tmpActions, params.actions])

  // 編集コミット処理
  const commitEdit = useCallback(() => {
    // 最新のtmpActionsをrefから取得
    const currentTmpActions = tmpActionsRef.current
    if (currentTmpActions.length > 0 && baseIndicesRef.current.length > 0) {
      params.updateSelectedFromBase(
        baseIndicesRef.current,
        baseActionsRef.current,
        (_, index) => currentTmpActions[index] || baseActionsRef.current[index],
      )
      setIsEditing(false)
      setTmpActions([])
      tmpActionsRef.current = []
      baseActionsRef.current = []
      baseIndicesRef.current = []
    }
  }, [params])

  // 編集コミットをスケジュール
  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current)
    }

    commitTimerRef.current = setTimeout(() => {
      commitEdit()
      commitTimerRef.current = null
    }, EDIT_COMMIT_DELAY)
  }, [commitEdit])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current)
      }
    }
  }, [])

  // updateSelectedFromBaseをラップして一時編集を管理
  const wrappedUpdateSelectedFromBase = useCallback(
    (
      indices: number[],
      baseActions: FunscriptAction[],
      updateFn: (action: FunscriptAction, index: number) => FunscriptAction,
    ) => {
      // 初回編集時にベースを保存
      if (!isEditing) {
        setIsEditing(true)
        baseActionsRef.current = [...baseActions]
        baseIndicesRef.current = [...indices]
        setTmpActions([...baseActions])
      }

      // tmpActionsに更新を適用
      const currentActions =
        isEditing && tmpActions.length > 0 ? tmpActions : baseActions
      const newActions = [...currentActions]

      for (const index of indices) {
        const action = baseActions[index]
        if (action) {
          newActions[index] = updateFn(action, index)
        }
      }

      setTmpActions(newActions)
      tmpActionsRef.current = newActions // refも同期
      scheduleCommit()
    },
    [isEditing, tmpActions, scheduleCommit],
  )

  const inputHandlers = useGUIEditInputHandle({
    ...params,
    actions: effectiveActions, // 編集中はtmpActionsを渡す
    updateSelectedFromBase: wrappedUpdateSelectedFromBase,
  })

  // キーボード・ホイール操作ハンドラ
  useGUIEditKeyboardHandle({
    updateSelectedFromBase: wrappedUpdateSelectedFromBase,
    actions: effectiveActions,
    selectedIndices: params.selectedIndices,
  })

  return {
    ...inputHandlers,
    effectiveActions, // 編集中はtmpActions、それ以外はactionsを返す
    isEditing,
  }
}
