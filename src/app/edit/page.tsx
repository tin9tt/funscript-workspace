'use client'

import { usePlayback } from './_hooks/playback'
import { FileSelector } from './_components/FileSelector'
import { MediaPlayer } from './_components/MediaPlayer'
import { FunscriptGraph } from './_components/FunscriptGraph'
import { useRealtimeEdit } from './_hooks/realtimeEdit/useRealtimeEdit'
import { useEditorGraphHandler } from './_hooks/editorGraphHandler/useEditorGraphHandler'
import { useLocalStoragePersistence } from './_hooks/localStoragePersistence/useLocalStoragePersistence'
import { Controls } from './_components/Controls'

export default function EditPage() {
  const { isPlaying, currentTime } = usePlayback()

  const { type: currentJobType } = useRealtimeEdit({
    isPlaying,
    currentTime,
  })

  // バックグラウンド処理フック
  useEditorGraphHandler()
  useLocalStoragePersistence()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Funscript Editor</h1>

      {/* ファイル選択 */}
      <FileSelector />

      {/* メディアプレイヤー */}
      <MediaPlayer />

      {/* グラフエリア */}
      <div data-graph-container className="space-y-4">
        <h2 className="text-xl font-semibold">編集グラフ</h2>
        <FunscriptGraph currentJobStateType={currentJobType} />

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
