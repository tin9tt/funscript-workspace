// ファイル名とサイズからハッシュを生成する関数（同期版）
export const generateFileId = (file?: File): string => {
  if (!file) return ''
  const fileInfo = `${file.name}_${file.size}_${file.lastModified || 0}`

  // シンプルなハッシュ関数（djb2アルゴリズム）
  let hash = 5381
  for (let i = 0; i < fileInfo.length; i++) {
    hash = (hash << 5) + hash + fileInfo.charCodeAt(i)
  }

  return hash.toString(36)
}
