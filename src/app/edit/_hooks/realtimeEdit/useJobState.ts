import { useEffect, useState } from 'react'
import { useKeyboardInput, type InputStateType } from './useKeyboardInput'

// Job状態の型定義
type JobState =
  | { type: 'none' } // 入力無し
  | { type: '100-0'; startedAt: number } // 100 から 0 に向かっている (J)
  | { type: '0-100'; startedAt: number } // 0 から 100 に向かっている (K)
  | { type: '0-0'; startedAt: number } // 0 から 0 に向かっている (J (first) + K)
  | { type: '100-100'; startedAt: number } // 100 から 100 に向かっている (K (first) + J)

export type JobStateType = JobState['type']

interface UseJobStateOptions {
  isPlaying: boolean
  currentTime: number
}

export const useJobState = ({ isPlaying, currentTime }: UseJobStateOptions) => {
  const [jobState, setJobState] = useState<JobState>({ type: 'none' })
  const [prevJobStateType, setPrevJobStateType] = useState<JobStateType>('none')

  // useKeyboardInput で現在の入力状態を取得
  const currentInputState = useKeyboardInput({ isPlaying })

  // 前回の入力状態を追跡
  const [prevInputState, setPrevInputState] = useState<InputStateType>('none')

  // 状態変化を監視
  useEffect(() => {
    // 状態が変化していない場合は何もしない
    if (prevInputState === currentInputState) return

    const timestamp = Math.floor(currentTime)

    // 新しいJob状態を判定
    let newJobState: JobState

    switch (currentInputState) {
      case 'j-pressed':
        // J を入力している → 100 から 0 に向かっている
        newJobState = { type: '100-0', startedAt: timestamp }
        break
      case 'k-pressed':
        // K を入力している → 0 から 100 に向かっている
        newJobState = { type: '0-100', startedAt: timestamp }
        break
      case 'j-and-k-j-first':
        // J を先に押して K を追加 → 0 から 0 に向かっている
        newJobState = { type: '0-0', startedAt: timestamp }
        break
      case 'j-and-k-k-first':
        // K を先に押して J を追加 → 100 から 100 に向かっている
        newJobState = { type: '100-100', startedAt: timestamp }
        break
      case 'none':
      default:
        // 何も入力していない
        newJobState = { type: 'none' }
        break
    }

    // 状態が変化した場合はログ出力
    if (jobState.type !== newJobState.type) {
      console.log(`[Job State Changed] ${newJobState.type}`, {
        timestamp,
        inputState: currentInputState,
        newJobState,
      })
      setPrevJobStateType(jobState.type)
    }

    setJobState(newJobState)
    setPrevInputState(currentInputState)
  }, [currentInputState, currentTime, jobState.type, prevInputState])

  return { prev: prevJobStateType, ...jobState }
}
