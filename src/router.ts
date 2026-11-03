import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', redirect: '/styles' },
    { path: '/styles', component: () => import('./views/StylesView.vue') },
    { path: '/styles/:id', component: () => import('./views/StyleEditor.vue'), props: true },
    { path: '/templates', component: () => import('./views/TemplatesView.vue') },
    { path: '/templates/:id', component: () => import('./views/TemplateEditor.vue'), props: true },
    { path: '/components', component: () => import('./views/ComponentsView.vue') },
    { path: '/linesheets', component: () => import('./views/LineSheetsView.vue') },
    { path: '/linesheets/:id', component: () => import('./views/LineSheetEditor.vue'), props: true },
    { path: '/settings', component: () => import('./views/SettingsView.vue') },
  ],
})
