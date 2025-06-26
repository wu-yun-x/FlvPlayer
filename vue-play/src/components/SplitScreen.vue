<!--
 * @Author: st004362
 * @Date: 2025-06-16 09:22:20
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-20 16:34:45
 * @Description: 
-->
<template>
  <div class="split-screen" :class="layoutClass">
    <div
      v-for="(screen, index) in screens"
      :key="index"
      class="screen"
      :class="{
        active: activeScreen === index,
        [getZoomClass(index)]: true,
      }"
      @click="handleScreenClick(index)"
      @dblclick="handleScreenDoubleClick(index)"
    >
      <slot :name="'screen-' + index">
        <div class="screen-content">
          <video
            v-if="screen.videoUrl"
            :src="screen.videoUrl"
            controls
            class="video-player"
          ></video>
          <div v-else class="placeholder">暂无视频源</div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useScreenZoom } from "../hooks/useScreenZoom";

const props = defineProps({
  layout: {
    type: String,
    default: "1x1",
    validator: (value) => ["1x1", "2x2", "3x3"].includes(value),
  },
  screens: {
    type: Array,
    default: () => Array(9).fill({ videoUrl: "" }),
  },
});

const emit = defineEmits(["screen-click", "layout-change"]);

const activeScreen = ref(null);

// 使用自定义钩子
const {
  zoomedScreenIndex,
  isScreenZoomed,
  handleScreenDoubleClick: handleZoom,
  getZoomClass,
} = useScreenZoom();

const layoutClass = computed(() => {
  switch (props.layout) {
    case "1x1":
      return "layout-1x1";
    case "2x2":
      return "layout-2x2";
    case "3x3":
      return "layout-3x3";
    default:
      return "layout-1x1";
  }
});

// 处理单击事件
const handleScreenClick = (index) => {
  activeScreen.value = index;
  emit("screen-click", index);
};

// 在1x1模式下不需要双击事件
const handleScreenDoubleClick = (index) => {
  // 只在4屏或6屏模式下处理双击事件
  if (props.layout === "1x1") return;

  // 调用钩子的处理函数
  const originalLayout = handleZoom(index, props.layout);

  // 通知父组件，如有必要
  if (isScreenZoomed.value) {
    emit("layout-change", { zoomed: true, screenIndex: index, originalLayout });
  } else {
    emit("layout-change", { zoomed: false, originalLayout });
  }
};

// 当布局变更时，重置缩放状态
watch(
  () => props.layout,
  (newLayout) => {
    if (zoomedScreenIndex.value !== null && newLayout !== props.layout) {
      zoomedScreenIndex.value = null;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.split-screen {
  display: grid;
  gap: 4px;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  padding: 4px;
  box-sizing: border-box;
  position: relative; /* 确保子元素的绝对定位能够基于此容器 */
  min-height: 400px; /* 设置最小高度防止过小 */
  max-height: calc(100vh - 156px); /* 防止超出视口 */
}

/* 全屏模式下覆盖最大高度限制 */
:fullscreen .split-screen {
  max-height: 100vh;
  min-height: 100vh;
  padding: 8px;
}

/* 兼容不同浏览器的全屏选择器 */
:-webkit-full-screen .split-screen {
  max-height: 100vh;
  min-height: 100vh;
  padding: 8px;
}

:-moz-full-screen .split-screen {
  max-height: 100vh;
  min-height: 100vh;
  padding: 8px;
}

.layout-1x1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.layout-2x2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.layout-3x3 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.layout-3x3 .screen:first-child {
  grid-column: span 2;
  grid-row: span 2;
}

.layout-3x3 .screen:nth-child(n + 7) {
  display: none;
}

.screen {
  position: relative;
  background: #2a2a2a;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
  width: 100%;
  /* 使用 aspect-ratio 属性来维持宽高比 */
  aspect-ratio: 16 / 9;
  min-height: 200px; /* 防止在小屏幕上过小 */
  max-height: 100%; /* 防止超出容器 */
}

.screen.active {
  border-color: #1890ff;
  box-shadow: 0 0 10px rgba(24, 144, 255, 0.5);
}

/* 添加缩放相关样式 */
.screen.screen-zoomed {
  grid-column: 1 / -1 !important; /* 强制覆盖所有列 */
  grid-row: 1 / -1 !important; /* 强制覆盖所有行 */
  z-index: 10;
  transform: scale(1);
  transition: all 0.3s ease;
  position: absolute; /* 使用绝对定位覆盖整个容器 */
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  /* 缩放时取消aspect-ratio限制 */
  aspect-ratio: unset;
  min-height: unset;
  max-height: unset;
}

/* 特殊针对已经是放大状态的第一个屏幕(首屏) */
.screen.screen-zoomed-first {
  z-index: 20; /* 使用更高的z-index确保在最上层 */
}

/* 隐藏其他屏幕 */
.screen.screen-hidden {
  opacity: 0;
  transform: scale(0.5);
  pointer-events: none;
  z-index: 1;
  transition: all 0.3s ease;
}

.screen-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* 防止内容溢出 */
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 改为contain以保持视频比例 */
}

.placeholder {
  color: #666;
  font-size: 14px;
}
</style>
