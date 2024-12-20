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
}: HTMLAttributes<HTMLDivElement> & { navigations: Navigation[] }) => {
  const pathname = usePathname()

  return (
    <div
      className={clsx(
        ['min-h-screen'],
        ['shadow-lg', 'shadow-primary-variant', 'rounded-r-lg'],
        ['pt-32', 'bg-background'],
        className,
      )}
    >
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
  )
}
