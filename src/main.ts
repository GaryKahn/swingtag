import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { db } from './db/schema'
import { seed } from './db/seed'
import './style.css'

seed(db).finally(() => createApp(App).use(router).mount('#app'))
