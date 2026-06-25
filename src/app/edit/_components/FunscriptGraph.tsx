'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { type JobStateType } from '../_hooks/realtimeEdit/useJobState'
import { useEdit } from '../_hooks/edit'
import WaveSurfer from 'wavesurfer.js'
import { calculateSpeed, isSpeedInRange } from '@/lib/funscript'

const VIEWPORT_TIME_RANGE_DEFAULT = 10
const VIEWPORT_TIME_RANGE_MIN = 2
const VIEWPORT_TIME_RANGE_MAX = 60
const VIEWPORT_ZOOM_FACTOR = 1.15
const SPECTROGRAM_TIME_SLICES = 384
const SPECTROGRAM_WINDOW_SIZE = 2048
const SPECTROGRAM_FFT_SIZE = 4096
const SPECTROGRAM_HOP_SIZE = 512
const SPECTROGRAM_TOP_DB = -5
const SPECTROGRAM_DYNAMIC_RANGE_DB = 80
const SPECTROGRAM_BLACK_FLOOR = 0.1
const SPECTROGRAM_MIN_FREQ_HZ = 40

export type EditGraphDisplayMode = 'waveform' | 'spectrum'
export type SpectrogramChannelMode =
  | 'stereo-average'
  | 'stereo-max'
  | 'left'
  | 'center'
  | 'right'

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const yToFrequency = (
  y: number,
  height: number,
  minHz: number,
  maxHz: number,
) => {
  const ratio = 1 - y / Math.max(1, height)
  return minHz * Math.pow(maxHz / minHz, ratio)
}

const mapIntensity = (value: number) => {
  if (value <= SPECTROGRAM_BLACK_FLOOR) {
    return 0
  }
  return (value - SPECTROGRAM_BLACK_FLOOR) / (1 - SPECTROGRAM_BLACK_FLOOR)
}

const computeFftPowerSpectrum = (
  channel: number[] | Float32Array,
  centerIndex: number,
  windowSize: number,
  fftSize: number,
  hannWindow: Float32Array,
  targetBins: Float32Array,
  scratchReal: Float32Array,
  scratchImag: Float32Array,
  scratchWindowed: Float32Array,
) => {
  const halfWindow = Math.floor(windowSize / 2)
  for (let i = 0; i < windowSize; i++) {
    const sourceIndex = centerIndex - halfWindow + i
    let sample = 0
    if (sourceIndex >= 0 && sourceIndex < channel.length) {
      sample = channel[sourceIndex]
    }
    scratchWindowed[i] = sample * hannWindow[i]
  }

  scratchReal.fill(0)
  scratchReal.set(scratchWindowed)
  scratchImag.fill(0)

  // In-place radix-2 Cooley-Tukey FFT
  let j = 0
  for (let i = 1; i < fftSize; i++) {
    let bit = fftSize >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit
    if (i < j) {
      const tempReal = scratchReal[i]
      scratchReal[i] = scratchReal[j]
      scratchReal[j] = tempReal
      const tempImag = scratchImag[i]
      scratchImag[i] = scratchImag[j]
      scratchImag[j] = tempImag
    }
  }

  for (let len = 2; len <= fftSize; len <<= 1) {
    const angle = (-2 * Math.PI) / len
    const wLenReal = Math.cos(angle)
    const wLenImag = Math.sin(angle)

    for (let i = 0; i < fftSize; i += len) {
      let wReal = 1
      let wImag = 0

      for (let k = 0; k < len / 2; k++) {
        const uReal = scratchReal[i + k]
        const uImag = scratchImag[i + k]
        const vReal =
          scratchReal[i + k + len / 2] * wReal -
          scratchImag[i + k + len / 2] * wImag
        const vImag =
          scratchReal[i + k + len / 2] * wImag +
          scratchImag[i + k + len / 2] * wReal

        scratchReal[i + k] = uReal + vReal
        scratchImag[i + k] = uImag + vImag
        scratchReal[i + k + len / 2] = uReal - vReal
        scratchImag[i + k + len / 2] = uImag - vImag

        const nextWReal = wReal * wLenReal - wImag * wLenImag
        const nextWImag = wReal * wLenImag + wImag * wLenReal
        wReal = nextWReal
        wImag = nextWImag
      }
    }
  }

  const coherentGain = 0.5
  const nyquistBin = Math.floor(fftSize / 2)
  const baseScale = 1 / (windowSize * coherentGain)
  for (let bin = 0; bin <= nyquistBin; bin++) {
    let magnitude =
      Math.hypot(scratchReal[bin], scratchImag[bin]) * baseScale * 2
    if (bin === 0 || bin === nyquistBin) {
      magnitude *= 0.5
    }
    targetBins[bin] = magnitude * magnitude
  }
}

