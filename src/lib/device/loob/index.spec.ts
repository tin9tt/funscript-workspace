import { pos } from './index'

describe('pos', () => {
  it('calculates the position', () => {
    expect(pos({ at: 0, pos: 0 }, { at: 1000, pos: 100 }, 500)).toBe(50)
    expect(pos({ at: 1000, pos: 100 }, { at: 2000, pos: 50 }, 1500)).toBe(75)
  })
})
