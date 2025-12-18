export interface Funscript {
  version?: string
  inverted?: boolean
  range?: number
  metadata?: FunscriptMeta
  actions: FunscriptAction[]
}

export interface FunscriptMeta {
  creator?: string
  description?: string
  duration?: number
  license?: string
  notes?: string
  performers?: string[]
  script_url?: string
  tags?: string[]
  title?: string
  type?: string
  video_url?: string
}

export interface FunscriptAction {
  /**
   * timestamp in milliseconds
   */
  at: number
  /**
   * position in percentage (0-100)
   */
  pos: number
}

export const isFunscript = (v: unknown): v is Funscript => {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const { version, inverted, range, metadata, actions } = v as Record<
    keyof Funscript,
    unknown
  >
  if (version && typeof version !== 'string') return false
  if (inverted && typeof inverted !== 'boolean') return false
  if (range && typeof range !== 'number') return false
  if (metadata && !isFunscriptMeta(metadata)) return false
  if (actions && !isFunscriptActions(actions)) return false
  return true
}

const isFunscriptMeta = (v: unknown): v is FunscriptMeta => {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const {
    creator,
    description,
    duration,
    license,
    notes,
    performers,
    script_url,
    tags,
    title,
    type,
    video_url,
  } = v as Record<keyof FunscriptMeta, unknown>
  if (creator && typeof creator !== 'string') return false
  if (description && typeof description !== 'string') return false
  if (duration && typeof duration !== 'number') return false
  if (license && typeof license !== 'string') return false
  if (notes && typeof notes !== 'string') return false
  if (performers && !isStringArray(performers)) return false
  if (script_url && typeof script_url !== 'string') return false
  if (tags && !isStringArray(tags)) return false
  if (title && typeof title !== 'string') return false
  if (type && typeof type !== 'string') return false
  if (video_url && typeof video_url !== 'string') return false
  return true
}

const isStringArray = (v: unknown): v is string[] => {
  if (!Array.isArray(v) || v === null) {
    return false
  }
  return !v.some((item) => typeof item !== 'string')
}

const isFunscriptActions = (v: unknown): v is FunscriptAction[] => {
  if (!Array.isArray(v) || v === null) {
    return false
  }
  return !v.some((item) => {
    return !isFunscriptAction(item)
  })
}

const isFunscriptAction = (v: unknown): v is FunscriptAction => {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const { at, pos } = v as Record<keyof FunscriptAction, unknown>
  if (typeof at !== 'number') return false
  if (typeof pos !== 'number') return false
  return true
}

export const sanitizeFunscript = (v: Funscript): Funscript => ({
  ...v,
  actions: sortAndClampFunscriptActions(v.actions),
})

const sortAndClampFunscriptActions = (
  actions: FunscriptAction[],
): FunscriptAction[] =>
  actions
    .sort((a, b) => a.at - b.at)
    .map((a) => ({
      ...a,
      pos: Math.min(100, Math.max(0, a.pos)),
    }))

/**
 * アクション間の速度を計算
 * @param duration アクション間の時間差（ミリ秒）
 * @param distance アクション間の位置差（0-100の範囲）
 * @returns 速度
 */
export const calculateSpeed = (duration: number, distance: number): number => {
  if (distance === 0) {
    return 0
  }
  if (duration <= 0) {
    return Infinity
  }
  return 25000 * Math.pow((duration * 90) / distance, -1.05)
}

/**
 * 速度が有効範囲内かどうかをチェック
 * @param speed 速度
 * @returns 速度が 5～80 の範囲内の場合 true
 */
export const isSpeedInRange = (speed: number): boolean => {
  return speed === 0 || (speed >= 5 && speed <= 80)
}

/**
 * アクション配列から速度が範囲外のセグメントを検出
 * @param actions アクション配列（ソート済みであること）
 * @returns 速度が範囲外のセグメントのインデックス配列（各セグメントは前のアクションのインデックス）
 */
export const findOutOfRangeSpeedSegments = (
  actions: FunscriptAction[],
): number[] => {
  const outOfRangeIndices: number[] = []
  for (let i = 0; i < actions.length - 1; i++) {
    const current = actions[i]
    const next = actions[i + 1]
    const duration = next.at - current.at
    const distance = Math.abs(next.pos - current.pos)
    const speed = calculateSpeed(duration, distance)
    if (!isSpeedInRange(speed)) {
      outOfRangeIndices.push(i)
      console.log(i, speed, duration, distance)
    }
  }
  return outOfRangeIndices
}