const computeStereoAveragePowerSpectrum = (
  leftChannel: number[] | Float32Array,
  rightChannel: number[] | Float32Array,
  centerIndex: number,
  windowSize: number,
  fftSize: number,
  hannWindow: Float32Array,
  targetBins: Float32Array,
  scratchReal: Float32Array,
  scratchImag: Float32Array,
  scratchWindowed: Float32Array,
  tempLeftBins: Float32Array,
  tempRightBins: Float32Array,
) => {
  computeFftPowerSpectrum(
    leftChannel,
    centerIndex,
    windowSize,
    fftSize,
    hannWindow,
    tempLeftBins,
    scratchReal,
    scratchImag,
    scratchWindowed,
  )
  computeFftPowerSpectrum(
    rightChannel,
    centerIndex,
    windowSize,
    fftSize,
    hannWindow,
    tempRightBins,
    scratchReal,
    scratchImag,
    scratchWindowed,
  )

  for (let i = 0; i < targetBins.length; i++) {
    targetBins[i] = (tempLeftBins[i] + tempRightBins[i]) * 0.5
  }
}

const computeStereoMaxPowerSpectrum = (
  leftChannel: number[] | Float32Array,
  rightChannel: number[] | Float32Array,
  centerIndex: number,
  windowSize: number,
  fftSize: number,
  hannWindow: Float32Array,
  targetBins: Float32Array,
  scratchReal: Float32Array,
  scratchImag: Float32Array,
  scratchWindowed: Float32Array,
  tempLeftBins: Float32Array,
  tempRightBins: Float32Array,
) => {
  computeFftPowerSpectrum(
    leftChannel,
    centerIndex,
    windowSize,
    fftSize,
    hannWindow,
    tempLeftBins,
    scratchReal,
    scratchImag,
    scratchWindowed,
  )
  computeFftPowerSpectrum(
    rightChannel,
    centerIndex,
    windowSize,
    fftSize,
    hannWindow,
    tempRightBins,
    scratchReal,
    scratchImag,
    scratchWindowed,
  )

  for (let i = 0; i < targetBins.length; i++) {
    targetBins[i] = Math.max(tempLeftBins[i], tempRightBins[i])
  }
}

// Module-level color LUT: 4096 pre-computed RGB entries for fast per-pixel lookup.
// Replaces per-pixel string construction + canvas fillStyle assignment.
const SPECTROGRAM_COLOR_LUT = (() => {
  const stops = [
    { at: 0, rgb: [0, 0, 0] },
    { at: 0.1, rgb: [0, 0, 0] },
    { at: 0.22, rgb: [20, 0, 50] },
    { at: 0.4, rgb: [70, 10, 130] },
    { at: 0.58, rgb: [190, 20, 130] },
    { at: 0.75, rgb: [245, 80, 50] },
    { at: 0.9, rgb: [255, 190, 40] },
    { at: 1, rgb: [255, 255, 210] },
  ] as const
  const LUT_SIZE = 4096
  const lut = new Uint8Array(LUT_SIZE * 3)
  for (let i = 0; i < LUT_SIZE; i++) {
    const value = i / (LUT_SIZE - 1)
    const upperIndex = stops.findIndex((stop) => value <= stop.at)
    let r: number, g: number, b: number
    if (upperIndex <= 0) {
      ;[r, g, b] = stops[0].rgb
    } else {
      const lower = stops[upperIndex - 1]
      const upper = stops[upperIndex]
      const ratio = (value - lower.at) / (upper.at - lower.at)
      r = Math.round(lower.rgb[0] + (upper.rgb[0] - lower.rgb[0]) * ratio)
      g = Math.round(lower.rgb[1] + (upper.rgb[1] - lower.rgb[1]) * ratio)
      b = Math.round(lower.rgb[2] + (upper.rgb[2] - lower.rgb[2]) * ratio)
    }
    lut[i * 3] = r!
    lut[i * 3 + 1] = g!
    lut[i * 3 + 2] = b!
  }
  return lut
})()

