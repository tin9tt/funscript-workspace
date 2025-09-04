'use client'

import { createContext, ReactNode, useReducer } from 'react'
import {
  DeviceDispatchAction,
  DeviceState,
  DeviceStateReducer,
} from './reducer'

export const defaultDeviceState = (): DeviceState => {
  return { devices: { found: {}, connected: {} } }
}

export const DeviceContext = createContext<{
  state: DeviceState
  dispatch: React.Dispatch<DeviceDispatchAction>
}>({
  state: defaultDeviceState(),
  dispatch: () => {},
})

export const DeviceContextProvider = ({
  children,
}: React.PropsWithChildren): ReactNode => {
  const [state, dispatch] = useReducer(DeviceStateReducer, defaultDeviceState())

  return (
    <DeviceContext.Provider value={{ state, dispatch }}>
      {children}
    </DeviceContext.Provider>
  )
}
