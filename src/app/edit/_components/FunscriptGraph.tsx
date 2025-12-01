'use client'

import { useEditorContext } from '../_hooks/editor'
import { useRef, useEffect, useCallback } from 'react'
import { type JobStateType } from '../_hooks/realtimeEdit/useJobState'

export const FunscriptGraph = ({
  currentJobStateType,
}: {
  currentJobStateType: JobStateType
}) => {
  const { state, setSelected, addSelected, setRangeSelected, clearSelected } =
    useEditorContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // グラフを描画
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas サイズをコンテナに合わせる
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    // 背景をクリア
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // アクションがない場合は中央に基準線のみ描画
    if (state.actions.length === 0) {
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(0, canvas.height / 2)
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
      ctx.setLineDash([])
      return
    }

    // 時間範囲を計算（常に現在時刻を中央に配置）
    const minTime = state.currentTime - 10000
    const maxTime = state.currentTime + 10000

    // 座標変換関数
    const timeToX = (at: number) =>
      ((at - minTime) / (maxTime - minTime)) * canvas.width
    const posToY = (pos: number) => canvas.height - (pos / 100) * canvas.height

    // グリッド線を描画（背景）
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = (canvas.height / 10) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // 現在の再生位置を描画
    if (state.currentTime >= minTime && state.currentTime <= maxTime) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      const x = timeToX(state.currentTime)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    // 表示範囲内のアクションのみをフィルタ（線描画用に少し広めに取得）
    const visibleActions = state.actions
      .map((action, index) => ({ action, index }))
      .filter(
        ({ action }) =>
          action.at >= minTime - 1000 && action.at <= maxTime + 1000,
      )

    // 仮の点を追加（J/K キー押下中）
    let tempPoint: { at: number; pos: number } | null = null
    if (currentJobStateType !== 'none') {
      // Job状態に応じて pos を決定
      let pos = 0
      switch (currentJobStateType) {
        case '100-0': // J キー押下中
        case '0-0': // J先行の同時押し
          pos = 0
          break
        case '0-100': // K キー押下中
        case '100-100': // K先行の同時押し
          pos = 100
          break
      }
      tempPoint = { at: state.currentTime, pos }
    }

    // 仮の点を適切な位置に挿入
    const drawingActions = [...visibleActions]
    if (
      tempPoint &&
      tempPoint.at >= minTime - 1000 &&
      tempPoint.at <= maxTime + 1000
    ) {
      const insertIndex = drawingActions.findIndex(
        ({ action }) => action.at > tempPoint!.at,
      )
      if (insertIndex === -1) {
        drawingActions.push({ action: tempPoint, index: -1 })
      } else {
        drawingActions.splice(insertIndex, 0, { action: tempPoint, index: -1 })
      }
    }

    // アクション線を描画（表示範囲内のみ）
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.beginPath()
    let isFirstPoint = true
    drawingActions.forEach(({ action }) => {
      const x = timeToX(action.at)
      const y = posToY(action.pos)

      // 画面外の点でも線は繋ぐ
      if (isFirstPoint) {
        ctx.moveTo(x, y)
        isFirstPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // 画面内の実際のアクション点を描画
    visibleActions.forEach(({ action, index }) => {
      const x = timeToX(action.at)
      const y = posToY(action.pos)
      const isSelected = state.selectedIndices.includes(index)

      ctx.beginPath()
      ctx.arc(x, y, isSelected ? 8 : 5, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? '#ef4444' : '#6366f1'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // 仮の点を描画（J/K キー押下中）
    if (tempPoint && tempPoint.at >= minTime && tempPoint.at <= maxTime) {
      const x = timeToX(tempPoint.at)
      const y = posToY(tempPoint.pos)

      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = '#94a3b8' // グレー系の色で仮の点を表示
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [
    state.actions,
    state.selectedIndices,
    state.currentTime,
    currentJobStateType,
  ])

  // クリックで点を選択
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // 時間範囲を計算（常に現在時刻を中央に配置）
      const minTime = state.currentTime - 10000
      const maxTime = state.currentTime + 10000

      const timeToX = (at: number) =>
        ((at - minTime) / (maxTime - minTime)) * canvas.width
      const posToY = (pos: number) =>
        canvas.height - (pos / 100) * canvas.height

      // クリック位置に近い点を探す
      let closestIndex = -1
      let closestDistance = Infinity

      state.actions.forEach((action, index) => {
        const ax = timeToX(action.at)
        const ay = posToY(action.pos)
        const distance = Math.sqrt((x - ax) ** 2 + (y - ay) ** 2)

        if (distance < 15 && distance < closestDistance) {
          closestIndex = index
          closestDistance = distance
        }
      })

      if (closestIndex !== -1) {
        if (e.shiftKey && state.lastSelectedIndex !== null) {
          // Shift + クリック: 範囲選択
          setRangeSelected(state.lastSelectedIndex, closestIndex)
        } else if (e.altKey || e.metaKey) {
          // Alt/Option + クリック: 追加選択
          addSelected(closestIndex)
        } else {
          // 通常クリック: 単一選択
          setSelected([closestIndex])
        }
      } else {
        // 空白をクリックしたら選択解除
        clearSelected()
      }
    },
    [
      state.actions,
      state.currentTime,
      state.lastSelectedIndex,
      setSelected,
      addSelected,
      setRangeSelected,
      clearSelected,
    ],
  )

  return (
    <div ref={containerRef} className="w-full h-64 rounded-lg">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="cursor-pointer"
      />
    </div>
  )
}
