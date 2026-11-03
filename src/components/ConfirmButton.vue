<script setup lang="ts">
import { ref } from 'vue'
// Two-tap confirm instead of a blocking browser dialog.
defineProps<{ label: string; confirmLabel?: string }>()
const emit = defineEmits<{ confirm: [] }>()
const armed = ref(false)
let t: ReturnType<typeof setTimeout>
function click() {
  if (armed.value) {
    clearTimeout(t)
    armed.value = false
    emit('confirm')
  } else {
    armed.value = true
    t = setTimeout(() => (armed.value = false), 3000)
  }
}
</script>

<template>
  <button class="btn-danger" :class="{ '!bg-red-700 !text-white': armed }" @click="click">{{ armed ? (confirmLabel ?? 'Tap again to confirm') : label }}</button>
</template>
