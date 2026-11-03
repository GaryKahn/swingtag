import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectPlatform } from '../../src/lib/install'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Edg/131.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
}
const as = (userAgent: string, platform = '', maxTouchPoints = 0) => vi.stubGlobal('navigator', { userAgent, platform, maxTouchPoints })
afterEach(() => vi.unstubAllGlobals())

describe('detectPlatform', () => {
  it('recognises phones and tablets', () => {
    as(UA.iphone); expect(detectPlatform()).toBe('ios')
    as(UA.iphoneChrome); expect(detectPlatform()).toBe('ios')
    as(UA.ipadDesktopMode, 'MacIntel', 5); expect(detectPlatform()).toBe('ios') // iPadOS pretends to be a Mac
    as(UA.android); expect(detectPlatform()).toBe('android')
    as(UA.samsung); expect(detectPlatform()).toBe('android')
  })
  it('recognises desktop browsers', () => {
    as(UA.macSafari, 'MacIntel', 0); expect(detectPlatform()).toBe('mac-safari')
    as(UA.macChrome, 'MacIntel', 0); expect(detectPlatform()).toBe('desktop')
    as(UA.winEdge, 'Win32'); expect(detectPlatform()).toBe('desktop')
    as(UA.winFirefox, 'Win32'); expect(detectPlatform()).toBe('other')
  })
})
