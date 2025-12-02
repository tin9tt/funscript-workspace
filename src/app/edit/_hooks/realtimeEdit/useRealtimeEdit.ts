import { useCallback, useEffect, useState } from 'react'
import { useJobState } from './useJobState'
import { useActions } from '../actions'
import { FunscriptAction } from '@/lib/funscript'

interface UseRealtimeEditOptions {
  isPlaying: boolean
  currentTime: number
}

export const useRealtimeEdit = ({
  isPlaying,
  currentTime,
}: UseRealtimeEditOptions) => {
  const { addAction: addAction_, deleteLastAddedAction } = useActions(null)
  const jobState = useJobState({ isPlaying, currentTime })

  const [prevAddedAction, setPrevAddedAction] =
    useState<FunscriptAction | null>(null)
  const [noneProcessed, setNoneProcessed] = useState(false)
  const [deletedForTransition, setDeletedForTransition] = useState(false)

  const addAction = useCallback(
    (action: FunscriptAction) => {
      // 200ms以内に同じposのアクションを追加しようとした場合はスキップ
      if (
        prevAddedAction &&
        prevAddedAction.pos === action.pos &&
        action.at - prevAddedAction.at < 200
      ) {
        return
      }
      addAction_(action)
      setPrevAddedAction(action)
    },
    [addAction_, prevAddedAction],
  )

  // Job状態の変化を監視してアクションを記録
  useEffect(() => {
    // none から none への遷移は無視
    if (jobState.prev === 'none' && jobState.type === 'none') return

    const timestamp =
      jobState.type === 'none'
        ? Math.floor(currentTime)
        : 'startedAt' in jobState
          ? jobState.startedAt
          : Math.floor(currentTime)

    // Job状態に応じてアクションを記録
    switch (jobState.type) {
      case '100-0':
        if (jobState.prev === '0-0') {
          // J, K 同時押しから J 抜き → 直前の pos:0 を削除
          if (!deletedForTransition) {
            deleteLastAddedAction()
            setDeletedForTransition(true)
          }
          return
        }
        // none から他の状態への遷移時はフラグをリセット
        setNoneProcessed(false)
        setDeletedForTransition(false)
        // J を押した → pos:100 を記録
        addAction({ at: timestamp, pos: 100 })
        break
      case '0-100':
        if (jobState.prev === '100-100') {
          // J, K 同時押しから K 抜き → 直前の pos:100 を削除
          if (!deletedForTransition) {
            deleteLastAddedAction()
            setDeletedForTransition(true)
          }
          return
        }
        // none から他の状態への遷移時はフラグをリセット
        setNoneProcessed(false)
        setDeletedForTransition(false)
        // K を押した → pos:0 を記録
        addAction({ at: timestamp, pos: 0 })
        break
      case '0-0':
        // none から他の状態への遷移時はフラグをリセット
        setNoneProcessed(false)
        setDeletedForTransition(false)
        // J を先に押して K を追加 → pos:0 を記録
        addAction({ at: timestamp, pos: 0 })
        break
      case '100-100':
        // none から他の状態への遷移時はフラグをリセット
        setNoneProcessed(false)
        setDeletedForTransition(false)
        // K を先に押して J を追加 → pos:100 を記録
        addAction({ at: timestamp, pos: 100 })
        break
      case 'none':
        // none状態で既に処理済みの場合はスキップ
        if (noneProcessed) return

        // キーを離した → 前の状態に応じて終了posを記録
        if (jobState.prev === '100-0' || jobState.prev === '0-0') {
          // J系の状態から離した → pos:0 を記録
          addAction({ at: timestamp, pos: 0 })
          setNoneProcessed(true)
        } else if (jobState.prev === '0-100' || jobState.prev === '100-100') {
          // K系の状態から離した → pos:100 を記録
          addAction({ at: timestamp, pos: 100 })
          setNoneProcessed(true)
        }
        break
    }
  }, [
    jobState,
    currentTime,
    addAction,
    deleteLastAddedAction,
    noneProcessed,
    deletedForTransition,
  ])

  return jobState
}
