import { FunscriptAction } from '@/lib/funscript'
import clsx from 'clsx'

export const Graph = ({ actions }: { actions: FunscriptAction[] }) => {
  return (
    <div
      className={clsx(
        ['relative', 'flex'],
        ['w-full', 'max-w-full', 'px-4'],
        ['overflow-x-scroll', 'overflow-y-visible', 'scrollbar-hidden'],
        ['py-1', '-my-1'],
      )}
    >
      {actions.map((action, i) => (
        <div
          key={`point-${i}`}
          className={clsx('flex', 'border-y-[1px]', 'border-primary-content')}
        >
          <GraphColumnPoint pos={action.pos} />
          {actions[i + 1] !== undefined && (
            <div style={{ width: (actions[i + 1].at - action.at) / 10 }} />
          )}
        </div>
      ))}
    </div>
  )
}

const GraphColumnPoint = ({ pos }: { pos: number }) => {
  return (
    <div
      className={clsx('h-full', 'w-0')}
      style={{ paddingTop: `${(100 - pos) * 3.2}px` }}
    >
      <div
        className={clsx(
          ['w-2', 'h-2', 'rounded-full'],
          ['bg-primary', 'z-50'],
          pos < 50 && ['transform', '-translate-x-[50%]', 'translate-y-[50%]'],
          pos > 50 && ['transform', 'translate-x-[50%]', '-translate-y-[50%]'],
        )}
      />
    </div>
  )
}
