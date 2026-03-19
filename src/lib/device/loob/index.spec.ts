import { calculateContinuousBaseCycleDuration, pos } from './index'

describe('pos', () => {
  it('calculates the position', () => {
    expect(pos({ at: 0, pos: 0 }, { at: 1000, pos: 100 }, 500)).toBe(50)
    expect(pos({ at: 1000, pos: 100 }, { at: 2000, pos: 50 }, 1500)).toBe(75)
  })
})

describe('calculateContinuousBaseCycleDuration', () => {
  it('keeps the fastest speed unchanged', () => {
    expect(calculateContinuousBaseCycleDuration(100)).toBe(180)
  })

  it('slows the middle of the range to about two-thirds of the previous effective speed', () => {
    const previousMidCycleDuration = 1705

    expect(calculateContinuousBaseCycleDuration(50)).toBe(2460)
    expect(
      previousMidCycleDuration / calculateContinuousBaseCycleDuration(50),
    ).toBeCloseTo(2 / 3, 1)
  })

  it('keeps medium speed unchanged while slowing the low range further', () => {
    expect(calculateContinuousBaseCycleDuration(50)).toBe(2460)
    expect(calculateContinuousBaseCycleDuration(25)).toBe(5181)
  })

  it('makes very low speed about half as fast as the previous low-speed tuning', () => {
    const previousVeryLowCycleDuration = 3175

    expect(calculateContinuousBaseCycleDuration(10)).toBe(6044)
    expect(
      previousVeryLowCycleDuration / calculateContinuousBaseCycleDuration(10),
    ).toBeCloseTo(1 / 2, 1)
  })
})
