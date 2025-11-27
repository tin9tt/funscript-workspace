'use client'

import { useContext } from 'react'
import { DeviceContext } from './context'
import { Loob } from '@/lib/device/loob'
import { Funscript } from '@/lib/funscript'

export const useDeviceContext = () => {
  const { state, dispatch } = useContext(DeviceContext)

  const requestDevices = async () => {
    navigator.bluetooth
      .requestDevice({
        filters: [
          {
            namePrefix: 'LOOB',
          },
        ],
        optionalServices: ['b75c49d2-04a3-4071-a0b5-35853eb08307'],
      })
      .then((device) => {
        if (device.name === 'LOOB') {
          connectLoob(device)
        }
      })
      .catch(() => {})
  }

  const connectLoob = async (device: BluetoothDevice) => {
    const loob = await Loob.connect(device)
    dispatch({ kind: 'connect loob', payload: { loob } })
  }

  const disconnectAll = () => {
    Promise.all(
      Object.keys(state.devices.connected).map((key) =>
        state.devices.connected[key].disconnect(),
      ),
    )
    dispatch({ kind: 'disconnect all' })
  }

  const load = async (funscript: Funscript) => {
    await Promise.all(
      Object.keys(state.devices.connected).map((key) =>
        state.devices.connected[key].load(funscript),
      ),
    )
  }

  /**
   * @param seekTo seconds
   */
  const seek = async (seekTo: number) => {
    const seekToMS = Math.round(seekTo * 100)
    await Promise.all(
      Object.keys(state.devices.connected).map((key) =>
        state.devices.connected[key].seek(seekToMS),
      ),
    )
  }

  const play = (playbackStartTime: number, videoCurrentTime: number) => {
    Promise.all(
      Object.keys(state.devices.connected).map((key) =>
        state.devices.connected[key].play(playbackStartTime, videoCurrentTime),
      ),
    )
  }

  const pause = () => {
    Promise.all(
      Object.keys(state.devices.connected).map((key) =>
        state.devices.connected[key].pause(),
      ),
    )
  }

  return {
    devices: state.devices.connected,
    requestDevices,
    disconnectAll,
    load,
    seek,
    play,
    pause,
  }
}
