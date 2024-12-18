import clsx from 'clsx'
import { Loader } from './Loader'
import Link from 'next/link'

const STYLE = {
  color: {
    default: ['border'],
    primary: ['bg-primary', 'text-primary-content'],
    secondary: ['bg-secondary', 'text-secondary-content'],
    error: ['bg-error', 'text-error-content'],
  },
  size: {
    default: ['py-2', 'px-4', 'text-sm'],
    small: ['py-1', 'px-2', 'text-xs'],
  },
}

export const Button = ({
  className,
  children,
  color = 'default',
  size = 'default',
  ...props
}: (
  | ({
      kind?: 'button'
      loading?: boolean
    } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  | { kind: 'link'; href: string }
) & {
  className?: string
  children?: React.ReactNode
  color?: 'default' | 'primary' | 'secondary' | 'error'
  size?: 'default' | 'small'
}) => {
  if (props.kind === 'link') {
    return (
      <Link
        href={props.href}
        className={clsx(
          ['font-bold', 'rounded'],
          [
            color === 'error' && STYLE.color.error,
            color === 'primary' && STYLE.color.primary,
            color === 'secondary' && STYLE.color.secondary,
            color === 'default' && STYLE.color.default,
          ],
          [
            size === 'small' && STYLE.size.small,
            size === 'default' && STYLE.size.default,
          ],
          className,
        )}
      >
        {children}
      </Link>
    )
  }

  const loading = props.loading
  delete props.loading

  return (
    <button
      {...props}
      className={clsx(
        ['font-bold', 'rounded'],
        [
          color === 'error' && STYLE.color.error,
          color === 'primary' && STYLE.color.primary,
          color === 'secondary' && STYLE.color.secondary,
          color === 'default' && STYLE.color.default,
        ],
        [
          size === 'small' && STYLE.size.small,
          size === 'default' && STYLE.size.default,
        ],
        className,
      )}
    >
      <div className={clsx('flex', 'items-center', 'gap-2')}>
        {loading && <Loader />}
        <div className={clsx('whitespace-nowrap')}>{children}</div>
      </div>
    </button>
  )
}
