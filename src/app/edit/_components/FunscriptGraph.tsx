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
  const { state, setSelected, addSelected, setRangeSelected, clearSelected } =
    useEditorContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [peaks, setPeaks] = useState<(number[] | Float32Array)[] | null>(null)
  const [duration, setDuration] = useState<number>(0)

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
      state.actions,
      state.lastSelectedIndex,
      state.currentTime,
      setSelected,
      addSelected,
      setRangeSelected,
      clearSelected,
    ],
  )

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
        onClick={handleClick}
        className="absolute inset-0 cursor-pointer"
        style={{
          background: 'transparent',
          zIndex: 10,
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
