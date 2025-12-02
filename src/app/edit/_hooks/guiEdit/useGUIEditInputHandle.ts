'use client'

import { useState, useCallback, useEffect, RefObject } from 'react'
import { FunscriptAction } from '@/lib/funscript'

const VIEWPORT_TIME_RANGE = 10 // 再生時刻の前後10秒を表示

interface UseGUIEditInputHandleParams {
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

type DragMode =
  | 'horizontal'
  | 'vertical'
  | 'scale'
  | 'range-move'
  | 'range-left'
  | 'range-right'
  | 'range-center-left'
  | 'range-center-right'
  | 'pos-scale-top'
  | 'pos-scale-bottom'
  | 'pos-scale-center-top'
  | 'pos-scale-center-bottom'
  | 'single-vertical'
  | 'single-horizontal'
  | null

export const useGUIEditInputHandle = ({
  canvasRef,
  actions,
  selectedIndices,
  lastSelectedIndex,
  currentTime,
  setSelected,
  addSelected,
  setRangeSelected,
  clearSelected,
  updateSelectedFromBase,
}: UseGUIEditInputHandleParams) => {
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragStartPos, setDragStartPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const [dragStartActions, setDragStartActions] = useState<FunscriptAction[]>(
    [],
  )
  const [dragStartIndices, setDragStartIndices] = useState<number[]>([])
  const [dragPivotTime, setDragPivotTime] = useState<number>(0)
  const [dragPivotPos, setDragPivotPos] = useState<number>(0)
  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false)
  const [hoverCursor, setHoverCursor] = useState<string>('default')

  // 座標変換関数
  const getCoordinateTransform = useCallback(
    (canvas: HTMLCanvasElement) => {
      const currentTimeSec = currentTime / 1000
      const startTimeSec = currentTimeSec - VIEWPORT_TIME_RANGE
      const endTimeSec = currentTimeSec + VIEWPORT_TIME_RANGE

      const timeToX = (at: number) => {
        const timeSec = at / 1000
        const relativeTime = timeSec - startTimeSec
        return (relativeTime / (endTimeSec - startTimeSec)) * canvas.width
      }
      const posToY = (pos: number) =>
        canvas.height - (pos / 100) * canvas.height

      return { timeToX, posToY, startTimeSec, endTimeSec }
    },
    [currentTime],
  )

  // 選択範囲の境界を計算
  const getSelectionBounds = useCallback(
    (canvas: HTMLCanvasElement) => {
      const selectedActions = selectedIndices
        .map((i) => actions[i])
        .filter((a) => a !== undefined)
        .sort((a, b) => a.at - b.at)

      if (selectedActions.length === 0) return null

      const { timeToX, posToY, startTimeSec, endTimeSec } =
        getCoordinateTransform(canvas)
      let minTime = selectedActions[0].at
      let maxTime = selectedActions[selectedActions.length - 1].at

      // 1つのポイント選択時は背景範囲を拡張
      if (selectedActions.length === 1) {
        const selectedIndex = selectedIndices[0]
        const selectedAction = selectedActions[0]
        const prevAction = selectedIndex > 0 ? actions[selectedIndex - 1] : null
        const nextAction =
          selectedIndex < actions.length - 1 ? actions[selectedIndex + 1] : null

        const startTimeMs = startTimeSec * 1000
        const endTimeMs = endTimeSec * 1000
        const viewDuration = endTimeMs - startTimeMs
        const pixelOffset = 16
        const timeOffset = (pixelOffset / canvas.width) * viewDuration

        if (prevAction && prevAction.at >= startTimeMs) {
          minTime = (prevAction.at + minTime) / 2
        } else {
          minTime = Math.max(startTimeMs, selectedAction.at - timeOffset)
        }

        if (nextAction && nextAction.at <= endTimeMs) {
          maxTime = (maxTime + nextAction.at) / 2
        } else {
          maxTime = Math.min(endTimeMs, selectedAction.at + timeOffset)
        }
      }

      const selectedPositions = selectedActions.map((a) => a.pos)
      const minPos = Math.min(...selectedPositions)
      const maxPos = Math.max(...selectedPositions)

      return {
        selectedActions,
        minTime,
        maxTime,
        minX: timeToX(minTime),
        maxX: timeToX(maxTime),
        minPos,
        maxPos,
        minY: posToY(maxPos),
        maxY: posToY(minPos),
      }
    },
    [actions, selectedIndices, getCoordinateTransform],
  )

