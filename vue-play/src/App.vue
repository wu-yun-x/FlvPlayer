<!--
 * @Author: st004362
 * @Date: 2025-06-13 14:40:50
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-19 18:35:30
 * @Description: 应用程序根组件
-->
<script setup>
import LanguageSwitcher from "./components/LanguageSwitcher.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/real-time" class="nav-link">{{
        t("ui.nav.realTime")
      }}</router-link>
      <router-link to="/playback" class="nav-link">{{
        t("ui.nav.playback")
      }}</router-link>
      <router-link to="/examples" class="nav-link">{{
        t("ui.nav.examples")
      }}</router-link>

      <LanguageSwitcher />
    </nav>
    <router-view></router-view>
  </div>
</template>

<style>
.app {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.nav {
  background: #1f1f1f;
  padding: 16px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.nav-link {
  color: #fff;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: #2a2a2a;
}

.router-link-active {
  background: #1890ff;
}

.router-link-active:hover {
  background: #40a9ff;
}
</style>
