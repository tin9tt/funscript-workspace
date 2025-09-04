import clsx from 'clsx'
import { HTMLAttributes, PropsWithChildren } from 'react'

export const Card = ({
  children,
  className,
}: PropsWithChildren & HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={clsx(
        [
          ['shadow-sm', 'shadow-primary-variant'],
          ['ring-[0.4px]', 'ring-primary-variant'],
          'rounded-lg',
          'bg-background',
        ],
        'p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