  // クリックハンドラ
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (hasDragged) {
        setHasDragged(false)
        return
      }

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width
      const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height

      const { timeToX, posToY } = getCoordinateTransform(canvas)

      let closestIndex = -1
      let closestDistance = Infinity

      actions.forEach((action, index) => {
        const ax = timeToX(action.at)
        const ay = posToY(action.pos)
        const distance = Math.sqrt((clickX - ax) ** 2 + (clickY - ay) ** 2)

        if (distance < 15 && distance < closestDistance) {
          closestIndex = index
          closestDistance = distance
        }
      })

      if (closestIndex !== -1) {
        if (e.shiftKey && lastSelectedIndex !== null) {
          setRangeSelected(lastSelectedIndex, closestIndex)
        } else if (e.altKey || e.metaKey) {
          addSelected(closestIndex)
        } else {
          setSelected([closestIndex])
        }
      } else {
        clearSelected()
      }
    },
    [
      canvasRef,
      hasDragged,
      actions,
      lastSelectedIndex,
      getCoordinateTransform,
      setSelected,
      addSelected,
      setRangeSelected,
      clearSelected,
    ],
  )

  // マウスダウンハンドラ
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || selectedIndices.length === 0) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = ((e.clientX - rect.left) / rect.width) * canvas.width
      const canvasY = ((e.clientY - rect.top) / rect.height) * canvas.height

      const bounds = getSelectionBounds(canvas)
      if (!bounds) return

      const { selectedActions, minX, maxX, minY, maxY } = bounds
      const edgeThreshold = 10

      const nearLeftEdge = Math.abs(canvasX - minX) < edgeThreshold
      const nearRightEdge = Math.abs(canvasX - maxX) < edgeThreshold
      const inRangeX = canvasX >= minX && canvasX <= maxX

      let nearTopEdge: boolean
      let nearBottomEdge: boolean
      let inRangeY: boolean

      if (selectedActions.length === 1) {
        nearTopEdge = canvasY < edgeThreshold
        nearBottomEdge = canvasY > canvas.height - edgeThreshold
        inRangeY = true
      } else {
        nearTopEdge = Math.abs(canvasY - minY) < edgeThreshold
        nearBottomEdge = Math.abs(canvasY - maxY) < edgeThreshold
        inRangeY = canvasY >= minY && canvasY <= maxY
      }

      const { timeToX, posToY } = getCoordinateTransform(canvas)

      let nearPoint = false
      let nearHorizontal = false
      let nearVertical = false
      const threshold = 15

      for (const index of selectedIndices) {
        const action = actions[index]
        if (!action) continue

        const px = timeToX(action.at)
        const py = posToY(action.pos)
        const dx = Math.abs(canvasX - px)
        const dy = Math.abs(canvasY - py)

        if (dx < threshold && dy < threshold) {
          nearPoint = true
          if (dx < dy) {
            nearHorizontal = true
          } else {
            nearVertical = true
          }
          break
        }
      }

      let mode: DragMode = null

      if (selectedActions.length === 1) {
        if (nearTopEdge && inRangeX) {
          mode = e.altKey ? 'pos-scale-center-top' : 'pos-scale-top'
          setDragPivotPos(e.altKey ? 50 : 0)
        } else if (nearBottomEdge && inRangeX) {
          mode = e.altKey ? 'pos-scale-center-bottom' : 'pos-scale-bottom'
          setDragPivotPos(e.altKey ? 50 : 100)
        } else if (nearPoint || (inRangeX && inRangeY)) {
          const selectedAction = selectedActions[0]
          const py = posToY(selectedAction.pos)
          const yBandThreshold = 16

          if (Math.abs(canvasY - py) <= yBandThreshold) {
            mode = 'single-vertical'
          } else {
            mode = 'single-horizontal'
          }
        }
      } else {
        if (nearTopEdge && inRangeX) {
          mode = e.altKey ? 'pos-scale-center-top' : 'pos-scale-top'
          setDragPivotPos(e.altKey ? 50 : bounds.minPos)
        } else if (nearBottomEdge && inRangeX) {
          mode = e.altKey ? 'pos-scale-center-bottom' : 'pos-scale-bottom'
          setDragPivotPos(e.altKey ? 50 : bounds.maxPos)
        } else if (nearLeftEdge) {
          if (e.altKey) {
            mode = 'range-center-left'
            setDragPivotTime((bounds.minTime + bounds.maxTime) / 2)
          } else {
            mode = 'range-left'
            setDragPivotTime(bounds.maxTime)
          }
        } else if (nearRightEdge) {
          if (e.altKey) {
            mode = 'range-center-right'
            setDragPivotTime((bounds.minTime + bounds.maxTime) / 2)
          } else {
            mode = 'range-right'
            setDragPivotTime(bounds.minTime)
          }
        } else if (inRangeX && inRangeY && !nearPoint) {
          mode = 'range-move'
        } else if (nearPoint) {
          const sortedIndices = [...selectedIndices].sort((a, b) => a - b)
          let isContinuous = true
          for (let i = 0; i < sortedIndices.length - 1; i++) {
            if (sortedIndices[i + 1] !== sortedIndices[i] + 1) {
              isContinuous = false
              break
            }
          }

          if (e.shiftKey && isContinuous && sortedIndices.length > 1) {
            mode = 'scale'
          } else if (nearHorizontal) {
            mode = 'horizontal'
          } else {
            mode = 'vertical'
          }
        }
      }

      if (!mode) return

      e.preventDefault()
      setIsDragging(true)
      setDragStartPos({ x: canvasX, y: canvasY })
      setDragStartActions([...actions])
      setDragStartIndices([...selectedIndices])
      setDragMode(mode)
    },
    [
      canvasRef,
      actions,
      selectedIndices,
      getCoordinateTransform,
      getSelectionBounds,
    ],
  )

  // マウスムーブハンドラ
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = ((e.clientX - rect.left) / rect.width) * canvas.width
      const canvasY = ((e.clientY - rect.top) / rect.height) * canvas.height

      if (!isDragging) {
        // ホバーカーソルの判定
        if (selectedIndices.length === 0) {
          setHoverCursor('default')
          return
        }

        const bounds = getSelectionBounds(canvas)
        if (!bounds) {
          setHoverCursor('default')
          return
        }

        const { selectedActions, minX, maxX, minY, maxY } = bounds
        const edgeThreshold = 10

        const nearLeftEdge = Math.abs(canvasX - minX) < edgeThreshold
        const nearRightEdge = Math.abs(canvasX - maxX) < edgeThreshold
        const inRangeX = canvasX >= minX && canvasX <= maxX

        let nearTopEdge: boolean
        let nearBottomEdge: boolean
        let inRangeY: boolean

        if (selectedActions.length === 1) {
          nearTopEdge = canvasY < edgeThreshold
          nearBottomEdge = canvasY > canvas.height - edgeThreshold
          inRangeY = true
        } else {
          nearTopEdge = Math.abs(canvasY - minY) < edgeThreshold
          nearBottomEdge = Math.abs(canvasY - maxY) < edgeThreshold
          inRangeY = canvasY >= minY && canvasY <= maxY
        }

        const { timeToX, posToY } = getCoordinateTransform(canvas)

        let nearPoint = false
        const threshold = 15

        for (const index of selectedIndices) {
          const action = actions[index]
          if (!action) continue

          const px = timeToX(action.at)
          const py = posToY(action.pos)
          const dx = Math.abs(canvasX - px)
          const dy = Math.abs(canvasY - py)

          if (dx < threshold && dy < threshold) {
            nearPoint = true
            break
          }
        }

        if (nearTopEdge && inRangeX) {
          setHoverCursor('ns-resize')
        } else if (nearBottomEdge && inRangeX) {
          setHoverCursor('ns-resize')
        } else if (nearLeftEdge && selectedActions.length > 1) {
          setHoverCursor('col-resize')
        } else if (nearRightEdge && selectedActions.length > 1) {
          setHoverCursor('col-resize')
        } else if (inRangeX && inRangeY && selectedActions.length === 1) {
          const selectedAction = selectedActions[0]
          const py = posToY(selectedAction.pos)
          const yBandThreshold = 16

          if (Math.abs(canvasY - py) <= yBandThreshold) {
            setHoverCursor('ns-resize')
          } else {
            setHoverCursor('ew-resize')
          }
        } else if (inRangeX && inRangeY && !nearPoint) {
          setHoverCursor('move')
        } else if (nearPoint && selectedActions.length > 1) {
          setHoverCursor('pointer')
        } else {
          setHoverCursor('default')
        }
        return
      }

      if (!dragStartPos || !dragMode) return

      const dx = canvasX - dragStartPos.x
      const dy = canvasY - dragStartPos.y

      const dragThreshold = 3
      if (
        !hasDragged &&
        (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)
      ) {
        setHasDragged(true)
      }

      const currentTimeSec = currentTime / 1000
      const startTimeSec = currentTimeSec - VIEWPORT_TIME_RANGE
      const endTimeSec = currentTimeSec + VIEWPORT_TIME_RANGE
      const viewDuration = (endTimeSec - startTimeSec) * 1000

      switch (dragMode) {
        case 'horizontal': {
          const deltaTime = (dx / canvas.width) * viewDuration
          updateSelectedFromBase(
            dragStartIndices,
            dragStartActions,
            (action) => ({
              ...action,
              at: Math.max(0, action.at + deltaTime),
            }),
          )
          break
        }
        case 'vertical': {
          const deltaPos = -(dy / canvas.height) * 100
          updateSelectedFromBase(
            dragStartIndices,
            dragStartActions,
            (action) => ({
              ...action,
              pos: Math.max(0, Math.min(100, action.pos + deltaPos)),
            }),
          )
          break
        }
        case 'scale': {
          const factor = Math.max(0.1, 1 + dx / canvas.width)
          const selectedStartActions = dragStartIndices
            .map((i) => ({ index: i, action: dragStartActions[i] }))
            .filter((item) => item.action !== undefined)
            .sort((a, b) => a.action.at - b.action.at)

          if (selectedStartActions.length > 0) {
            const baseTime = selectedStartActions[0].action.at
            updateSelectedFromBase(
              dragStartIndices,
              dragStartActions,
              (action) => {
                const timeDiff = action.at - baseTime
                const newTime = baseTime + timeDiff * factor
                return { ...action, at: Math.max(0, newTime) }
              },
            )
          }
          break
        }
        case 'range-move': {
          const deltaTime = (dx / canvas.width) * viewDuration
          updateSelectedFromBase(
            dragStartIndices,
            dragStartActions,
            (action) => ({
              ...action,
              at: Math.max(0, action.at + deltaTime),
            }),
          )
          break
        }
        case 'range-left':
        case 'range-right':
        case 'range-center-left':
        case 'range-center-right': {
          if (dragStartActions.length > 0 && dragStartIndices.length > 0) {
            const selectedStartActions = dragStartIndices
              .map((i) => ({ index: i, action: dragStartActions[i] }))
              .filter((item) => item.action !== undefined)
              .sort((a, b) => a.action.at - b.action.at)

            if (selectedStartActions.length > 1) {
              const isCenterBased =
                isAltKeyPressed ||
                dragMode === 'range-center-left' ||
                dragMode === 'range-center-right'
              const isLeft =
                dragMode === 'range-left' || dragMode === 'range-center-left'

              let baseTime: number
              if (isCenterBased) {
                const minTime = selectedStartActions[0].action.at
                const maxTime =
                  selectedStartActions[selectedStartActions.length - 1].action
                    .at
                baseTime = (minTime + maxTime) / 2
              } else {
                baseTime = dragPivotTime
              }

              const movingTime = isLeft
                ? selectedStartActions[0].action.at
                : selectedStartActions[selectedStartActions.length - 1].action
                    .at

              const originalRange = Math.abs(movingTime - baseTime)
              const deltaTime = (dx / canvas.width) * viewDuration
              const newMovingTime = movingTime + deltaTime
              const newRange = Math.abs(newMovingTime - baseTime)

              const factor = originalRange > 0 ? newRange / originalRange : 1
              const clampedFactor = Math.max(0.1, factor)

              updateSelectedFromBase(
                dragStartIndices,
                dragStartActions,
                (action) => {
                  const timeDiff = action.at - baseTime
                  const newTime = baseTime + timeDiff * clampedFactor
                  return { ...action, at: Math.max(0, newTime) }
                },
              )
            }
          }
          break
        }
        case 'pos-scale-top':
        case 'pos-scale-bottom':
        case 'pos-scale-center-top':
        case 'pos-scale-center-bottom': {
          const isCenterBased =
            isAltKeyPressed ||
            dragMode === 'pos-scale-center-top' ||
            dragMode === 'pos-scale-center-bottom'

          const selectedStartActions = dragStartIndices
            .map((i) => dragStartActions[i])
            .filter((a) => a !== undefined)

          if (selectedStartActions.length > 0) {
            const deltaPos = -(dy / canvas.height) * 100
            const pivotPos = isCenterBased ? 50 : dragPivotPos

            if (selectedStartActions.length === 1) {
              const startPos = selectedStartActions[0].pos
              const originalRange = Math.abs(startPos - pivotPos)
              const newMovingPos = startPos + deltaPos
              const newRange = Math.abs(newMovingPos - pivotPos)

              const factor = originalRange > 0 ? newRange / originalRange : 1
              const clampedFactor = Math.max(0.1, factor)

              updateSelectedFromBase(
                dragStartIndices,
                dragStartActions,
                (action) => {
                  const posDiff = action.pos - pivotPos
                  const newPos = pivotPos + posDiff * clampedFactor
                  return { ...action, pos: Math.max(0, Math.min(100, newPos)) }
                },
              )
            } else {
              const startPositions = selectedStartActions.map((a) => a.pos)
              const startMinPos = Math.min(...startPositions)
              const startMaxPos = Math.max(...startPositions)

              const isTop =
                dragMode === 'pos-scale-top' ||
                dragMode === 'pos-scale-center-top'
              const movingPos = isTop ? startMaxPos : startMinPos
              const originalRange = Math.abs(movingPos - pivotPos)
              const newMovingPos = movingPos + deltaPos
              const newRange = Math.abs(newMovingPos - pivotPos)

              const factor = originalRange > 0 ? newRange / originalRange : 1
              const clampedFactor = Math.max(0.1, factor)

              updateSelectedFromBase(
                dragStartIndices,
                dragStartActions,
                (action) => {
                  const posDiff = action.pos - pivotPos
                  const newPos = pivotPos + posDiff * clampedFactor
                  return { ...action, pos: Math.max(0, Math.min(100, newPos)) }
                },
              )
            }
          }
          break
        }
        case 'single-vertical': {
          const deltaPos = -(dy / canvas.height) * 100
          updateSelectedFromBase(
            dragStartIndices,
            dragStartActions,
            (action) => ({
              ...action,
              pos: Math.max(0, Math.min(100, action.pos + deltaPos)),
            }),
          )
          break
        }
        case 'single-horizontal': {
          const deltaTime = (dx / canvas.width) * viewDuration
          updateSelectedFromBase(
            dragStartIndices,
            dragStartActions,
            (action) => ({
              ...action,
              at: Math.max(0, action.at + deltaTime),
            }),
          )
          break
        }
      }
    },
    [
      canvasRef,
      isDragging,
      hasDragged,
      dragStartPos,
      dragMode,
      dragPivotTime,
      dragPivotPos,
      isAltKeyPressed,
      dragStartActions,
      dragStartIndices,
      currentTime,
      selectedIndices,
      actions,
      getCoordinateTransform,
      getSelectionBounds,
      updateSelectedFromBase,
    ],
  )

  // マウスアップハンドラ
  const onMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDragMode(null)
      setDragStartPos(null)
      setHasDragged(false)
      setDragStartActions([])
      setDragStartIndices([])
      setDragPivotTime(0)
      setDragPivotPos(0)
      setIsAltKeyPressed(false)
    }
  }, [isDragging])

  // グローバルマウスアップイベント
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', onMouseUp)
      return () => {
        window.removeEventListener('mouseup', onMouseUp)
      }
    }
  }, [isDragging, onMouseUp])

  // ドラッグ中のAltキー状態を監視
  useEffect(() => {
    if (isDragging) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Alt') {
          setIsAltKeyPressed(true)
        }
      }
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Alt') {
          setIsAltKeyPressed(false)
        }
      }
      setIsAltKeyPressed(false)

      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
      }
    } else {
      setIsAltKeyPressed(false)
    }
  }, [isDragging])

  return {
    onClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    isDragging,
    dragMode,
    hoverCursor,
  }
}
