import clsx from 'clsx'
import { useRef } from 'react'

export const ImageSelector = ({ set }: { set: (file: File) => void }) => {
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
        Choose Image
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (!e.target.files || e.target.files.length === 0) {
            return
          }
          Array.from(e.target.files).forEach((file) => set(file))
          e.currentTarget.value = ''
        }}
        hidden
      />
    </>
  )
}