export const FunscriptGraph = ({
  currentJobStateType,
  displayMode,
  spectrogramChannelMode,
}: {
  currentJobStateType: JobStateType
  displayMode: EditGraphDisplayMode
  spectrogramChannelMode: SpectrogramChannelMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [viewportTimeRange, setViewportTimeRange] = useState(
    VIEWPORT_TIME_RANGE_DEFAULT,
  )

  const edit = useEdit({
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
    viewportTimeRange,
  })

  const [peaks, setPeaks] = useState<(number[] | Float32Array)[] | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [decodedAudioData, setDecodedAudioData] = useState<{
    sampleRate: number
    leftData: Float32Array
    rightData: Float32Array
    centerData: Float32Array
  } | null>(null)
  const lastSpectrogramStateRef = useRef<{
    startTimeSec: number
    width: number
    height: number
    columnCount: number
    columnPixelWidth: number
    channelMode: SpectrogramChannelMode
    viewportTimeRange: number
  } | null>(null)
  const spectrogramColumnRemainderRef = useRef(0)
  const spectrogramShiftBufferRef = useRef<HTMLCanvasElement | null>(null)
  // Scratch buffers for FFT computation — allocated once per sample-rate, reused across renders.
  const spectrogramScratchRef = useRef<{
    sampleRate: number
    hannWindow: Float32Array
    rowBinStart: Uint16Array
    rowBinEnd: Uint16Array
    scratchWindowed: Float32Array
    scratchReal: Float32Array
    scratchImag: Float32Array
    fftPowers: Float32Array
    leftFftPowers: Float32Array
    rightFftPowers: Float32Array
    rowAggregatedPowers: Float32Array
  } | null>(null)
  // Reused ImageData buffer for spectrogram column rendering (one putImageData per column).
  const columnImageDataRef = useRef<ImageData | null>(null)
  // Reused ImageData buffer for waveform rendering (one putImageData per frame).
  const waveformImageDataRef = useRef<ImageData | null>(null)
  // Debounced viewport range for the expensive spectrogram full-redraw (FFT computation).
  // The graph overlay uses viewportTimeRange directly for immediate visual feedback.
  const [spectrogramViewportTimeRange, setSpectrogramViewportTimeRange] =
    useState(VIEWPORT_TIME_RANGE_DEFAULT)
  const zoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canEqualize = useMemo(() => {
    const indices = [...edit.selectedIndices].sort((a, b) => a - b)
    if (indices.length < 2) return false

    const continuous = indices.every(
      (index, i) => i === 0 || index === indices[i - 1] + 1,
    )

    const withinBounds =
      indices[0] >= 0 &&
      indices[indices.length - 1] < edit.effectiveActions.length

    return continuous && withinBounds
  }, [edit.selectedIndices, edit.effectiveActions.length])

  const canSimplifyAlternating = canEqualize

  const handleEqualize = useCallback(() => {
    if (!canEqualize) return
    edit.equalizeSelectedRange()
  }, [canEqualize, edit])

  const handleSimplifyAlternating = useCallback(() => {
    if (!canSimplifyAlternating) return
    edit.simplifyAlternatingSelectedRange()
  }, [canSimplifyAlternating, edit])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const direction = e.deltaY > 0 ? 1 : -1
      setViewportTimeRange((prev) => {
        const next = clamp(
          prev * Math.pow(VIEWPORT_ZOOM_FACTOR, direction),
          VIEWPORT_TIME_RANGE_MIN,
          VIEWPORT_TIME_RANGE_MAX,
        )
        // Debounce the heavy FFT recompute; graph overlay updates immediately via viewportTimeRange.
        if (zoomDebounceRef.current !== null) clearTimeout(zoomDebounceRef.current)
        zoomDebounceRef.current = setTimeout(() => {
          setSpectrogramViewportTimeRange(next)
          zoomDebounceRef.current = null
        }, 150)
        return next
      })
    },
    [],
  )

  // Clean up debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (zoomDebounceRef.current !== null) clearTimeout(zoomDebounceRef.current)
    }
  }, [])

  // メディアファイルからピークデータを抽出
  useEffect(() => {
    let isCancelled = false

    if (edit.file) {
      setDecodedAudioData(null)
      lastSpectrogramStateRef.current = null
      spectrogramColumnRemainderRef.current = 0
      const sourceFile = edit.file
      const url = URL.createObjectURL(edit.file)
      const ws = WaveSurfer.create({
        container: document.createElement('div'),
        url: url,
      })

      ws.on('ready', () => {
        if (isCancelled) return
        const exportedPeaks = ws.exportPeaks()
        setPeaks(exportedPeaks)
        setDuration(ws.getDuration())
        ws.destroy()
        URL.revokeObjectURL(url)
      })

      void (async () => {
        const audioContext = new AudioContext()
        try {
          const arrayBuffer = await sourceFile.arrayBuffer()
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          if (isCancelled) return

          const leftChannel = audioBuffer.getChannelData(0)
          const rightChannel =
            audioBuffer.numberOfChannels > 1
              ? audioBuffer.getChannelData(1)
              : leftChannel
          const leftData = new Float32Array(leftChannel.length)
          leftData.set(leftChannel)
          const rightData = new Float32Array(rightChannel.length)
          rightData.set(rightChannel)
          const centerData = new Float32Array(audioBuffer.length)
          for (let i = 0; i < centerData.length; i++) {
            centerData[i] = (leftData[i] + rightData[i]) / 2
          }

          setDecodedAudioData({
            sampleRate: audioBuffer.sampleRate,
            leftData,
            rightData,
            centerData,
          })
        } catch (error) {
          console.error('Failed to decode audio for spectrogram', error)
          setDecodedAudioData(null)
        } finally {
          await audioContext.close()
        }
      })()

      return () => {
        isCancelled = true
        ws.destroy()
        URL.revokeObjectURL(url)
      }
    } else {
      setPeaks(null)
      setDuration(0)
      setDecodedAudioData(null)
      lastSpectrogramStateRef.current = null
      spectrogramColumnRemainderRef.current = 0
    }
  }, [edit.file])

  // 波形背景を描画 — ImageData で一括書き込みし Canvas API 呼び出しを最小化
  useEffect(() => {
    if (displayMode !== 'waveform') return

    const canvas = waveformCanvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !peaks || duration === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const containerWidth = container.clientWidth
    const currentTimeSec = edit.currentTime / 1000

    if (canvas.width !== containerWidth || canvas.height !== 256) {
      canvas.width = containerWidth
      canvas.height = 256
    }

    const startTimeSec = currentTimeSec - viewportTimeRange
    const viewDuration = viewportTimeRange * 2
    const { width, height } = canvas

    const channelCount = Math.min(peaks.length, 2)
    const channelData = peaks.slice(0, channelCount)
    if (channelData.length === 1) channelData.push(channelData[0])

    const topChannel = channelData[0]
    const bottomChannel = channelData[1]
    const topHalfHeight = height / 2
    const bottomHalfHeight = height / 2
    const bottomY = height / 2
    const sampleRate = topChannel.length / duration

    let topMaxValue = 0
    let bottomMaxValue = 0
    for (let i = 0; i < topChannel.length; i++) {
      const topAbs = Math.abs(topChannel[i])
      const bottomAbs = Math.abs(bottomChannel[i])
      if (topAbs > topMaxValue) topMaxValue = topAbs
      if (bottomAbs > bottomMaxValue) bottomMaxValue = bottomAbs
    }
    if (topMaxValue === 0) topMaxValue = 1
    if (bottomMaxValue === 0) bottomMaxValue = 1

    // Reuse ImageData buffer to avoid per-frame allocation
    if (
      !waveformImageDataRef.current ||
      waveformImageDataRef.current.width !== width ||
      waveformImageDataRef.current.height !== height
    ) {
      waveformImageDataRef.current = new ImageData(width, height)
    }
    const imageData = waveformImageDataRef.current
    // Clear to transparent (all zeros = rgba(0,0,0,0)); white bg shows through from CSS.
    imageData.data.fill(0)
    const data = imageData.data

    for (let i = 0; i < width; i++) {
      const pixelTimeSec = startTimeSec + (i / width) * viewDuration
      if (pixelTimeSec < 0 || pixelTimeSec > duration) continue

      const sampleIndex = Math.floor(pixelTimeSec * sampleRate)
      if (sampleIndex < 0 || sampleIndex >= topChannel.length) continue

      const isPlayed = pixelTimeSec <= currentTimeSec
      // rgba(59, 130, 246, 0.5) for played, rgba(148, 163, 184, 0.5) for unplayed
      const r = isPlayed ? 59 : 148
      const g = isPlayed ? 130 : 163
      const b = isPlayed ? 246 : 184
      const a = 128 // 0.5 opacity

      const topValue = Math.abs(topChannel[sampleIndex]) / topMaxValue
      const topBarHeight = Math.floor(topValue * topHalfHeight)
      const topStart = Math.floor(topHalfHeight - topBarHeight)

      const bottomValue = Math.abs(bottomChannel[sampleIndex]) / bottomMaxValue
      const bottomBarHeight = Math.floor(bottomValue * bottomHalfHeight)
      const bottomEnd = Math.floor(bottomY + bottomBarHeight)

      for (let y = topStart; y < Math.floor(topHalfHeight); y++) {
        const idx = (y * width + i) * 4
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        data[idx + 3] = a
      }
      for (let y = Math.floor(bottomY); y < bottomEnd; y++) {
        const idx = (y * width + i) * 4
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        data[idx + 3] = a
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [displayMode, duration, edit.currentTime, peaks, viewportTimeRange])

  // スペクトラム背景を描画 — バッファ再利用・ImageData 一括書き込みで高速化
  // spectrogramViewportTimeRange を使用し、ズーム操作中は旧スケールを維持（デバウンス後に更新）
  useEffect(() => {
    if (displayMode !== 'spectrum') return
    if (!decodedAudioData || duration === 0) return

    const canvas = waveformCanvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const containerWidth = container.clientWidth
    const width = containerWidth
    const height = 256
    const currentTimeSec = edit.currentTime / 1000
    const startTimeSec = currentTimeSec - spectrogramViewportTimeRange

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const viewDuration = spectrogramViewportTimeRange * 2
    const leftChannel = decodedAudioData.leftData
    const rightChannel = decodedAudioData.rightData
    const centerChannel = decodedAudioData.centerData
    const sampleRate = decodedAudioData.sampleRate
    const audioDurationSec = centerChannel.length / sampleRate

    const preferredColumnCount = Math.min(SPECTROGRAM_TIME_SLICES, width)
    const columnPixelWidth = Math.max(
      1,
      Math.floor(width / Math.max(1, preferredColumnCount)),
    )
    const columnCount = Math.max(1, Math.floor(width / columnPixelWidth))
    const spectrogramWidth = columnCount * columnPixelWidth
    const rowCount = height
    const nyquistBin = Math.floor(SPECTROGRAM_FFT_SIZE / 2)

    // Initialize scratch buffers once per sample rate; reuse across renders to avoid GC pressure.
    if (
      !spectrogramScratchRef.current ||
      spectrogramScratchRef.current.sampleRate !== sampleRate
    ) {
      const hannWindow = new Float32Array(SPECTROGRAM_WINDOW_SIZE)
      for (let i = 0; i < SPECTROGRAM_WINDOW_SIZE; i++) {
        hannWindow[i] =
          0.5 *
          (1 - Math.cos((2 * Math.PI * i) / (SPECTROGRAM_WINDOW_SIZE - 1)))
      }
      const nyquistHz = sampleRate / 2
      const minFreqHz = SPECTROGRAM_MIN_FREQ_HZ
      const maxFreqHz = Math.min(16000, nyquistHz)
      const rowBinStart = new Uint16Array(rowCount)
      const rowBinEnd = new Uint16Array(rowCount)
      for (let row = 0; row < rowCount; row++) {
        const freqTop = yToFrequency(row, rowCount, minFreqHz, maxFreqHz)
        const freqBottom = yToFrequency(row + 1, rowCount, minFreqHz, maxFreqHz)
        const start = Math.floor((freqBottom * SPECTROGRAM_FFT_SIZE) / sampleRate)
        const end = Math.ceil((freqTop * SPECTROGRAM_FFT_SIZE) / sampleRate)
        rowBinStart[row] = clamp(start, 0, nyquistBin)
        rowBinEnd[row] = clamp(end, 0, nyquistBin)
      }
      spectrogramScratchRef.current = {
        sampleRate,
        hannWindow,
        rowBinStart,
        rowBinEnd,
        scratchWindowed: new Float32Array(SPECTROGRAM_WINDOW_SIZE),
        scratchReal: new Float32Array(SPECTROGRAM_FFT_SIZE),
        scratchImag: new Float32Array(SPECTROGRAM_FFT_SIZE),
        fftPowers: new Float32Array(nyquistBin + 1),
        leftFftPowers: new Float32Array(nyquistBin + 1),
        rightFftPowers: new Float32Array(nyquistBin + 1),
        rowAggregatedPowers: new Float32Array(rowCount),
      }
    }
    const {
      hannWindow,
      rowBinStart,
      rowBinEnd,
      scratchWindowed,
      scratchReal,
      scratchImag,
      fftPowers,
      leftFftPowers,
      rightFftPowers,
      rowAggregatedPowers,
    } = spectrogramScratchRef.current

    // Reuse per-column ImageData buffer; one putImageData call per column replaces 256 fillRect calls.
    if (
      !columnImageDataRef.current ||
      columnImageDataRef.current.width !== columnPixelWidth ||
      columnImageDataRef.current.height !== height
    ) {
      columnImageDataRef.current = new ImageData(columnPixelWidth, height)
    }
    const columnImageData = columnImageDataRef.current

    const floorDb = SPECTROGRAM_TOP_DB - SPECTROGRAM_DYNAMIC_RANGE_DB
    const maxFrameIndex = Math.ceil(
      (audioDurationSec * sampleRate) / SPECTROGRAM_HOP_SIZE,
    )

    const drawSpectrogramColumn = (
      column: number,
      baseStartTimeSec: number,
    ) => {
      const timeSec = baseStartTimeSec + (column / columnCount) * viewDuration
      const nextTimeSec =
        baseStartTimeSec + ((column + 1) / columnCount) * viewDuration
      const x = column * columnPixelWidth

      if (nextTimeSec < 0 || timeSec > audioDurationSec) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(x, 0, columnPixelWidth, height)
        return
      }

      rowAggregatedPowers.fill(0)

      const frameStart = clamp(
        Math.floor((timeSec * sampleRate) / SPECTROGRAM_HOP_SIZE),
        0,
        maxFrameIndex,
      )
      const frameEnd = clamp(
        Math.floor((nextTimeSec * sampleRate) / SPECTROGRAM_HOP_SIZE),
        0,
        maxFrameIndex,
      )

      for (
        let frame = frameStart;
        frame <= Math.max(frameStart, frameEnd);
        frame++
      ) {
        const centerIndex = frame * SPECTROGRAM_HOP_SIZE
        if (spectrogramChannelMode === 'stereo-average') {
          computeStereoAveragePowerSpectrum(
            leftChannel,
            rightChannel,
            centerIndex,
            SPECTROGRAM_WINDOW_SIZE,
            SPECTROGRAM_FFT_SIZE,
            hannWindow,
            fftPowers,
            scratchReal,
            scratchImag,
            scratchWindowed,
            leftFftPowers,
            rightFftPowers,
          )
        } else if (spectrogramChannelMode === 'stereo-max') {
          computeStereoMaxPowerSpectrum(
            leftChannel,
            rightChannel,
            centerIndex,
            SPECTROGRAM_WINDOW_SIZE,
            SPECTROGRAM_FFT_SIZE,
            hannWindow,
            fftPowers,
            scratchReal,
            scratchImag,
            scratchWindowed,
            leftFftPowers,
            rightFftPowers,
          )
        } else if (spectrogramChannelMode === 'left') {
          computeFftPowerSpectrum(
            leftChannel,
            centerIndex,
            SPECTROGRAM_WINDOW_SIZE,
            SPECTROGRAM_FFT_SIZE,
            hannWindow,
            fftPowers,
            scratchReal,
            scratchImag,
            scratchWindowed,
          )
        } else if (spectrogramChannelMode === 'right') {
          computeFftPowerSpectrum(
            rightChannel,
            centerIndex,
            SPECTROGRAM_WINDOW_SIZE,
            SPECTROGRAM_FFT_SIZE,
            hannWindow,
            fftPowers,
            scratchReal,
            scratchImag,
            scratchWindowed,
          )
        } else {
          computeFftPowerSpectrum(
            centerChannel,
            centerIndex,
            SPECTROGRAM_WINDOW_SIZE,
            SPECTROGRAM_FFT_SIZE,
            hannWindow,
            fftPowers,
            scratchReal,
            scratchImag,
            scratchWindowed,
          )
        }

        for (let row = 0; row < rowCount; row++) {
          const startBin = rowBinStart[row]
          const endBin = rowBinEnd[row]
          let sum = 0
          let count = 0
          for (let bin = startBin; bin <= endBin; bin++) {
            sum += fftPowers[bin]
            count++
          }
          const avgPower = sum / Math.max(1, count)
          if (avgPower > rowAggregatedPowers[row]) {
            rowAggregatedPowers[row] = avgPower
          }
        }
      }

      // Write pixels via ImageData: 1 putImageData call vs. 256 fillStyle+fillRect calls.
      const imgData = columnImageData.data
      for (let row = 0; row < rowCount; row++) {
        const pixelDb =
          10 * Math.log10(Math.max(rowAggregatedPowers[row], 1e-20))
        const normalized = clamp(
          (pixelDb - floorDb) / SPECTROGRAM_DYNAMIC_RANGE_DB,
          0,
          1,
        )
        const lutIdx = Math.min(4095, Math.floor(mapIntensity(normalized) * 4095)) * 3
        const r = SPECTROGRAM_COLOR_LUT[lutIdx]
        const g = SPECTROGRAM_COLOR_LUT[lutIdx + 1]
        const b = SPECTROGRAM_COLOR_LUT[lutIdx + 2]
        const rowBase = row * columnPixelWidth * 4
        for (let px = 0; px < columnPixelWidth; px++) {
          const dataIdx = rowBase + px * 4
          imgData[dataIdx] = r
          imgData[dataIdx + 1] = g
          imgData[dataIdx + 2] = b
          imgData[dataIdx + 3] = 255
        }
      }
      ctx.putImageData(columnImageData, x, 0)
    }

    const lastState = lastSpectrogramStateRef.current
    const canScrollReuse =
      lastState &&
      lastState.width === width &&
      lastState.height === height &&
      lastState.columnCount === columnCount &&
      lastState.columnPixelWidth === columnPixelWidth &&
      lastState.channelMode === spectrogramChannelMode &&
      lastState.viewportTimeRange === spectrogramViewportTimeRange

    if (!canScrollReuse) {
      ctx.clearRect(0, 0, width, height)
      for (let column = 0; column < columnCount; column++) {
        drawSpectrogramColumn(column, startTimeSec)
      }
      if (spectrogramWidth < width) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(spectrogramWidth, 0, width - spectrogramWidth, height)
      }
      spectrogramColumnRemainderRef.current = 0
    } else {
      const deltaSec = startTimeSec - lastState.startTimeSec
      const deltaColumnsFloat =
        (deltaSec / viewDuration) * columnCount +
        spectrogramColumnRemainderRef.current
      const shiftColumns =
        deltaColumnsFloat >= 0
          ? Math.floor(deltaColumnsFloat)
          : Math.ceil(deltaColumnsFloat)
      spectrogramColumnRemainderRef.current = deltaColumnsFloat - shiftColumns

      if (shiftColumns !== 0) {
        if (Math.abs(shiftColumns) >= columnCount) {
          ctx.clearRect(0, 0, width, height)
          for (let column = 0; column < columnCount; column++) {
            drawSpectrogramColumn(column, startTimeSec)
          }
          if (spectrogramWidth < width) {
            ctx.fillStyle = '#000000'
            ctx.fillRect(spectrogramWidth, 0, width - spectrogramWidth, height)
          }
        } else {
          const shiftPixels = shiftColumns * columnPixelWidth
          if (!spectrogramShiftBufferRef.current) {
            spectrogramShiftBufferRef.current = document.createElement('canvas')
          }
          const bufferCanvas = spectrogramShiftBufferRef.current
          if (bufferCanvas.width !== width || bufferCanvas.height !== height) {
            bufferCanvas.width = width
            bufferCanvas.height = height
          }
          const bufferCtx = bufferCanvas.getContext('2d')
          if (!bufferCtx) return

          bufferCtx.clearRect(0, 0, width, height)
          bufferCtx.drawImage(canvas, 0, 0)

          ctx.clearRect(0, 0, width, height)
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(bufferCanvas, -shiftPixels, 0)

          if (shiftColumns > 0) {
            const redrawStart = columnCount - shiftColumns
            ctx.clearRect(
              spectrogramWidth - shiftPixels,
              0,
              shiftPixels,
              height,
            )
            for (let column = redrawStart; column < columnCount; column++) {
              drawSpectrogramColumn(column, startTimeSec)
            }
          } else {
            const redrawEnd = -shiftColumns
            const redrawWidth = -shiftPixels
            ctx.clearRect(0, 0, redrawWidth, height)
            for (let column = 0; column < redrawEnd; column++) {
              drawSpectrogramColumn(column, startTimeSec)
            }
          }
          if (spectrogramWidth < width) {
            ctx.fillStyle = '#000000'
            ctx.fillRect(spectrogramWidth, 0, width - spectrogramWidth, height)
          }
        }
      }
    }

    lastSpectrogramStateRef.current = {
      startTimeSec,
      width,
      height,
      columnCount,
      columnPixelWidth,
      channelMode: spectrogramChannelMode,
      viewportTimeRange: spectrogramViewportTimeRange,
    }
  }, [
    decodedAudioData,
    displayMode,
    duration,
    edit.currentTime,
    spectrogramChannelMode,
    spectrogramViewportTimeRange,
  ])

  // グラフを描画（再生時刻の前後10秒）
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const containerWidth = container.clientWidth
    const currentTimeSec = edit.currentTime / 1000

    // Canvas サイズを設定
    if (canvas.width !== containerWidth || canvas.height !== 256) {
      canvas.width = containerWidth
      canvas.height = 256
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // 描画範囲：再生時刻の前後N秒
    const startTimeSec = currentTimeSec - viewportTimeRange
    const endTimeSec = currentTimeSec + viewportTimeRange

    // 座標変換関数（再生時刻を中心にした相対座標）
    const timeToX = (at: number) => {
      const timeSec = at / 1000
      const relativeTime = timeSec - startTimeSec
      return (relativeTime / (endTimeSec - startTimeSec)) * canvas.width
    }
    const posToY = (pos: number) => canvas.height - (pos / 100) * canvas.height

    // グリッド線を描画
    ctx.strokeStyle =
      displayMode === 'spectrum'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(243, 244, 246, 1)'
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

    // 横方向のグリッド線（スペクトログラム表示時は密度を下げる）
    const horizontalGridStep = displayMode === 'spectrum' ? 2 : 1
    for (let i = 0; i <= 10; i += horizontalGridStep) {
      const y = (canvas.height / 10) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // アクションがない場合は基準線を追加
    if (edit.effectiveActions.length === 0) {
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
      tempPoint = { at: edit.currentTime, pos }
    }

    // 表示範囲内のアクションのみをフィルタリング
    const startTimeMs = startTimeSec * 1000
    const endTimeMs = endTimeSec * 1000
    const visibleActions = edit.effectiveActions.filter(
      (action) => action.at >= startTimeMs && action.at <= endTimeMs,
    )

    // 描画用のアクション配列を作成
    const drawingActions = visibleActions.map((action) => ({
      action,
      index: edit.effectiveActions.indexOf(action),
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

    // アクション線を描画（速度に基づいて色を変更）
    if (drawingActions.length > 0) {
      ctx.lineWidth = 2

      // 各セグメントごとに速度を計算して色を決定
      for (let i = 0; i < drawingActions.length - 1; i++) {
        const current = drawingActions[i].action
        const next = drawingActions[i + 1].action

        // 実際のアクション配列でのインデックスを取得
        const currentIndex = drawingActions[i].index
        const nextIndex = drawingActions[i + 1].index

        // 両方とも実際のアクション（index >= 0）で、かつ連続している場合のみ速度を計算
        if (
          currentIndex >= 0 &&
          nextIndex >= 0 &&
          nextIndex === currentIndex + 1
        ) {
          const duration = next.at - current.at
          const distance = Math.abs(next.pos - current.pos)
          const speed = calculateSpeed(duration, distance)
          const inRange = isSpeedInRange(speed)

          // 速度に基づいて色を設定
          ctx.strokeStyle = inRange ? '#6366f1' : '#ef4444'
        } else {
          // 仮の点が含まれる場合や連続していない場合は通常の色
          ctx.strokeStyle = '#6366f1'
        }

        // 線を描画
        const x1 = timeToX(current.at)
        const y1 = posToY(current.pos)
        const x2 = timeToX(next.at)
        const y2 = posToY(next.pos)

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    // 選択範囲の背景を描画
    if (edit.selectedIndices.length > 0) {
      const selectedActions = edit.selectedIndices
        .map((i) => edit.effectiveActions[i])
        .filter((a) => a !== undefined)
        .sort((a, b) => a.at - b.at)

      if (selectedActions.length > 0) {
        let minTime = selectedActions[0].at
        let maxTime = selectedActions[selectedActions.length - 1].at

        // 1つのポイントのみ選択されている場合、隣のポイントとの中間まで背景を拡張
        if (selectedActions.length === 1) {
          const selectedIndex = edit.selectedIndices[0]
          const selectedAction = selectedActions[0]
          const prevAction =
            selectedIndex > 0 ? edit.effectiveActions[selectedIndex - 1] : null
          const nextAction =
            selectedIndex < edit.effectiveActions.length - 1
              ? edit.effectiveActions[selectedIndex + 1]
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
      const index = edit.effectiveActions.indexOf(action)
      const x = timeToX(action.at)
      const y = posToY(action.pos)
      const isSelected = edit.selectedIndices.includes(index)

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
    edit.effectiveActions,
    edit.selectedIndices,
    currentJobStateType,
    edit.currentTime,
    viewportTimeRange,
  ])

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full h-64 rounded-lg relative bg-white overflow-hidden"
      >
        {/* 波形/スペクトラム表示用のCanvas */}
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
          onMouseDown={edit.onMouseDown}
          onMouseMove={edit.onMouseMove}
          onMouseUp={edit.onMouseUp}
          onClick={edit.onClick}
          onWheel={handleWheel}
          className="absolute inset-0"
          style={{
            background: 'transparent',
            zIndex: 10,
            cursor: edit.isDragging
              ? edit.dragMode === 'horizontal' ||
                edit.dragMode === 'single-horizontal'
                ? 'ew-resize'
                : edit.dragMode === 'vertical' ||
                    edit.dragMode === 'single-vertical'
                  ? 'ns-resize'
                  : edit.dragMode === 'range-move'
                    ? 'move'
                    : edit.dragMode === 'range-left' ||
                        edit.dragMode === 'range-right' ||
                        edit.dragMode === 'range-center-left' ||
                        edit.dragMode === 'range-center-right'
                      ? 'col-resize'
                      : edit.dragMode === 'pos-scale-top' ||
                          edit.dragMode === 'pos-scale-bottom' ||
                          edit.dragMode === 'pos-scale-center-top' ||
                          edit.dragMode === 'pos-scale-center-bottom'
                        ? 'ns-resize'
                        : 'move'
              : edit.hoverCursor,
          }}
        />

        {/* 現在位置インジケーター（コンテナ中央に固定） */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-20"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleEqualize}
          disabled={!canEqualize}
          className="px-4 py-2 rounded bg-primary-variant text-primary-content disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          等間隔にする
        </button>
        <button
          type="button"
          onClick={handleSimplifyAlternating}
          disabled={!canSimplifyAlternating}
          className="px-4 py-2 rounded bg-primary-variant text-primary-content disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          上限交互に単純化
        </button>
      </div>
    </div>
  )
}
