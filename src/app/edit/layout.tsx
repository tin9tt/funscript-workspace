'use client'

import { EditorContextProvider } from './_hooks/editor'

export default function EditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EditorContextProvider>{children}</EditorContextProvider>
}
