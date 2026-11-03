<script setup lang="ts">
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import Icon from './components/Icon.vue'

const nav = [
  { to: '/styles', label: 'Styles', icon: 'shirt' },
  { to: '/templates', label: 'Templates', icon: 'layers' },
  { to: '/components', label: 'Components', icon: 'spool' },
  { to: '/linesheets', label: 'Line sheets', icon: 'sheet' },
  { to: '/orders', label: 'Orders', icon: 'receipt' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
]

const online = ref(navigator.onLine)
addEventListener('online', () => (online.value = true))
addEventListener('offline', () => (online.value = false))

const { offlineReady } = useRegisterSW({ immediate: true })
</script>

<template>
  <div class="min-h-dvh md:flex">
    <aside class="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-6 md:flex">
      <div class="mb-8 px-3 font-serif text-xl">Costsheet</div>
      <nav class="flex flex-col gap-1">
        <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100" active-class="!bg-stone-100 !text-ink font-medium">
          <Icon :name="n.icon" />{{ n.label }}
        </RouterLink>
      </nav>
      <RouterLink to="/help" class="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100" active-class="!bg-stone-100 !text-ink font-medium">
        <Icon name="help" />Help &amp; guides
      </RouterLink>
      <div class="mt-auto px-3 text-xs text-stone-400">
        <span v-if="!online">Offline — everything still works</span>
        <span v-else-if="offlineReady">Ready to use offline</span>
        <span v-else>Saved on this device</span>
      </div>
    </aside>

    <main class="mx-auto w-full max-w-5xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 md:px-8 md:pt-8 md:pb-12">
      <div v-if="!online" class="mb-3 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600 md:hidden">Offline. Everything still works and saves on this device.</div>
      <RouterView />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="flex flex-col items-center gap-0.5 py-2 text-[10px] leading-tight text-stone-500" active-class="!text-ink font-medium">
        <Icon :name="n.icon" :size="22" />{{ n.label }}
      </RouterLink>
    </nav>
  </div>
</template>
