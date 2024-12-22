import clsx from 'clsx'
import { useRef } from 'react'

export const AudioSelector = ({ set }: { set: (file: File) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        className={clsx(
          ['rounded-md', 'py-1', 'px-2'],
          ['bg-primary-content', 'text-primary'],
        )}
        onClick={() => {
          inputRef.current?.click()
        }}
      >
        Choose File
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => {
          if (!e.target.files || e.target.files.length === 0) {
            return
          }
          set(e.target.files[0])
        }}
        hidden
      />
    </>
  )
}
