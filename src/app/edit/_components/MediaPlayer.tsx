'use client'

import { useEditorContext } from '../_hooks/editor'
import { useEffect, useRef } from 'react'

export const MediaPlayer = () => {
  const { state, setCurrentTime, setPlaying } = useEditorContext()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const isVideo = state.file?.type.startsWith('video')
  const isAudio = state.file?.type.startsWith('audio')

  // ファイルが変更されたらメディアをロード
  useEffect(() => {
    if (!state.file) return

    const url = URL.createObjectURL(state.file)

    if (isVideo && videoRef.current) {
      videoRef.current.src = url
      videoRef.current.load()
      videoRef.current.currentTime = 0
    } else if (isAudio && audioRef.current) {
      audioRef.current.src = url
      audioRef.current.load()
      audioRef.current.currentTime = 0
    }

    setCurrentTime(0)
    setPlaying(false)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [state.file, isVideo, isAudio, setCurrentTime, setPlaying])

  // 再生状態の同期
  useEffect(() => {
    const mediaElement = isVideo ? videoRef.current : audioRef.current
    if (!mediaElement) return

    if (state.isPlaying) {
      mediaElement.play().catch(() => {
        setPlaying(false)
      })
    } else {
      mediaElement.pause()
    }
  }, [state.isPlaying, isVideo, setPlaying])

  // 高頻度で currentTime を更新 (requestAnimationFrame を使用)
  useEffect(() => {
    if (!state.isPlaying) return

    const mediaElement = isVideo ? videoRef.current : audioRef.current
    if (!mediaElement) return

    let animationFrameId: number

    const updateTime = () => {
      setCurrentTime(mediaElement.currentTime * 1000) // 秒からミリ秒に変換
      animationFrameId = requestAnimationFrame(updateTime)
    }

    animationFrameId = requestAnimationFrame(updateTime)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [state.isPlaying, isVideo, setCurrentTime])

  // 時間更新のハンドリング（シーク時など）
  const handleTimeUpdate = () => {
    if (state.isPlaying) return // 再生中は requestAnimationFrame で更新

    const mediaElement = isVideo ? videoRef.current : audioRef.current
    if (mediaElement) {
      setCurrentTime(mediaElement.currentTime * 1000) // 秒からミリ秒に変換
    }
  }

  const handleEnded = () => {
    setPlaying(false)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    const mediaElement = isVideo ? videoRef.current : audioRef.current
    if (mediaElement) {
      mediaElement.currentTime = time
      setCurrentTime(time * 1000)
    }
  }

  const togglePlayPause = () => {
    setPlaying(!state.isPlaying)
  }

  if (!state.file) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">メディアファイルを選択してください</p>
      </div>
    )
  }

  const duration = isVideo
    ? videoRef.current?.duration || 0
    : audioRef.current?.duration || 0

  return (
    <div className="space-y-4">
      {/* メディア要素 */}
      {isVideo && (
        <video
          ref={videoRef}
          className="w-full max-h-96 bg-black rounded-lg"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}
      {isAudio && (
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      {/* コントロールパネル */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlayPause}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {state.isPlaying ? '⏸ 一時停止' : '▶ 再生'}
          </button>

          <div className="text-sm text-gray-600">
            {formatTime(state.currentTime / 1000)} / {formatTime(duration)}
          </div>
        </div>

        {/* シークバー */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={state.currentTime / 1000}
          onChange={handleSeek}
          className="w-full"
        />
      </div>
    </div>
  )
}

// 時間をMM:SS形式でフォーマット
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
