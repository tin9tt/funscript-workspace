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
  at: number
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
