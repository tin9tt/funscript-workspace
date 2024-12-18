import clsx from 'clsx'

const STYLE = {
  color: {
    primary: ['border-primary', 'border-t-transparent'],
    secondary: ['border-secondary', 'border-t-transparent'],
  },
  size: {
    xs: ['h-4', 'w-4', 'border-[3px]'],
    xl: ['h-20', 'w-20', 'border-4'],
  },
}

export const Loader = ({
  size = 'xs',
  color = 'primary',
}: {
  size?: 'xs' | 'xl'
  color?: 'primary' | 'secondary'
}) => (
  <div
    className={clsx(
      ['animate-spin', 'rounded-full'],
      STYLE.size[size],
      STYLE.color[color],
    )}
  />
)
