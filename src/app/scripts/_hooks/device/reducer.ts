import { Device, DeviceFunscriptSupported } from '@/lib/device'
import { LoobI } from '@/lib/device/loob'

export interface DeviceState {
  devices: {
    found: { [key: string]: string }
    connected: { [key: string]: Device & DeviceFunscriptSupported }
  }
}

export type DeviceDispatchAction =
  | { kind: 'connect loob'; payload: { loob: LoobI } }
  | { kind: 'disconnect all' }

export const DeviceStateReducer = (
  currState: DeviceState,
  action: DeviceDispatchAction,
): DeviceState => {
  switch (action.kind) {
    case 'connect loob':
      return {
        ...currState,
        devices: {
          ...currState.devices,
          connected: {
            ...currState.devices.connected,
            loob: action.payload.loob,
          },
        },
      }
    case 'disconnect all':
      return {
        ...currState,
        devices: { ...currState.devices, connected: {} },
      }
    default:
      return currState
  }
}
