import { ref } from 'vue'

/** Chrome/Edge/Samsung fire this when the app can be installed with a native prompt. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Platform = 'ios' | 'android' | 'desktop' | 'mac-safari' | 'other'

export const installPrompt = ref<BeforeInstallPromptEvent>()
export const installed = ref(isStandalone())

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

/** Call once at startup, before the browser fires the event. */
export function listenForInstall() {
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPrompt.value = e as BeforeInstallPromptEvent
  })
  addEventListener('appinstalled', () => {
    installed.value = true
    installPrompt.value = undefined
  })
}

export async function promptInstall() {
  const e = installPrompt.value
  if (!e) return false
  await e.prompt()
  const { outcome } = await e.userChoice
  installPrompt.value = undefined
  return outcome === 'accepted'
}

export function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Firefox\//.test(ua)) return 'other'
  if (/Macintosh/.test(ua) && /Version\/[\d.]+.*Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return 'mac-safari'
  if (/Chrome|Chromium|Edg\//.test(ua)) return 'desktop'
  return 'other'
}

export const isPhone = () => ['ios', 'android'].includes(detectPlatform())
