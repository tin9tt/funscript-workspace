'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { ReactNode } from 'react'
import FileSVG from '@/assets/images/file.svg'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

type Navigation = {
  title: string
  href: string
  image:
    | { kind: 'src'; src: string; width: number; height: number }
    | { kind: 'node'; node: ReactNode }
}

export const NAVIGATIONS: Navigation[] = [
  {
    title: 'Scripts',
    href: '/scripts',
    image: {
      kind: 'node',
      node: <FileSVG className={clsx('fill-foreground')} />,
    },
  },
]

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <div
      className={clsx(
        ['min-h-screen', 'w-[240px]'],
        ['shadow-lg', 'shadow-primary-variant', 'rounded-r-lg'],
        ['pt-32'],
      )}
    >
      {NAVIGATIONS.map((nav, i) => (
        <Link
          key={`nav-${i}`}
          href={nav.href}
          className={clsx(
            ['m-2'],
            ['flex', 'items-center', 'p-2', 'gap-2'],
            ['hover:bg-primary/30', 'rounded-md'],
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
