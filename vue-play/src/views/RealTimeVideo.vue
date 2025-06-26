<!--
 * @Author: st004362
 * @Date: 2025-06-16 09:22:41
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-19 16:18:12
 * @Description: 实时视频
-->
<template>
  <div class="multi-screen-view">
    <div class="player-container">
      <MultiScreenPlayer />
    </div>
  </div>
</template>

<script setup>
import MultiScreenPlayer from "../components/MultiScreenPlayer.vue";
</script>

<style scoped lang="less">
.multi-screen-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #121212;
  color: white;
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background-color: #1e1e1e;
    border-bottom: 1px solid #333;
  }

  .player-container {
    flex-grow: 1;
    position: relative;
  }
}
</style>
