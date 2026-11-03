import { liveQuery } from 'dexie'
import { onScopeDispose, shallowRef, watch, type Ref, type WatchSource } from 'vue'
import { db } from '../db/schema'
import { normalizeSettings } from '../db/seed'
import type { Settings } from '../db/types'

/** Reactive Dexie query; re-runs when the DB changes (or when `deps` change). */
export function useLive<T>(query: () => T | Promise<T>, initial: T, deps?: WatchSource): Ref<T> {
  const value = shallowRef(initial) as Ref<T>
  let sub: { unsubscribe(): void } | undefined
  const start = () => {
    sub?.unsubscribe()
    sub = liveQuery(query).subscribe({ next: (v) => (value.value = v), error: (e) => console.error(e) })
  }
  start()
  if (deps) watch(deps, start)
  onScopeDispose(() => sub?.unsubscribe())
  return value
}

let settingsRef: Ref<Settings> | undefined
/** App-wide settings, kept live. */
export function useSettings(): Ref<Settings> {
  if (!settingsRef) {
    settingsRef = shallowRef(normalizeSettings(undefined))
    liveQuery(() => db.settings.get('settings')).subscribe((s) => {
      if (s) settingsRef!.value = normalizeSettings(s)
    })
  }
  return settingsRef
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = normalizeSettings(await db.settings.get('settings'))
  await db.settings.put({ ...cur, ...patch, id: 'settings' })
}

/** Debounced autosave of a deep-watched draft. */
export function useAutosave<T>(source: Ref<T | undefined>, save: (v: T) => Promise<unknown>, ms = 400) {
  let t: ReturnType<typeof setTimeout> | undefined
  let pending: T | undefined
  const flush = () => {
    if (t) clearTimeout(t)
    t = undefined
    if (pending !== undefined) {
      const v = pending
      pending = undefined
      save(JSON.parse(JSON.stringify(v)))
    }
  }
  watch(source, (v, old) => {
    if (v === undefined || old === undefined) return // initial load
    pending = v
    if (t) clearTimeout(t)
    t = setTimeout(flush, ms)
  }, { deep: true })
  const cancel = () => {
    if (t) clearTimeout(t)
    t = undefined
    pending = undefined
  }
  onScopeDispose(flush)
  return { flush, cancel }
}
