<script setup lang="ts">
import Icon from './Icon.vue'
defineProps<{ title: string; back?: string; subtitle?: string; help?: string }>()
</script>

<template>
  <header class="mb-5 flex items-start gap-2">
    <RouterLink v-if="back" :to="back" class="btn-ghost -ml-3 mt-0.5 px-2" aria-label="Back"><Icon name="back" /></RouterLink>
    <div class="min-w-0 flex-1">
      <h1 class="h1 truncate">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-stone-500">{{ subtitle }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <slot />
      <RouterLink v-if="help" :to="{ path: '/help', query: { s: help } }" class="btn-ghost px-2" :aria-label="`Help: ${title}`" title="Help"><Icon name="help" :size="22" /></RouterLink>
    </div>
  </header>
</template>
