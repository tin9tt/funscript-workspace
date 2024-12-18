export interface Funscript {
  version: string
  inverted: boolean
  range: number
  metadata: FunscriptMeta
  actions: FunscriptAction[]
}

export interface FunscriptMeta {
  creator: string
  description: string
  duration: number
  license: string
  notes: string
  performers: string[]
  script_url: string
  tags: string[]
  title: string
  type: string
  video_url: string
}

export interface FunscriptAction {
  at: number
  pos: number
}
