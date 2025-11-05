import { Funscript } from '@/lib/funscript'

export type TrackAudio = { kind: 'audio'; file: File }

export type TrackVideo = { kind: 'video'; file: File }

export type Track = ({ kind: 'unset' } | TrackAudio | TrackVideo) & {
  script?: Funscript
}

export interface FileState {
  tracks: Track[]
}

export type FileDispatchAction =
  | {
      kind: 'load track'
      payload: { index: number; file: File }
    }
  | {
      kind: 'load script'
      payload: { index: number; script: Funscript }
    }
  | { kind: 'clear' }

export const FileStateReducer = (
  currState: FileState,
  action: FileDispatchAction,
): FileState => {
  switch (action.kind) {
    case 'load track':
      if (isAudio(action.payload.file)) {
        currState.tracks[action.payload.index] = {
          kind: 'audio',
          file: action.payload.file,
          script: currState.tracks[action.payload.index]?.script,
        }
      }
      if (isVideo(action.payload.file)) {
        currState.tracks[action.payload.index] = {
          kind: 'video',
          file: action.payload.file,
          script: currState.tracks[action.payload.index]?.script,
        }
      }
      return { ...currState, tracks: [...currState.tracks] }
    case 'load script':
      currState.tracks[action.payload.index] = {
        ...(currState.tracks[action.payload.index] ?? { kind: 'unset' }),
        script: action.payload.script,
      }
      return { ...currState, tracks: [...currState.tracks] }
    case 'clear':
      return { ...currState, tracks: [] }
    default:
      return currState
  }
}

export const isAudio = (file: File): boolean => file.type.startsWith('audio')
export const isVideo = (file: File): boolean => file.type.startsWith('video')
