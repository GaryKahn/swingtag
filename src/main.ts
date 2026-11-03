import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { db } from './db/schema'
import { seed } from './db/seed'
import { listenForInstall } from './lib/install'
import './style.css'

listenForInstall()

seed(db).finally(() => createApp(App).use(router).mount('#app'))
