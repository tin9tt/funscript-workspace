import { FunscriptAction } from '@/lib/funscript'
import { Card } from '../_components/common'
import { Graph } from './_components/Graph'
import clsx from 'clsx'

const s = 1000

const roundtrip = (
  pos1: number,
  pos2: number,
  interval: number,
  count: number,
  offset: number = 0,
): FunscriptAction[] => {
  return [...Array(count * 2)].flatMap((_, i): FunscriptAction[] => {
    return [{ at: (interval / 2) * i + offset, pos: i % 2 === 0 ? pos1 : pos2 }]
  })
}

export default function Scripts() {
  return (
    <>
      <Card>
        <div className={clsx('py-8')}>
          <Graph
            actions={[
              { at: 0 * s, pos: 0 },
              { at: 9.5 * s, pos: 0 },
              ...roundtrip(20, 70, 1 * s, 5, 10 * s),
              ...roundtrip(10, 90, 1 * s, 5, 15 * s),
              ...roundtrip(0, 100, 1 * s, 5, 20 * s),
              { at: 25 * s, pos: 0 },
              { at: 25.5 * s, pos: 100 },
              { at: 26 * s, pos: 100 },
              { at: 26.5 * s, pos: 80 },
              { at: 27 * s, pos: 80 },
              { at: 27.5 * s, pos: 50 },
              { at: 28 * s, pos: 50 },
              { at: 28.5 * s, pos: 20 },
              { at: 29 * s, pos: 20 },
              { at: 29.5 * s, pos: 0 },
              { at: 29.75 * s, pos: 0 },
              ...roundtrip(20, 40, 1 * s, 5, 30 * s),
              ...roundtrip(70, 90, 1 * s, 5, 35 * s),
              { at: 40 * s, pos: 50 },
              { at: 40.5 * s, pos: 50 },
              { at: 41 * s, pos: 10 },
              { at: 41.5 * s, pos: 50 },
              { at: 42 * s, pos: 50 },
              { at: 42.5 * s, pos: 100 },
            ]}
          />
        </div>
      </Card>
    </>
  )
}
