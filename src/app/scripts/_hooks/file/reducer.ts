import { Funscript } from '@/lib/funscript'

export type TrackAudio = { kind: 'audio'; file: File }

export type TrackVideo = { kind: 'video'; file: File }

export type Track = ({ kind: 'unset' } | TrackAudio | TrackVideo) & {
  script?: Funscript
}

export interface FileState {
  tracks: Track[]
  image?: File
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
  | {
      kind: 'load image'
      payload: { file: File }
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
    case 'load image':
      return {
        ...currState,
        image: action.payload.file,
      }
    case 'clear':
      return { ...currState, tracks: [], image: undefined }
    default:
      return currState
  }
}

export const isAudio = (file: File): boolean => file.type.startsWith('audio')
export const isImage = (file: File): boolean => file.type.startsWith('image')
export const isVideo = (file: File): boolean => file.type.startsWith('video')
