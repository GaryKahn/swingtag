<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'
import InstallGuide from '../components/InstallGuide.vue'
import { GUIDES, type Figure } from '../help/guides'

const route = useRoute()
const router = useRouter()

// Hash routing owns the URL fragment, so sections are addressed with ?s=<id>
async function scrollToSection() {
  const id = route.query.s
  if (typeof id !== 'string') return
  await nextTick()
  const el = document.getElementById(`guide-${id}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // Screenshots above the target can still be loading and push it down; settle once they have.
  const above = [...document.querySelectorAll<HTMLImageElement>('article img')].filter((img) => img.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
  await Promise.all(above.map((img) => img.decode().catch(() => {})))
  el.scrollIntoView({ block: 'start' })
}
onMounted(scrollToSection)
watch(() => route.query.s, scrollToSection)

const figClass = (f: Figure) =>
  ({
    phone: 'w-[min(16rem,70vw)] rounded-[1.4rem] border-4 border-ink shadow-md',
    doc: 'w-[min(22rem,85vw)] rounded-sm border border-stone-200 shadow-md',
    wide: 'w-full max-w-3xl rounded-lg border border-stone-200 shadow-md',
    card: 'w-[min(20rem,85vw)] rounded-xl border border-stone-200 shadow-sm',
  })[f.kind ?? 'phone']
</script>

<template>
  <PageHeader title="Help & guides" subtitle="How to cost, price, sell and invoice with Swingtag." />

  <nav class="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Guides">
    <button v-for="(g, i) in GUIDES" :key="g.id" class="card flex gap-3 p-3 text-left hover:border-stone-400" @click="router.replace({ query: { s: g.id } })">
      <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-white">{{ i + 1 }}</span>
      <span>
        <span class="block font-medium">{{ g.title }}</span>
        <span class="block text-xs text-stone-500">{{ g.summary }}</span>
      </span>
    </button>
  </nav>

  <article v-for="(g, i) in GUIDES" :id="`guide-${g.id}`" :key="g.id" class="mb-12 scroll-mt-4 border-t border-stone-200 pt-6">
    <div class="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Guide {{ i + 1 }}</div>
    <h2 class="font-serif text-2xl">{{ g.title }}</h2>
    <p v-if="g.intro" class="mt-2 max-w-2xl text-stone-600">{{ g.intro }}</p>

    <ol v-if="g.steps" class="mt-4 max-w-2xl space-y-3">
      <li v-for="(s, j) in g.steps" :key="j" class="flex gap-3">
        <span class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-stone-300 text-xs tabular-nums text-stone-600">{{ j + 1 }}</span>
        <span class="leading-relaxed">{{ s }}</span>
      </li>
    </ol>

    <div v-if="g.tips" class="mt-4 max-w-2xl space-y-2">
      <p v-for="(t, j) in g.tips" :key="j" class="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700"><span class="font-medium">Tip:</span> {{ t }}</p>
    </div>

    <InstallGuide v-if="g.widget === 'install'" />

    <div v-if="g.figures.length" class="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-3 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      <figure v-for="f in g.figures" :key="f.src" class="shrink-0 snap-center">
        <a :href="f.src" target="_blank" rel="noopener" :title="`Open full size: ${f.alt}`">
          <img :src="f.src" :alt="f.alt" decoding="async" class="block bg-white" :class="figClass(f)" />
        </a>
        <figcaption v-if="f.caption" class="mt-2 text-center text-xs text-stone-500">{{ f.caption }}</figcaption>
      </figure>
    </div>
  </article>

  <p class="flex items-center gap-2 text-sm text-stone-500"><Icon name="check" :size="16" /> Screenshots use made-up demo data.</p>
</template>
