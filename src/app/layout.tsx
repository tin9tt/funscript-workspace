import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import clsx from 'clsx'
import { Navigation, Sidebar } from './_components/Sidebar'
import { AuthContextProvider } from './_hooks/auth/context'
import FileSVG from '@/assets/images/file.svg'

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

const navigations: Navigation[] = [
  {
    title: 'Scripts',
    href: '/scripts',
    image: {
      kind: 'node',
      node: <FileSVG className={clsx('fill-foreground')} />,
    },
  },
  {
    title: 'Edit',
    href: '/edit',
    image: {
      kind: 'node',
      node: <FileSVG className={clsx('fill-foreground')} />,
    },
  },
]

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
            ['flex', 'bg-lattice-primary-content-8'],
          )}
        >
          <Sidebar
            navigations={navigations}
            className={clsx('w-[240px]', 'min-w-[240px]')}
          />
          <div
            className={clsx(
              ['w-full', 'max-w-[calc(100%-240px)]'],
              'bg-[top_left_-16px]',
            )}
          >
            {children}
          </div>
        </body>
      </AuthContextProvider>
    </html>
  )
}
