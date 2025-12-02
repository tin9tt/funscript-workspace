'use client'

import { SelectProvider } from './_hooks/select'
import { ActionsProvider } from './_hooks/actions'
import { PlaybackProvider } from './_hooks/playback'

export default function EditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PlaybackProvider>
      <ActionsProvider>
        <SelectProvider>{children}</SelectProvider>
      </ActionsProvider>
    </PlaybackProvider>
  )
}
