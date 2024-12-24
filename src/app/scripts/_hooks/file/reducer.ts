import { Funscript } from '@/lib/funscript'

export interface FileState {
  tracks: { audio?: File; script?: Funscript }[]
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
      if (action.payload.file.type.startsWith('audio')) {
        if (currState.tracks[action.payload.index]) {
          currState.tracks[action.payload.index].audio = action.payload.file
        } else {
          currState.tracks[action.payload.index] = {
            audio: action.payload.file,
          }
        }
      }
      return { ...currState, tracks: [...currState.tracks] }
    case 'load script':
      if (currState.tracks[action.payload.index]) {
        currState.tracks[action.payload.index].script = action.payload.script
      } else {
        currState.tracks[action.payload.index] = {
          script: action.payload.script,
        }
      }
      return { ...currState, tracks: [...currState.tracks] }
    case 'clear':
      return { ...currState, tracks: [] }
    default:
      return currState
  }
}
