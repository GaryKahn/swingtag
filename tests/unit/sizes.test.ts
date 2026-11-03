import { describe, expect, it } from 'vitest'
import { parseColourways, parseSizes } from '../../src/lib/sizes'
import { convertQty, convertUnitCost } from '../../src/lib/units'

describe('parseSizes', () => {
  it('expands letter ranges', () => {
    expect(parseSizes('XS–XL')).toEqual(['XS', 'S', 'M', 'L', 'XL'])
    expect(parseSizes('s-m')).toEqual(['S', 'M'])
    expect(parseSizes('XS - 2XL')).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
  })
  it('splits lists', () => {
    expect(parseSizes('S, M, L')).toEqual(['S', 'M', 'L'])
    expect(parseSizes('S M L')).toEqual(['S', 'M', 'L'])
  })
  it('expands numeric ranges', () => {
    expect(parseSizes('6-14')).toEqual(['6', '8', '10', '12', '14'])
    expect(parseSizes('28–32')).toEqual(['28', '29', '30', '31', '32'])
  })
  it('defaults to one size', () => {
    expect(parseSizes('')).toEqual(['OS'])
    expect(parseSizes('One size')).toEqual(['OS'])
  })
})

describe('parseColourways', () => {
  it('splits and trims', () => {
    expect(parseColourways('Ecru, Navy ,Black')).toEqual(['Ecru', 'Navy', 'Black'])
    expect(parseColourways('')).toEqual([''])
  })
})

describe('unit conversion', () => {
  it('round-trips yards and metres', () => {
    expect(convertQty(1, 'yd', 'm')).toBe(0.914)
    expect(convertUnitCost(9, 'yd', 'm')).toBe(9.84)
    expect(convertQty(2, 'pc', 'm')).toBe(2)
  })
})
