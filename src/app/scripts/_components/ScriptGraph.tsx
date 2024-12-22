import { FunscriptAction } from '@/lib/funscript'
import clsx from 'clsx'

export const ScriptGraph = ({ actions }: { actions: FunscriptAction[] }) => {
  return (
    <div
      className={clsx(
        ['relative', 'flex'],
        ['w-full', 'max-w-full', 'px-4'],
        ['overflow-x-scroll', 'overflow-y-visible', 'scrollbar-hidden'],
        ['py-1', '-my-1'],
      )}
    >
      {actions.map((action, i) => {
        const next = actions[i + 1]
        return (
          <div
            key={`point-${i}`}
            className={clsx('flex', 'border-y-[1px]', 'border-primary-content')}
          >
            <GraphColumnPoint pos={action.pos} heightRate={3.2} />
            {next !== undefined && (
              <GraphColumnLine
                action={action}
                next={next}
                heightRate={3.2}
                widthRate={0.1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const GraphColumnPoint = ({
  pos,
  heightRate,
}: {
  pos: number
  heightRate: number
}) => {
  const positionFromTop = (100 - pos) * heightRate

  return (
    <div
      className={clsx('h-full', 'w-0')}
      style={{ paddingTop: `${positionFromTop}px` }}
    >
      <div
        className={clsx(
          ['w-2', 'h-2', 'rounded-full'],
          ['bg-primary', 'z-50'],
          pos < 50 && ['transform', '-translate-x-[50%]', 'translate-y-[50%]'],
          pos > 50 && ['transform', '-translate-x-[50%]', '-translate-y-[50%]'],
        )}
      />
    </div>
  )
}

const GraphColumnLine = ({
  action,
  next,
  heightRate,
  widthRate,
}: {
  action: FunscriptAction
  next: FunscriptAction
  heightRate: number
  widthRate: number
}) => {
  const widthDiffActual = (next.at - action.at) * widthRate
  let widthDiff = (next.at - action.at) * widthRate
  let heightDiff = Math.abs((next.pos - action.pos) * heightRate)
  let paddingLeft = 0

  let positionFromTop = (100 - action.pos) * heightRate
  if (action.pos === 50) {
    positionFromTop += 4
    if (next.pos === 50) {
      paddingLeft += 4
    }
    if (next.pos < 50) {
      widthDiff -= 6
      paddingLeft += 4
    }
    if (next.pos > 50) {
      positionFromTop -= 4
      widthDiff -= 6
      paddingLeft += 6
    }
  }
  if (action.pos !== 50 && next.pos === 50) {
    widthDiff += 2
    if (action.pos < 50) {
      positionFromTop += 6
    }
  }
  if (
    (action.pos < 50 && next.pos > 50) ||
    (action.pos > 50 && next.pos < 50)
  ) {
    positionFromTop += 4
    heightDiff += 4
    if (action.pos < 50) {
      paddingLeft += 3
      widthDiff -= 2
    }
    if (action.pos > 50) {
      positionFromTop -= 2
      paddingLeft += 1
      widthDiff -= 2
    }
  }
  if (action.pos < 50 && next.pos < 50) {
    positionFromTop += 8
  }

  const deg = Math.round((Math.atan(heightDiff / widthDiff) * 180) / Math.PI)
  const negative = next.pos - action.pos < 0
  const width = Math.sqrt(widthDiff ** 2 + heightDiff ** 2)

  return (
    <div
      className={clsx('h-full')}
      style={{ width: widthDiffActual, paddingLeft: paddingLeft }}
    >
      <div
        className={clsx(
          'border-b',
          'border-b-2',
          'origin-bottom-left',
          'border-primary-variant',
        )}
        style={{
          paddingTop: positionFromTop,
          width: width,
          rotate: `${negative ? deg : -1 * deg}deg`,
        }}
      />
    </div>
  )
}