'use client'

import { useEditorContext } from '../_hooks/editor'
import { useRef, useEffect, useCallback, useState } from 'react'
import { type JobStateType } from '../_hooks/realtimeEdit/useJobState'
import WaveSurfer from 'wavesurfer.js'

const VIEWPORT_TIME_RANGE = 10 // 再生時刻の前後10秒を表示

export const FunscriptGraph = ({
  currentJobStateType,
}: {
  currentJobStateType: JobStateType
}) => {
  const {
    state,
    setSelected,
    addSelected,
    setRangeSelected,
    clearSelected,
    moveSelected,
    moveSelectedTime,
    scaleSelectedTime,
    scaleSelectedTimeFromPivot,
    updateSelectedFromBase,
  } = useEditorContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [peaks, setPeaks] = useState<(number[] | Float32Array)[] | null>(null)
  const [duration, setDuration] = useState<number>(0)

  // ドラッグ状態の管理
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const [dragMode, setDragMode] = useState<
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
  >(null)
  const [dragStartPos, setDragStartPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const [dragStartActions, setDragStartActions] = useState<
    typeof state.actions
  >([])
  const [dragStartIndices, setDragStartIndices] = useState<number[]>([])
  const [dragPivotTime, setDragPivotTime] = useState<number>(0)
  const [dragPivotPos, setDragPivotPos] = useState<number>(0)
  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false)

  // ホバー状態の管理
  const [hoverCursor, setHoverCursor] = useState<string>('default')

  // メディアファイルからピークデータを抽出
  useEffect(() => {
    if (state.file) {
      const url = URL.createObjectURL(state.file)
      const ws = WaveSurfer.create({
        container: document.createElement('div'),
        url: url,
      })

      ws.on('ready', () => {
        const exportedPeaks = ws.exportPeaks()
        setPeaks(exportedPeaks)
        setDuration(ws.getDuration())
        ws.destroy()
        URL.revokeObjectURL(url)
      })

      return () => {
        ws.destroy()
        URL.revokeObjectURL(url)
      }
    } else {
      setPeaks(null)
      setDuration(0)
    }
  }, [state.file])

  // 波形を描画（再生時刻の前後10秒）
  useEffect(() => {
    const canvas = waveformCanvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !peaks || duration === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const containerWidth = container.clientWidth
    const currentTimeSec = state.currentTime / 1000

    // Canvas サイズを設定
    if (canvas.width !== containerWidth || canvas.height !== 256) {
      canvas.width = containerWidth
      canvas.height = 256
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // 描画範囲：再生時刻の前後10秒（必ず20秒幅）
    const startTimeSec = currentTimeSec - VIEWPORT_TIME_RANGE
    const endTimeSec = currentTimeSec + VIEWPORT_TIME_RANGE
    const viewDuration = VIEWPORT_TIME_RANGE * 2 // 常に20秒

    const { width, height } = canvas

    // ステレオ（2チャンネル）として描画
    const channelCount = Math.min(peaks.length, 2)
    const channelData = peaks.slice(0, channelCount)

    // モノラルの場合は同じデータを2回使用
    if (channelData.length === 1) {
      channelData.push(channelData[0])
    }

    // 上チャンネル（上半分）
    const topChannel = channelData[0]
    const topHalfHeight = height / 2

    // 下チャンネル（下半分）
    const bottomChannel = channelData[1]
    const bottomHalfHeight = height / 2
    const bottomY = height / 2

    // サンプルレートを計算
    const sampleRate = topChannel.length / duration

    // 正規化: チャンネルごとの最大値を求める
    let topMaxValue = 0
    let bottomMaxValue = 0
    for (let i = 0; i < topChannel.length; i++) {
      const topAbs = Math.abs(topChannel[i])
      const bottomAbs = Math.abs(bottomChannel[i])
      if (topAbs > topMaxValue) topMaxValue = topAbs
      if (bottomAbs > bottomMaxValue) bottomMaxValue = bottomAbs
    }

    // 最大値が0の場合は1にして除算エラーを回避
    if (topMaxValue === 0) topMaxValue = 1
    if (bottomMaxValue === 0) bottomMaxValue = 1

    // 各ピクセル列ごとに棒グラフを描画
    for (let i = 0; i < width; i++) {
      // 現在のピクセル位置に対応する時刻を計算
      const pixelTimeSec = startTimeSec + (i / width) * viewDuration

      // マイナスの時刻や範囲外の時刻はスキップ
      if (pixelTimeSec < 0 || pixelTimeSec > duration) {
        continue
      }

      const sampleIndex = Math.floor(pixelTimeSec * sampleRate)

      if (sampleIndex >= 0 && sampleIndex < topChannel.length) {
        // 進行状況に応じて色を変更
        const isPlayed = pixelTimeSec <= currentTimeSec
        ctx.fillStyle = isPlayed
          ? 'rgba(59, 130, 246, 0.5)'
          : 'rgba(148, 163, 184, 0.5)'

        // 上チャンネルの棒グラフ（中央から上に伸びる）- 正規化適用
        const topValue = Math.abs(topChannel[sampleIndex]) / topMaxValue
        const topBarHeight = topValue * topHalfHeight
        ctx.fillRect(i, topHalfHeight - topBarHeight, 1, topBarHeight)

        // 下チャンネルの棒グラフ（中央から下に伸びる）- 正規化適用
        const bottomValue =
          Math.abs(bottomChannel[sampleIndex]) / bottomMaxValue
        const bottomBarHeight = bottomValue * bottomHalfHeight
        ctx.fillRect(i, bottomY, 1, bottomBarHeight)
      }
    }
  }, [peaks, duration, state.currentTime])

  // グラフを描画（再生時刻の前後10秒）

  // グラフを描画（再生時刻の前後10秒）
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const containerWidth = container.clientWidth
    const currentTimeSec = state.currentTime / 1000

    // Canvas サイズを設定
    if (canvas.width !== containerWidth || canvas.height !== 256) {
      canvas.width = containerWidth
      canvas.height = 256
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // 描画範囲：再生時刻の前後10秒（必ず20秒差）
    const startTimeSec = currentTimeSec - VIEWPORT_TIME_RANGE
    const endTimeSec = currentTimeSec + VIEWPORT_TIME_RANGE

    // 座標変換関数（再生時刻を中心にした相対座標）
    const timeToX = (at: number) => {
      const timeSec = at / 1000
      const relativeTime = timeSec - startTimeSec
      return (relativeTime / (endTimeSec - startTimeSec)) * canvas.width
    }
    const posToY = (pos: number) => canvas.height - (pos / 100) * canvas.height

    // グリッド線を描画
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 1

    // 縦方向のグリッド線（1秒ごと）
    const gridInterval = 1
    const startGrid = Math.ceil(startTimeSec)
    const endGrid = Math.floor(endTimeSec)

    for (let i = startGrid; i <= endGrid; i += gridInterval) {
      // マイナスの時刻のグリッドはスキップ
      if (i < 0) continue

      const x = timeToX(i * 1000)
      if (x >= 0 && x <= canvas.width) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
    }

    // 横方向のグリッド線
    for (let i = 0; i <= 10; i++) {
      const y = (canvas.height / 10) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // アクションがない場合は基準線を追加
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

    // 仮の点を追加（J/K キー押下中）
    let tempPoint: { at: number; pos: number } | null = null
    if (currentJobStateType !== 'none') {
      let pos = 0
      switch (currentJobStateType) {
        case '100-0':
        case '0-0':
          pos = 0
          break
        case '0-100':
        case '100-100':
          pos = 100
          break
      }
      tempPoint = { at: state.currentTime, pos }
    }

    // 表示範囲内のアクションのみをフィルタリング
    const startTimeMs = startTimeSec * 1000
    const endTimeMs = endTimeSec * 1000
    const visibleActions = state.actions.filter(
      (action) => action.at >= startTimeMs && action.at <= endTimeMs,
    )

    // 描画用のアクション配列を作成
    const drawingActions = visibleActions.map((action) => ({
      action,
      index: state.actions.indexOf(action),
    }))

    if (tempPoint && tempPoint.at >= startTimeMs && tempPoint.at <= endTimeMs) {
      const insertIndex = drawingActions.findIndex(
        ({ action }) => action.at > tempPoint!.at,
      )
      if (insertIndex === -1) {
        drawingActions.push({ action: tempPoint, index: -1 })
      } else {
        drawingActions.splice(insertIndex, 0, { action: tempPoint, index: -1 })
      }
    }

    // アクション線を描画
    if (drawingActions.length > 0) {
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.beginPath()
      let isFirstPoint = true
      drawingActions.forEach(({ action }) => {
        const x = timeToX(action.at)
        const y = posToY(action.pos)

        if (isFirstPoint) {
          ctx.moveTo(x, y)
          isFirstPoint = false
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()
    }

    // 選択範囲の背景を描画
    if (state.selectedIndices.length > 0) {
      const selectedActions = state.selectedIndices
        .map((i) => state.actions[i])
        .filter((a) => a !== undefined)
        .sort((a, b) => a.at - b.at)

      if (selectedActions.length > 0) {
        let minTime = selectedActions[0].at
        let maxTime = selectedActions[selectedActions.length - 1].at

        // 1つのポイントのみ選択されている場合、隣のポイントとの中間まで背景を拡張
        if (selectedActions.length === 1) {
          const selectedIndex = state.selectedIndices[0]
          const selectedAction = selectedActions[0]
          const prevAction =
            selectedIndex > 0 ? state.actions[selectedIndex - 1] : null
          const nextAction =
            selectedIndex < state.actions.length - 1
              ? state.actions[selectedIndex + 1]
              : null

          // 左側の境界
          if (prevAction && prevAction.at >= startTimeMs) {
            // 隣接点が描画範囲内にある場合は中間点
            minTime = (prevAction.at + minTime) / 2
          } else {
            // 隣接点が描画範囲外または存在しない場合は16px離れた位置
            const pixelOffset = 16
            const timeOffset =
              (pixelOffset / canvas.width) * (endTimeMs - startTimeMs)
            minTime = Math.max(startTimeMs, selectedAction.at - timeOffset)
          }

          // 右側の境界
          if (nextAction && nextAction.at <= endTimeMs) {
            // 隣接点が描画範囲内にある場合は中間点
            maxTime = (maxTime + nextAction.at) / 2
          } else {
            // 隣接点が描画範囲外または存在しない場合は16px離れた位置
            const pixelOffset = 16
            const timeOffset =
              (pixelOffset / canvas.width) * (endTimeMs - startTimeMs)
            maxTime = Math.min(endTimeMs, selectedAction.at + timeOffset)
          }
        }

        const minX = timeToX(minTime)
        const maxX = timeToX(maxTime)

        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)'
        ctx.fillRect(minX, 0, maxX - minX, canvas.height)
      }
    }

    // アクション点を描画
    visibleActions.forEach((action) => {
      const index = state.actions.indexOf(action)
      const x = timeToX(action.at)
      const y = posToY(action.pos)
      const isSelected = state.selectedIndices.includes(index)

      if (x >= -10 && x <= canvas.width + 10) {
        ctx.beginPath()
        ctx.arc(x, y, isSelected ? 8 : 5, 0, 2 * Math.PI)
        ctx.fillStyle = isSelected ? '#ef4444' : '#6366f1'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    // 仮の点を描画
    if (tempPoint && tempPoint.at >= startTimeMs && tempPoint.at <= endTimeMs) {
      const x = timeToX(tempPoint.at)
      const y = posToY(tempPoint.pos)

      if (x >= -10 && x <= canvas.width + 10) {
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fillStyle = '#94a3b8'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  }, [
    state.actions,
    state.selectedIndices,
    currentJobStateType,
    state.currentTime,
  ])

  // クリックで点を選択
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // ドラッグ操作の後は選択を変更しない
      if (hasDragged) {
        setHasDragged(false)
        return
      }

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      // Canvas座標に変換
      const canvasX = (clickX / rect.width) * canvas.width
      const canvasY = (clickY / rect.height) * canvas.height

      // 再生時刻を基準にした時刻範囲を計算
      const currentTimeSec = state.currentTime / 1000
      const startTimeSec = currentTimeSec - VIEWPORT_TIME_RANGE
      const endTimeSec = currentTimeSec + VIEWPORT_TIME_RANGE

      // クリック位置を時刻に変換
      const clickTimeSec =
        startTimeSec + (canvasX / canvas.width) * (endTimeSec - startTimeSec)
      const clickTimeMs = clickTimeSec * 1000

      // 座標変換関数
      const timeToX = (at: number) => {
        const timeSec = at / 1000
        const relativeTime = timeSec - startTimeSec
        return (relativeTime / (endTimeSec - startTimeSec)) * canvas.width
      }
      const posToY = (pos: number) =>
        canvas.height - (pos / 100) * canvas.height

      // クリック位置に近い点を探す
      let closestIndex = -1
      let closestDistance = Infinity

      state.actions.forEach((action, index) => {
        const ax = timeToX(action.at)
        const ay = posToY(action.pos)
        const distance = Math.sqrt((canvasX - ax) ** 2 + (canvasY - ay) ** 2)

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
      hasDragged,
      state.actions,
      state.lastSelectedIndex,
      state.currentTime,
      setSelected,
      addSelected,
      setRangeSelected,
      clearSelected,
    ],
  )

  // マウスダウン時にドラッグ開始を判定
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || state.selectedIndices.length === 0) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Canvas座標に変換
      const canvasX = (mouseX / rect.width) * canvas.width
      const canvasY = (mouseY / rect.height) * canvas.height

      // 再生時刻を基準にした時刻範囲を計算
      const currentTimeSec = state.currentTime / 1000
      const startTimeSec = currentTimeSec - VIEWPORT_TIME_RANGE
      const endTimeSec = currentTimeSec + VIEWPORT_TIME_RANGE

      // 座標変換関数
      const timeToX = (at: number) => {
        const timeSec = at / 1000
        const relativeTime = timeSec - startTimeSec
        return (relativeTime / (endTimeSec - startTimeSec)) * canvas.width
      }
      const posToY = (pos: number) =>
        canvas.height - (pos / 100) * canvas.height

      // 選択範囲の情報を計算
      const selectedActions = state.selectedIndices
        .map((i) => state.actions[i])
        .filter((a) => a !== undefined)
        .sort((a, b) => a.at - b.at)

      if (selectedActions.length === 0) return

      let minTime = selectedActions[0].at
      let maxTime = selectedActions[selectedActions.length - 1].at

      // 1つのポイントのみ選択されている場合、背景範囲を拡張（描画時と同じロジック）
      if (selectedActions.length === 1) {
        const selectedIndex = state.selectedIndices[0]
        const selectedAction = selectedActions[0]
        const prevAction =
          selectedIndex > 0 ? state.actions[selectedIndex - 1] : null
        const nextAction =
          selectedIndex < state.actions.length - 1
            ? state.actions[selectedIndex + 1]
            : null

        // 左側の境界
        if (prevAction && prevAction.at >= startTimeSec * 1000) {
          // 隣接点が描画範囲内にある場合は中間点
          minTime = (prevAction.at + minTime) / 2
        } else {
          // 隣接点が描画範囲外または存在しない場合は16px離れた位置
          const pixelOffset = 16
          const viewDuration = (endTimeSec - startTimeSec) * 1000
          const timeOffset = (pixelOffset / canvas.width) * viewDuration
          minTime = Math.max(
            startTimeSec * 1000,
            selectedAction.at - timeOffset,
          )
        }

        // 右側の境界
        if (nextAction && nextAction.at <= endTimeSec * 1000) {
          // 隣接点が描画範囲内にある場合は中間点
          maxTime = (maxTime + nextAction.at) / 2
        } else {
          // 隣接点が描画範囲外または存在しない場合は16px離れた位置
          const pixelOffset = 16
          const viewDuration = (endTimeSec - startTimeSec) * 1000
          const timeOffset = (pixelOffset / canvas.width) * viewDuration
          maxTime = Math.min(endTimeSec * 1000, selectedAction.at + timeOffset)
        }
      }

      const minX = timeToX(minTime)
      const maxX = timeToX(maxTime)
      const edgeThreshold = 10

      // 選択されたポイントのpos範囲を計算
      const selectedPositions = selectedActions.map((a) => a.pos)
      const minPos = Math.min(...selectedPositions)
      const maxPos = Math.max(...selectedPositions)
      const minY = posToY(maxPos) // Y座標は反転
      const maxY = posToY(minPos)

      // 選択範囲の端に近いかチェック
      const nearLeftEdge = Math.abs(canvasX - minX) < edgeThreshold
      const nearRightEdge = Math.abs(canvasX - maxX) < edgeThreshold

      // 1つのポイント選択時は背景範囲内での上下端を判定、複数選択時は選択範囲の上下端を判定
      let nearTopEdge: boolean
      let nearBottomEdge: boolean
      let inRangeY: boolean

      if (selectedActions.length === 1) {
        // 1つのポイント選択時: 背景範囲内（inRangeX）かつcanvas全体の上下端
        nearTopEdge = canvasY < edgeThreshold
        nearBottomEdge = canvasY > canvas.height - edgeThreshold
        inRangeY = true // 背景は全体に広がっているので常にtrue
      } else {
        // 複数選択時: 選択範囲の上下端
        nearTopEdge = Math.abs(canvasY - minY) < edgeThreshold
        nearBottomEdge = Math.abs(canvasY - maxY) < edgeThreshold
        inRangeY = canvasY >= minY && canvasY <= maxY
      }

      const inRangeX = canvasX >= minX && canvasX <= maxX

      // 選択されたポイントに近いかチェック
      let nearPoint = false
      let nearHorizontal = false
      let nearVertical = false
      const threshold = 15

      for (const index of state.selectedIndices) {
        const action = state.actions[index]
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

      // ドラッグモードの判定
      let mode: typeof dragMode = null

      // 単一ポイント選択時の特別な処理
      if (selectedActions.length === 1) {
        // 上下の端（canvas上下端）でのposスケール
        if (nearTopEdge && inRangeX) {
          if (e.altKey) {
            mode = 'pos-scale-center-top'
            setDragPivotPos(50)
          } else {
            mode = 'pos-scale-top'
            setDragPivotPos(0)
          }
        } else if (nearBottomEdge && inRangeX) {
          if (e.altKey) {
            mode = 'pos-scale-center-bottom'
            setDragPivotPos(50)
          } else {
            mode = 'pos-scale-bottom'
            setDragPivotPos(100)
          }
        } else if (nearPoint || (inRangeX && inRangeY)) {
          // 点の近くまたは背景内の操作
          const selectedAction = selectedActions[0]
          const py = posToY(selectedAction.pos)
          const yBandThreshold = 16

          if (Math.abs(canvasY - py) <= yBandThreshold) {
            // Y軸16px以内の帯: pos移動
            mode = 'single-vertical'
          } else {
            // その他の背景部分: at移動
            mode = 'single-horizontal'
          }
        }
      } else {
        // 複数選択時の処理
        // 上下の端のドラッグ: posスケール
        if (nearTopEdge && inRangeX) {
          if (e.altKey) {
            mode = 'pos-scale-center-top'
            setDragPivotPos(50)
          } else {
            mode = 'pos-scale-top'
            setDragPivotPos(minPos)
          }
        } else if (nearBottomEdge && inRangeX) {
          if (e.altKey) {
            mode = 'pos-scale-center-bottom'
            setDragPivotPos(50)
          } else {
            mode = 'pos-scale-bottom'
            setDragPivotPos(maxPos)
          }
        } else if (nearLeftEdge) {
          // 左端のドラッグ: 右端または中心を起点に伸縮
          if (e.altKey) {
            mode = 'range-center-left'
            const centerTime = (minTime + maxTime) / 2
            setDragPivotTime(centerTime)
          } else {
            mode = 'range-left'
            setDragPivotTime(maxTime)
          }
        } else if (nearRightEdge) {
          // 右端のドラッグ: 左端または中心を起点に伸縮
          if (e.altKey) {
            mode = 'range-center-right'
            const centerTime = (minTime + maxTime) / 2
            setDragPivotTime(centerTime)
          } else {
            mode = 'range-right'
            setDragPivotTime(minTime)
          }
        } else if (inRangeX && inRangeY && !nearPoint) {
          // 選択範囲の背景部分: 移動
          mode = 'range-move'
        } else if (nearPoint) {
          // ポイントに近い: 複数選択時のドラッグ
          // 選択されたアクションが連続しているかチェック（スケールモード用）
          const sortedIndices = [...state.selectedIndices].sort((a, b) => a - b)
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

      // ドラッグ開始
      e.preventDefault()
      setIsDragging(true)
      setDragStartPos({ x: canvasX, y: canvasY })
      setDragStartActions([...state.actions])
      setDragStartIndices([...state.selectedIndices])
      setDragMode(mode)
    },
    [state.actions, state.selectedIndices, state.currentTime],
  )

  // マウスムーブ時にドラッグ処理
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // ドラッグ中でない場合はホバー判定のみ
      if (!isDragging) {
        // ホバー判定のロジックをここに展開
        const canvas = canvasRef.current
        if (!canvas || state.selectedIndices.length === 0) {
          setHoverCursor('default')
          return
        }

        const rect = canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Canvas座標に変換
        const canvasX = (mouseX / rect.width) * canvas.width
        const canvasY = (mouseY / rect.height) * canvas.height

        // 再生時刻を基準にした時刻範囲を計算
        const currentTimeSec = state.currentTime / 1000
        const startTimeSec = currentTimeSec - VIEWPORT_TIME_RANGE
        const endTimeSec = currentTimeSec + VIEWPORT_TIME_RANGE

        // 座標変換関数
        const timeToX = (at: number) => {
          const timeSec = at / 1000
          const relativeTime = timeSec - startTimeSec
          return (relativeTime / (endTimeSec - startTimeSec)) * canvas.width
        }
        const posToY = (pos: number) =>
          canvas.height - (pos / 100) * canvas.height

        // 選択範囲の情報を計算
        const selectedActions = state.selectedIndices
          .map((i) => state.actions[i])
          .filter((a) => a !== undefined)
          .sort((a, b) => a.at - b.at)

        if (selectedActions.length === 0) {
          setHoverCursor('default')
          return
        }

        let minTime = selectedActions[0].at
        let maxTime = selectedActions[selectedActions.length - 1].at

        // 1つのポイントのみ選択されている場合、背景範囲を拡張（ドラッグ判定時と同じロジック）
        if (selectedActions.length === 1) {
          const selectedIndex = state.selectedIndices[0]
          const selectedAction = selectedActions[0]
          const prevAction =
            selectedIndex > 0 ? state.actions[selectedIndex - 1] : null
          const nextAction =
            selectedIndex < state.actions.length - 1
              ? state.actions[selectedIndex + 1]
              : null

          const startTimeMs = startTimeSec * 1000
          const endTimeMs = endTimeSec * 1000
          const viewDuration = endTimeMs - startTimeMs

          // 左側の境界
          if (prevAction && prevAction.at >= startTimeMs) {
            minTime = (prevAction.at + minTime) / 2
          } else {
            const pixelOffset = 16
            const timeOffset = (pixelOffset / canvas.width) * viewDuration
            minTime = Math.max(startTimeMs, selectedAction.at - timeOffset)
          }

          // 右側の境界
          if (nextAction && nextAction.at <= endTimeMs) {
            maxTime = (maxTime + nextAction.at) / 2
          } else {
            const pixelOffset = 16
            const timeOffset = (pixelOffset / canvas.width) * viewDuration
            maxTime = Math.min(endTimeMs, selectedAction.at + timeOffset)
          }
        }

        const minX = timeToX(minTime)
        const maxX = timeToX(maxTime)
        const edgeThreshold = 10

        // 選択されたポイントのpos範囲を計算
        const selectedPositions = selectedActions.map((a) => a.pos)
        const minPos = Math.min(...selectedPositions)
        const maxPos = Math.max(...selectedPositions)
        const minY = posToY(maxPos) // Y座標は反転
        const maxY = posToY(minPos)

        // 選択範囲の端に近いかチェック
        const nearLeftEdge = Math.abs(canvasX - minX) < edgeThreshold
        const nearRightEdge = Math.abs(canvasX - maxX) < edgeThreshold

        // 1つのポイント選択時は背景範囲内での上下端を判定、複数選択時は選択範囲の上下端を判定
        let nearTopEdge: boolean
        let nearBottomEdge: boolean
        let inRangeY: boolean

        if (selectedActions.length === 1) {
          // 1つのポイント選択時: 背景範囲内かつcanvas全体の上下端
          nearTopEdge = canvasY < edgeThreshold
          nearBottomEdge = canvasY > canvas.height - edgeThreshold
          inRangeY = true
        } else {
          // 複数選択時: 選択範囲の上下端
          nearTopEdge = Math.abs(canvasY - minY) < edgeThreshold
          nearBottomEdge = Math.abs(canvasY - maxY) < edgeThreshold
          inRangeY = canvasY >= minY && canvasY <= maxY
        }

        const inRangeX = canvasX >= minX && canvasX <= maxX

        // ポイントに近いかチェック
        let nearPoint = false
        const threshold = 15

        for (const index of state.selectedIndices) {
          const action = state.actions[index]
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

        // カーソルの種類を決定
        if (nearTopEdge && inRangeX) {
          setHoverCursor('ns-resize')
        } else if (nearBottomEdge && inRangeX) {
          setHoverCursor('ns-resize')
        } else if (nearLeftEdge && selectedActions.length > 1) {
          setHoverCursor('col-resize')
        } else if (nearRightEdge && selectedActions.length > 1) {
          setHoverCursor('col-resize')
        } else if (inRangeX && inRangeY && selectedActions.length === 1) {
          // 1つのポイント選択時のホバー判定（nearPointに関係なく背景操作）
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

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Canvas座標に変換
      const canvasX = (mouseX / rect.width) * canvas.width
      const canvasY = (mouseY / rect.height) * canvas.height

      const dx = canvasX - dragStartPos.x
      const dy = canvasY - dragStartPos.y

      // ドラッグが開始されたことを記録（移動閾値を超えたら）
      const dragThreshold = 3
      if (
        !hasDragged &&
        (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)
      ) {
        setHasDragged(true)
      }

      // 再生時刻を基準にした時刻範囲を計算
      const currentTimeSec = state.currentTime / 1000
      const startTimeSec = currentTimeSec - VIEWPORT_TIME_RANGE
      const endTimeSec = currentTimeSec + VIEWPORT_TIME_RANGE
      const viewDuration = (endTimeSec - startTimeSec) * 1000

      if (dragMode === 'horizontal') {
        // 左右（時間軸）の移動 - 開始時の状態から計算
        const deltaTime = (dx / canvas.width) * viewDuration
        updateSelectedFromBase(
          dragStartIndices,
          dragStartActions,
          (action) => ({
            ...action,
            at: Math.max(0, action.at + deltaTime),
          }),
        )
      } else if (dragMode === 'vertical') {
        // 上下（pos）の移動 - 開始時の状態から計算
        const deltaPos = -(dy / canvas.height) * 100
        updateSelectedFromBase(
          dragStartIndices,
          dragStartActions,
          (action) => ({
            ...action,
            pos: Math.max(0, Math.min(100, action.pos + deltaPos)),
          }),
        )
      } else if (dragMode === 'scale') {
        // 時間軸の伸縮 - 開始時の状態から計算
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
              return {
                ...action,
                at: Math.max(0, newTime),
              }
            },
          )
        }
      } else if (dragMode === 'range-move') {
        // 選択範囲全体を移動 - 開始時の状態から計算
        const deltaTime = (dx / canvas.width) * viewDuration
        updateSelectedFromBase(
          dragStartIndices,
          dragStartActions,
          (action) => ({
            ...action,
            at: Math.max(0, action.at + deltaTime),
          }),
        )
      } else if (
        dragMode === 'range-left' ||
        dragMode === 'range-right' ||
        dragMode === 'range-center-left' ||
        dragMode === 'range-center-right'
      ) {
        // 選択範囲の端を伸縮 - 開始時の状態から計算
        if (dragStartActions.length > 0 && dragStartIndices.length > 0) {
          const selectedStartActions = dragStartIndices
            .map((i) => ({ index: i, action: dragStartActions[i] }))
            .filter((item) => item.action !== undefined)
            .sort((a, b) => a.action.at - b.action.at)

          if (selectedStartActions.length > 1) {
            // ドラッグ中のAltキー状態を考慮
            const isCenterBased =
              isAltKeyPressed ||
              dragMode === 'range-center-left' ||
              dragMode === 'range-center-right'
            const isLeft =
              dragMode === 'range-left' || dragMode === 'range-center-left'

            // 基点を決定
            let baseTime: number
            if (isCenterBased) {
              const minTime = selectedStartActions[0].action.at
              const maxTime =
                selectedStartActions[selectedStartActions.length - 1].action.at
              baseTime = (minTime + maxTime) / 2
            } else {
              baseTime = dragPivotTime
            }

            const movingTime = isLeft
              ? selectedStartActions[0].action.at
              : selectedStartActions[selectedStartActions.length - 1].action.at

            const originalRange = Math.abs(movingTime - baseTime)
            const deltaTime = (dx / canvas.width) * viewDuration
            const newMovingTime = movingTime + deltaTime
            const newRange = Math.abs(newMovingTime - baseTime)

            // スケール係数を計算（最小値を設定して縮小しすぎないように）
            const factor = originalRange > 0 ? newRange / originalRange : 1
            const clampedFactor = Math.max(0.1, factor)

            updateSelectedFromBase(
              dragStartIndices,
              dragStartActions,
              (action) => {
                const timeDiff = action.at - baseTime
                const newTime = baseTime + timeDiff * clampedFactor
                return {
                  ...action,
                  at: Math.max(0, newTime),
                }
              },
            )
          }
        }
      } else if (
        dragMode === 'pos-scale-top' ||
        dragMode === 'pos-scale-bottom' ||
        dragMode === 'pos-scale-center-top' ||
        dragMode === 'pos-scale-center-bottom'
      ) {
        // pos のスケール
        // ドラッグ中のAltキー状態を考慮
        const isCenterBased =
          isAltKeyPressed ||
          dragMode === 'pos-scale-center-top' ||
          dragMode === 'pos-scale-center-bottom'
        const isTop =
          dragMode === 'pos-scale-top' || dragMode === 'pos-scale-center-top'

        // 開始時の選択範囲のpos情報を取得
        const selectedStartActions = dragStartIndices
          .map((i) => dragStartActions[i])
          .filter((a) => a !== undefined)

        if (selectedStartActions.length > 0) {
          // 1つのポイント選択時はスケール処理（0または100を基点に）
          if (selectedStartActions.length === 1) {
            const deltaPos = -(dy / canvas.height) * 100
            const pivotPos = isCenterBased ? 50 : dragPivotPos
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
                return {
                  ...action,
                  pos: Math.max(0, Math.min(100, newPos)),
                }
              },
            )
          } else {
            // 複数選択時はスケール処理
            const startPositions = selectedStartActions.map((a) => a.pos)
            const startMinPos = Math.min(...startPositions)
            const startMaxPos = Math.max(...startPositions)

            // ドラッグ量からスケール係数を計算
            const deltaPos = -(dy / canvas.height) * 100
            const pivotPos = isCenterBased ? 50 : dragPivotPos

            // 移動している端の元の位置
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
                return {
                  ...action,
                  pos: Math.max(0, Math.min(100, newPos)),
                }
              },
            )
          }
        }
      } else if (dragMode === 'single-vertical') {
        // 1つのポイント選択時のpos移動
        const deltaPos = -(dy / canvas.height) * 100
        updateSelectedFromBase(
          dragStartIndices,
          dragStartActions,
          (action) => ({
            ...action,
            pos: Math.max(0, Math.min(100, action.pos + deltaPos)),
          }),
        )
      } else if (dragMode === 'single-horizontal') {
        // 1つのポイント選択時のat移動
        const deltaTime = (dx / canvas.width) * viewDuration
        updateSelectedFromBase(
          dragStartIndices,
          dragStartActions,
          (action) => ({
            ...action,
            at: Math.max(0, action.at + deltaTime),
          }),
        )
      }
    },
    [
      isDragging,
      hasDragged,
      dragStartPos,
      dragMode,
      dragPivotTime,
      dragPivotPos,
      isAltKeyPressed,
      dragStartActions,
      dragStartIndices,
      state.currentTime,
      state.selectedIndices,
      state.actions,
      updateSelectedFromBase,
    ],
  )

  // マウスアップ時にドラッグ終了
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDragMode(null)
      setDragStartPos(null)
      setDragStartActions([])
      setDragStartIndices([])
      setDragPivotTime(0)
      setDragPivotPos(0)
      setIsAltKeyPressed(false) // Altキー状態もリセット
      // hasDraggedはhandleClickでリセットされるのでここではリセットしない
    }
  }, [isDragging])

  // グローバルマウスアップイベント
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        handleMouseUp()
      }
      window.addEventListener('mouseup', handleGlobalMouseUp)
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, handleMouseUp])

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
      // ドラッグ開始時の状態をリセット
      setIsAltKeyPressed(false)

      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
      }
    } else {
      // ドラッグ終了時もリセット
      setIsAltKeyPressed(false)
    }
  }, [isDragging])

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-lg relative bg-white overflow-hidden"
    >
      {/* 波形表示用のCanvas */}
      <canvas
        ref={waveformCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
        }}
      />

      {/* グラフ描画用のCanvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className="absolute inset-0"
        style={{
          background: 'transparent',
          zIndex: 10,
          cursor: isDragging
            ? dragMode === 'horizontal' || dragMode === 'single-horizontal'
              ? 'ew-resize'
              : dragMode === 'vertical' || dragMode === 'single-vertical'
                ? 'ns-resize'
                : dragMode === 'range-move'
                  ? 'move'
                  : dragMode === 'range-left' ||
                      dragMode === 'range-right' ||
                      dragMode === 'range-center-left' ||
                      dragMode === 'range-center-right'
                    ? 'col-resize'
                    : dragMode === 'pos-scale-top' ||
                        dragMode === 'pos-scale-bottom' ||
                        dragMode === 'pos-scale-center-top' ||
                        dragMode === 'pos-scale-center-bottom'
                      ? 'ns-resize'
                      : 'move'
            : hoverCursor,
        }}
      />

      {/* 現在位置インジケーター（コンテナ中央に固定） */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-20"
        style={{ left: '50%', transform: 'translateX(-50%)' }}
      />
    </div>
  )
}
