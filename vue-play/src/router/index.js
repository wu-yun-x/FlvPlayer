/*
 * @Author: st004362
 * @Date: 2025-06-13 17:53:11
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-16 11:45:02
 * @Description: 路由切换
 */

import { createRouter, createWebHistory } from 'vue-router'
import RealTimeVideo from '../views/RealTimeVideo.vue'
import VideoPlayback from '../views/VideoPlayback.vue'
import ExamplePage from '../views/ExamplePage.vue'

const routes = [
    {
        path: '/',
        redirect: '/real-time'
    },
    {
        path: '/real-time',
        name: 'RealTimeVideo',
        component: RealTimeVideo
    },
    {
        path: '/playback',
        name: 'VideoPlayback',
        component: VideoPlayback
    },
    {
        path: '/examples',
        name: 'Examples',
        component: ExamplePage
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router