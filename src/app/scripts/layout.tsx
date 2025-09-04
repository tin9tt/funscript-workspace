import { DeviceContextProvider } from './_hooks/device'
import { FileContextProvider } from './_hooks/file'
import { SeekContextProvider } from './_hooks/seek'
import clsx from 'clsx'

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <DeviceContextProvider>
      <FileContextProvider>
        <SeekContextProvider>
          <div className={clsx('p-8')}>{children}</div>{' '}
        </SeekContextProvider>
      </FileContextProvider>
    </DeviceContextProvider>
  )
}
