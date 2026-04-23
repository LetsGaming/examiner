import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'
import router from './router/index.js'

import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import './theme/variables.css'

// ─── Global styles & design tokens ───────────────────────────────────────────
// Must be imported AFTER Ionic CSS so our tokens override Ionic's defaults.
// This makes --bg-base, --text-primary etc. available in every component's
// <style scoped> block without needing explicit @import statements.
import './styles/global.css'

const app = createApp(App)
app.use(IonicVue)
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
})
