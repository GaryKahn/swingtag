<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { detectPlatform, installPrompt, installed, promptInstall, type Platform } from '../lib/install'

interface Tab {
  id: Platform
  label: string
  icon: string
  steps: string[]
  note?: string
  warn?: string
}

// {name} in a step renders that icon inline, so people can match it to what's on their screen
const TABS: Tab[] = [
  {
    id: 'ios',
    label: 'iPhone & iPad',
    icon: 'phone',
    steps: [
      'Open Costsheet in Safari. (On iOS 16.4 or later, Chrome and Edge work too.)',
      'Tap the Share button {share}. On iPhone it\'s at the bottom of the screen; on iPad it\'s at the top right. In Chrome and Edge it\'s in the address bar.',
      'Scroll down the list and tap Add to Home Screen {plussquare}. Can\'t see it? Tap Edit Actions… at the bottom and add it.',
      'Tap Add in the top-right corner.',
      'From now on, open Costsheet from its icon on your Home Screen.',
    ],
    warn: 'On iPhone and iPad, the Home Screen app keeps its own storage, separate from Safari. Anything you made in Safari before installing won\'t appear in the app. Move it across with Settings → Export backup in Safari, then Settings → Import backup in the app.',
  },
  {
    id: 'android',
    label: 'Android',
    icon: 'phone',
    steps: [
      'Open Costsheet in Chrome.',
      'If an Install banner appears, tap it. Otherwise tap the menu {dots} at the top right.',
      'Tap Add to Home screen (or Install app), then Install.',
      'Samsung Internet: tap the menu {menu} at the bottom right, then Add page to → Home screen.',
      'Firefox: tap the menu {dots}, then Add to Home screen.',
    ],
    note: 'Costsheet then opens full screen from its icon and appears in your app drawer.',
  },
  {
    id: 'desktop',
    label: 'Chrome / Edge on a computer',
    icon: 'laptop',
    steps: [
      'Click the install icon {installpc} at the right-hand end of the address bar.',
      'No icon? In Chrome: menu {dots} → Cast, save and share → Install page as app…',
      'In Edge: menu (…) → Apps → Install this site as an app.',
      'Click Install. Costsheet opens in its own window and appears with your other apps (Start menu, Launchpad or Applications).',
    ],
  },
  {
    id: 'mac-safari',
    label: 'Safari on Mac',
    icon: 'laptop',
    steps: [
      'Requires macOS Sonoma (14) or later.',
      'With Costsheet open, choose File → Add to Dock {dock} (or click Share {share} → Add to Dock).',
      'Click Add. Costsheet opens from the Dock in its own window.',
    ],
    warn: 'Like on iPhone, the Dock app keeps its own storage, separate from Safari. Use Export/Import backup to move anything you made in Safari before.',
  },
  {
    id: 'other',
    label: 'Firefox & others',
    icon: 'laptop',
    steps: [
      'Firefox on a computer can\'t install web apps. Bookmark the page instead. It still works offline after your first visit.',
      'Other browsers: look for Install, Add to Home screen or Add to Dock in the browser menu.',
      'For the full app experience, open the link in Chrome, Edge or Safari.',
    ],
  },
]

const detected = detectPlatform()
const active = ref<Platform>(detected)
const tab = computed(() => TABS.find((t) => t.id === active.value)!)
const busy = ref(false)

const parts = (text: string) => text.split(/(\{\w+\})/).map((p) => (p.startsWith('{') ? { icon: p.slice(1, -1) } : { text: p }))

async function install() {
  busy.value = true
  await promptInstall()
  busy.value = false
}
</script>

<template>
  <div class="card mt-4 max-w-2xl overflow-hidden">
    <div v-if="installed" class="flex items-center gap-2 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <Icon name="check" :size="18" /> You're using the installed app. It works offline and opens from its icon.
    </div>
    <div v-else-if="installPrompt" class="flex flex-wrap items-center gap-3 bg-stone-50 px-4 py-3">
      <span class="flex-1 text-sm">This browser can install Costsheet in one tap.</span>
      <button class="btn-primary py-2" :disabled="busy" @click="install"><Icon name="download" :size="18" /> Install app</button>
    </div>

    <div class="flex flex-wrap gap-x-1 border-b border-stone-200 px-2 pt-2" role="tablist" aria-label="Choose your device">
      <button
        v-for="t in TABS"
        :key="t.id"
        role="tab"
        :aria-selected="active === t.id"
        class="flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm whitespace-nowrap"
        :class="active === t.id ? 'border-ink font-medium text-ink' : 'border-transparent text-stone-500 hover:text-ink'"
        @click="active = t.id"
      >
        <Icon :name="t.icon" :size="16" />{{ t.label }}
        <span v-if="t.id === detected" class="chip ml-1 bg-ink/10 text-ink">This device</span>
      </button>
    </div>

    <div class="p-4" role="tabpanel">
      <ol class="space-y-3">
        <li v-for="(s, i) in tab.steps" :key="i" class="flex gap-3">
          <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs text-white">{{ i + 1 }}</span>
          <span class="leading-relaxed">
            <template v-for="(p, j) in parts(s)" :key="j">
              <span v-if="'icon' in p" class="mx-0.5 inline-flex size-7 translate-y-1.5 items-center justify-center rounded-md border border-stone-300 bg-white text-sky-700" :aria-label="p.icon"><Icon :name="p.icon!" :size="16" /></span>
              <template v-else>{{ p.text }}</template>
            </template>
          </span>
        </li>
      </ol>
      <p v-if="tab.note" class="mt-4 text-sm text-stone-600">{{ tab.note }}</p>
      <p v-if="tab.warn" class="mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><Icon name="warn" :size="18" class="mt-0.5 shrink-0" />{{ tab.warn }}</p>
      <p class="mt-4 text-xs text-stone-500">Updates install themselves: next time you open the app with internet, you get the latest version. Your data stays on this device.</p>
    </div>
  </div>
</template>
