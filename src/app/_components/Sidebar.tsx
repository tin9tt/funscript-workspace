'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { HTMLAttributes, ReactNode } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export type Navigation = {
  title: string
  href: string
  image:
    | { kind: 'src'; src: string; width: number; height: number }
    | { kind: 'node'; node: ReactNode }
}

export const Sidebar = ({
  className,
  navigations,
  version,
}: HTMLAttributes<HTMLDivElement> & {
  navigations: Navigation[]
  version: string
}) => {
  const pathname = usePathname()

  return (
    <div
      className={clsx(
        ['flex', 'min-h-screen', 'flex-col'],
        ['shadow-lg', 'shadow-primary-variant', 'rounded-r-lg'],
        ['pt-32', 'bg-background', 'dark:bg-foreground'],
        className,
      )}
    >
      <div className={clsx('flex-1')}>
        {navigations.map((nav, i) => (
          <Link
            key={`nav-${i}`}
            href={nav.href}
            className={clsx(
              ['m-2'],
              ['flex', 'items-center', 'p-2', 'gap-2'],
              [
                'hover:bg-primary-content/30',
                'hover:outline',
                'hover:outline-1',
                'hover:outline-primary/40',
                'rounded-md',
              ],
              pathname.startsWith(nav.href) && 'bg-primary-variant/20',
            )}
          >
            {nav.image.kind == 'src' && (
              <Image
                alt={nav.href}
                src={nav.image.src}
                width={nav.image.width}
                height={nav.image.height}
              />
            )}
            {nav.image.kind == 'node' && nav.image.node}
            <p>{nav.title}</p>
          </Link>
        ))}
      </div>
      <div
        className={clsx(
          ['flex', 'justify-center', 'items-center', 'py-4'],
          ['text-xs', 'text-primary/60', 'dark:text-background/60'],
        )}
      >
        {version}
      </div>
    </div>
  )
}
