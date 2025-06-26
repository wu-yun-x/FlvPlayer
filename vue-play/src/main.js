/*
 * @Author: st004362
 * @Date: 2025-06-13 14:40:50
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-20 11:46:28
 * @Description: 应用程序入口文件
 */
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import i18n from './locales'
import cleanPlayer from './directives/v-clean-player'

const app = createApp(App)
app.use(router)
app.use(i18n)
app.directive('clean-player', cleanPlayer)
app.mount('#app')

