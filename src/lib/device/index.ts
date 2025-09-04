import { Funscript } from '../funscript'

export interface Device {
  connect(device: BluetoothDevice): Promise<Device>
  disconnect(): Promise<void>
}

export interface DeviceFunscriptSupported {
  load(funscript: Funscript): Promise<void>
  seek(currentTime: number): Promise<void>
  play(playbackStartTime: number, videoCurrentTime: number): Promise<void>
  pause(): Promise<void>
}
