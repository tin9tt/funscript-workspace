import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import clsx from 'clsx'
import { Sidebar } from './_components/Sidebar'
import { AuthContextProvider } from './_hooks/auth/context'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'funscript workspace',
  description: 'Funscript player and editor that works with video and audio.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html>
      <AuthContextProvider>
        <body
          className={clsx(
            [geistSans.variable, geistMono.variable, 'antialiased'],
            ['min-h-screen', 'w-full'],
          )}
        >
          <div className={clsx('flex')}>
            <Sidebar />
            <div className={clsx('m-8')}>{children}</div>
          </div>
        </body>
      </AuthContextProvider>
    </html>
  )
}
