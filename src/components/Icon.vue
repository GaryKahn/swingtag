<script setup lang="ts">
// Minimal stroke icon set (24px grid)
const paths: Record<string, string> = {
  shirt: 'M8 3 4 5.5 2.5 10l3 1.2V21h13v-9.8l3-1.2L20 5.5 16 3c-.5 1.6-2 2.6-4 2.6S8.5 4.6 8 3Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  spool: 'M6 3h12M6 21h12M8 3v18M16 3v18M8 8h8M8 12h8M8 16h8',
  sheet: 'M6 2h9l5 5v15H6V2Zm9 0v5h5M9 12h8M9 16h8M9 8h3',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  plussquare: 'M4 4h16v16H4V4Zm8 4v8m-4-4h8',
  dots: 'M12 4.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm0 6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm0 6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  installpc: 'M3 4h18v12H3V4Zm5 16h8M12 7v6m0 0-3-3m3 3 3-3',
  phone: 'M7 2h10v20H7V2Zm4 17h2',
  laptop: 'M4 5h16v11H4V5Zm-2 14h20',
  dock: 'M3 15h18v5H3v-5Zm4 2.5h2m2 0h2m2 0h2M9 4h6v8H9V4Z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.4-11.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6m0 3.2h.01',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Zm4 5h6M9 12h6M9 16h3',
  table: 'M3 4h18v16H3V4Zm0 5h18M3 14h18M9 4v16',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  back: 'M15 18l-6-6 6-6',
  copy: 'M8 8h12v12H8V8Zm-4 8V4h12',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3V8Zm9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v4h16v-4',
  upload: 'M12 21V9m0 0-4 4m4-4 4 4M4 7V3h16v4',
  share: 'M12 3v13m0-13-4 4m4-4 4 4M5 11v10h14V11',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  x: 'M6 6l12 12M18 6 6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
  check: 'M5 12l5 5 9-10',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeoff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6',
  warn: 'M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4m-4 5a8 8 0 0 0 14.9 3M20 20v-4h-4',
}
defineProps<{ name: string; size?: number }>()
</script>

<template>
  <svg :width="size ?? 20" :height="size ?? 20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name]" />
  </svg>
</template>
