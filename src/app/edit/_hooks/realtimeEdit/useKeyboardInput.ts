import { useEffect, useCallback, useRef, useState } from 'react'

// キーボード入力の状態
type KeyInputState =
  | { type: 'none' }
  | { type: 'j-pressed'; jPressedAt: number }
  | { type: 'k-pressed'; kPressedAt: number }
  | {
      type: 'j-and-k'
      jPressedAt: number
      kPressedAt: number
      firstKey: 'j' | 'k'
    }

// 状態を表す文字列型
export type InputStateType =
  | 'none'
  | 'j-pressed'
  | 'k-pressed'
  | 'j-and-k-j-first'
  | 'j-and-k-k-first'

interface UseKeyboardInputOptions {
  isPlaying: boolean
}

// 内部状態を文字列型に変換
const toInputStateType = (state: KeyInputState): InputStateType => {
  if (state.type === 'none') return 'none'
  if (state.type === 'j-pressed') return 'j-pressed'
  if (state.type === 'k-pressed') return 'k-pressed'
  if (state.type === 'j-and-k') {
    return state.firstKey === 'j' ? 'j-and-k-j-first' : 'j-and-k-k-first'
  }
  return 'none'
}

export const useKeyboardInput = ({ isPlaying }: UseKeyboardInputOptions) => {
  const inputStateRef = useRef<KeyInputState>({ type: 'none' })
  const [inputStateType, setInputStateType] = useState<InputStateType>('none')

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isPlaying) return
      if (e.repeat) return // 長押しリピートを無視

      const key = e.key.toLowerCase()
      if (key !== 'j' && key !== 'k') return

      e.preventDefault()

      const inputState = inputStateRef.current

      if (key === 'j') {
        if (inputState.type === 'none') {
          // 何も入力していない状態 → J を入力している状態
          const newState: KeyInputState = { type: 'j-pressed', jPressedAt: 0 }
          inputStateRef.current = newState
          setInputStateType(toInputStateType(newState))
        } else if (inputState.type === 'k-pressed') {
          // K を入力している状態 → J を追加で入力した状態
          const newState: KeyInputState = {
            type: 'j-and-k',
            jPressedAt: 0,
            kPressedAt: inputState.kPressedAt,
            firstKey: 'k',
          }
          inputStateRef.current = newState
          setInputStateType(toInputStateType(newState))
        }
        // j-pressed または j-and-k の場合は何もしない
      } else if (key === 'k') {
        if (inputState.type === 'none') {
          // 何も入力していない状態 → K を入力している状態
          const newState: KeyInputState = { type: 'k-pressed', kPressedAt: 0 }
          inputStateRef.current = newState
          setInputStateType(toInputStateType(newState))
        } else if (inputState.type === 'j-pressed') {
          // J を入力している状態 → K を追加で入力した状態
          const newState: KeyInputState = {
            type: 'j-and-k',
            jPressedAt: inputState.jPressedAt,
            kPressedAt: 0,
            firstKey: 'j',
          }
          inputStateRef.current = newState
          setInputStateType(toInputStateType(newState))
        }
        // k-pressed または j-and-k の場合は何もしない
      }
    },
    [isPlaying],
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!isPlaying) return

      const key = e.key.toLowerCase()
      if (key !== 'j' && key !== 'k') return

      e.preventDefault()

      const inputState = inputStateRef.current

      if (key === 'j') {
        if (inputState.type === 'j-pressed') {
          // J を入力している状態 → J を離す（何も入力していない状態）
          const newState: KeyInputState = { type: 'none' }
          inputStateRef.current = newState
          setInputStateType(toInputStateType(newState))
        } else if (inputState.type === 'j-and-k') {
          // J を追加で入力した状態 → J を離す（K を入力している状態）
          const newState: KeyInputState = {
            type: 'k-pressed',
            kPressedAt: inputState.kPressedAt,
          }
          inputStateRef.current = newState
          setInputStateType(toInputStateType(newState))
        }
        // none または k-pressed の場合は何もしない
      } else if (key === 'k') {
        if (inputState.type === 'k-pressed') {
          // K を入力している状態 → K を離す（何も入力していない状態）
          const newState: KeyInputState = { type: 'none' }
          inputStateRef.current = newState
          setInputStateType(toInputStateType(newState))
        } else if (inputState.type === 'j-and-k') {
          // K を追加で入力した状態 → K を離す（J を入力している状態）
          const newState: KeyInputState = {
            type: 'j-pressed',
            jPressedAt: inputState.jPressedAt,
          }
          inputStateRef.current = newState
          setInputStateType(toInputStateType(newState))
        }
        // none または j-pressed の場合は何もしない
      }
    },
    [isPlaying],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return inputStateType
}
