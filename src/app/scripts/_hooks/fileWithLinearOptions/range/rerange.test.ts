import { rangedPos } from './hook'

describe('rangedPos', () => {
  test('should apply offset and limit correctly', () => {
    // Example: offset=0, limit=50, pos=20 -> 10
    expect(rangedPos(20, 0, 50)).toBe(10)
  })

  test('should never exceed limit', () => {
    expect(rangedPos(100, 0, 50)).toBe(50)
    expect(rangedPos(100, 25, 75)).toBe(75)
    expect(rangedPos(100, 10, 90)).toBe(90)
  })

  test('should always be at least offset', () => {
    expect(rangedPos(0, 25, 75)).toBe(25)
    expect(rangedPos(0, 10, 90)).toBe(10)
    expect(rangedPos(0, 40, 60)).toBe(40)
  })

  test('should scale proportionally within range', () => {
    // offset=20, limit=80 (range=60)
    expect(rangedPos(0, 20, 80)).toBe(20) // min
    expect(rangedPos(50, 20, 80)).toBe(50) // middle
    expect(rangedPos(100, 20, 80)).toBe(80) // max
  })

  test('should handle zero range (offset equals limit)', () => {
    expect(rangedPos(0, 50, 50)).toBe(50)
    expect(rangedPos(50, 50, 50)).toBe(50)
    expect(rangedPos(100, 50, 50)).toBe(50)
  })

  test('should handle full range (offset=0, limit=100)', () => {
    expect(rangedPos(0, 0, 100)).toBe(0)
    expect(rangedPos(25, 0, 100)).toBe(25)
    expect(rangedPos(50, 0, 100)).toBe(50)
    expect(rangedPos(100, 0, 100)).toBe(100)
  })

  test('result should always be between offset and limit', () => {
    const testCases = [
      { pos: 0, offset: 10, limit: 90 },
      { pos: 25, offset: 10, limit: 90 },
      { pos: 50, offset: 10, limit: 90 },
      { pos: 75, offset: 10, limit: 90 },
      { pos: 100, offset: 10, limit: 90 },
    ]

    testCases.forEach(({ pos, offset, limit }) => {
      const result = rangedPos(pos, offset, limit)
      expect(result).toBeGreaterThanOrEqual(offset)
      expect(result).toBeLessThanOrEqual(limit)
    })
  })

  test('should throw error for invalid offset', () => {
    expect(() => rangedPos(50, -1, 50)).toThrow(
      'Invalid offset: -1. Must be between 0 and 99.',
    )
    expect(() => rangedPos(50, 100, 50)).toThrow(
      'Invalid offset: 100. Must be between 0 and 99.',
    )
    expect(() => rangedPos(50, 150, 50)).toThrow(
      'Invalid offset: 150. Must be between 0 and 99.',
    )
  })

  test('should throw error for invalid limit', () => {
    expect(() => rangedPos(50, 0, 0)).toThrow(
      'Invalid limit: 0. Must be between 1 and 100.',
    )
    expect(() => rangedPos(50, 0, -10)).toThrow(
      'Invalid limit: -10. Must be between 1 and 100.',
    )
    expect(() => rangedPos(50, 0, 101)).toThrow(
      'Invalid limit: 101. Must be between 1 and 100.',
    )
    expect(() => rangedPos(50, 0, 150)).toThrow(
      'Invalid limit: 150. Must be between 1 and 100.',
    )
  })

  test('should accept valid boundary values', () => {
    expect(() => rangedPos(50, 0, 1)).not.toThrow() // min valid values
    expect(() => rangedPos(50, 99, 100)).not.toThrow() // max valid values
  })

  test('should truncate decimal places', () => {
    // Test cases that would produce decimal results
    expect(rangedPos(33, 0, 50)).toBe(16) // 0 + (33 * 50) / 100 = 16.5 -> 16
    expect(rangedPos(67, 10, 80)).toBe(56) // 10 + (67 * 70) / 100 = 56.9 -> 56
    expect(rangedPos(25, 5, 45)).toBe(15) // 5 + (25 * 40) / 100 = 15.0 -> 15
    expect(rangedPos(75, 20, 60)).toBe(50) // 20 + (75 * 40) / 100 = 50.0 -> 50
    expect(rangedPos(11, 0, 90)).toBe(9) // 0 + (11 * 90) / 100 = 9.9 -> 9
  })
})
