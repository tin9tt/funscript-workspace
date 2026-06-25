'use client'

import { useState } from 'react'
import { usePlayback } from './_hooks/playback'
import { FileSelector } from './_components/FileSelector'
import {
  FunscriptGraph,
  type EditGraphDisplayMode,
  type SpectrogramChannelMode,
} from './_components/FunscriptGraph'
import { useRealtimeEdit } from './_hooks/realtimeEdit/useRealtimeEdit'
import { useLocalStoragePersistence } from './_hooks/localStoragePersistence/useLocalStoragePersistence'
import { ToggleSwitch } from '../_components/common'
import { MediaPlayer } from './_components/MediaPlayer'
import { Controls } from './_components/Controls'

export default function EditPage() {
  const { isPlaying, currentTime } = usePlayback()
  const [graphDisplayMode, setGraphDisplayMode] =
    useState<EditGraphDisplayMode>('waveform')
  const [spectrogramChannelMode, setSpectrogramChannelMode] =
    useState<SpectrogramChannelMode>('stereo-average')

  const { type: currentJobType } = useRealtimeEdit({
    isPlaying,
    currentTime,
  })

  // バックグラウンド処理フック
  useLocalStoragePersistence()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ファイル選択 */}
      <FileSelector />

      {/* メディアプレイヤー */}
      <MediaPlayer />

      {/* グラフエリア */}
      <div data-graph-container className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">編集グラフ</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>波形</span>
              <ToggleSwitch
                checked={graphDisplayMode === 'spectrum'}
                onChange={(checked) =>
                  setGraphDisplayMode(checked ? 'spectrum' : 'waveform')
                }
              />
              <span>スペクトラム</span>
            </div>

            <div className="flex items-center gap-2">
              <span>音声</span>
              <select
                value={spectrogramChannelMode}
                onChange={(event) =>
                  setSpectrogramChannelMode(
                    event.target.value as SpectrogramChannelMode,
                  )
                }
                disabled={graphDisplayMode !== 'spectrum'}
                className="px-2 py-1 rounded border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="stereo-average">ステレオ平均</option>
                <option value="stereo-max">ステレオ最大</option>
                <option value="left">左のみ</option>
                <option value="center">中央</option>
                <option value="right">右のみ</option>
              </select>
            </div>
          </div>
        </div>
        <FunscriptGraph
          currentJobStateType={currentJobType}
          displayMode={graphDisplayMode}
          spectrogramChannelMode={spectrogramChannelMode}
        />

        {/* 操作ガイド */}
        <div className="p-4 rounded-lg text-sm space-y-2">
          <h3 className="font-semibold">操作方法</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">作成モード（再生中）</p>
              <ul className="list-disc list-inside">
                <li>J キー長押し: 下降 (100→0)</li>
                <li>K キー長押し: 上昇 (0→100)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">編集モード（停止中）</p>
              <ul className="list-disc list-inside">
                <li>クリック: 点を選択</li>
                <li>Shift + クリック: 範囲選択</li>
                <li>Alt/Option + クリック: 複数選択</li>
                <li>スクロール / J/K: 上下移動</li>
                <li>Alt + スクロール / J/K: 拡大/縮小</li>
                <li>Ctrl/Cmd + C: 連続選択した点をコピー</li>
                <li>Ctrl/Cmd + V: 貼り付け</li>
                <li>Delete / Backspace: 削除</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* コントロールパネル */}
      <Controls />
    </div>
  )
}
