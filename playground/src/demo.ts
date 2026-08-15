import { createApp } from 'vue'
import Demo from './Demo.vue'
import './style.css'

if (new URLSearchParams(location.search).has('bare')) {
  document.documentElement.classList.add('bare')
}

createApp(Demo).mount('#app')
