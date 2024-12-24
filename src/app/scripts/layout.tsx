import { SeekContextProvider } from './_hooks/seek'

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <SeekContextProvider>{children}</SeekContextProvider>
}
