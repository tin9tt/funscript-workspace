import clsx from 'clsx'

export const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) => {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={clsx(
        'relative',
        'inline-flex',
        'h-6',
        'w-11',
        'items-center',
        'rounded-full',
        'transition-colors',
        'ring-2',
        'ring-primary-variant',
        checked ? 'bg-primary-variant' : 'bg-primary-content',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={clsx(
          'inline-block',
          'h-4',
          'w-4',
          'transform',
          'rounded-full',
          'transition-transform',
          checked
            ? [
                'translate-x-6',
                'ring-1',
                'ring-primary-content',
                'bg-primary-content',
              ]
            : ['translate-x-1', 'bg-primary-variant'],
        )}
      />
    </button>
  )
}
