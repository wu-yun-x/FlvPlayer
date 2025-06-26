<!--
 * @Author: st004362
 * @Date: 2025-06-19 17:55:30
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-20 15:40:23
 * @Description: 点播（录播）播放器UI组件，将FlvPlayer中的PlayerUI移植到Vue组件
-->
<template>
  <div
    class="flv-player-ui-container"
    v-if="enabled"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- 中心播放/暂停指示器 -->
    <div class="flv-player-center-indicator" v-if="showCenterIndicator">
      <div v-if="loading" class="loading-indicator">
        <div class="loading-spinner"></div>
      </div>
      <div v-else-if="!isPlaying" class="pause-indicator" @click="togglePlay">
        <div class="play-icon">▶</div>
      </div>
    </div>

    <!-- 控制栏 -->
    <div
      class="flv-player-controlbar"
      :class="{ 'show-controls': showControls }"
    >
      <!-- 左侧区域：播放/暂停、时间 -->
      <div class="flv-player-left">
        <button
          class="flv-player-play"
          :title="
            isPlaying ? t('player.controls.pause') : t('player.controls.play')
          "
          @click="togglePlay"
        >
          <span v-if="isPlaying">⏸</span>
          <span v-else>▶</span>
        </button>
        <span class="flv-player-time"
          >{{ currentTimeFormatted }} / {{ durationFormatted }}</span
        >
      </div>

      <!-- 中间区域：进度条 -->
      <div class="flv-player-center">
        <div class="progress-container">
          <div class="progress-track" @click="onProgressBarClick">
            <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
          </div>
          <input
            type="range"
            class="flv-player-progress"
            min="0"
            max="100"
            step="0.1"
            :value="progress"
            @input="onProgressChange"
          />
        </div>
      </div>

      <!-- 右侧区域：倍速、音量、全屏 -->
      <div class="flv-player-right">
        <select class="flv-player-speed" @change="onSpeedChange">
          <option
            v-for="rate in playbackRates"
            :key="rate"
            :value="rate"
            :selected="rate === 1"
          >
            {{ rate }}x
          </option>
        </select>
        <div class="volume-control">
          <input
            type="range"
            class="flv-player-volume"
            min="0"
            max="100"
            :value="volume"
            @input="onVolumeChange"
            :title="t('player.controls.volume')"
          />
        </div>
        <button
          class="flv-player-fullscreen"
          :title="t('player.controls.fullscreen')"
          @click="toggleFullscreen"
        >
          <span>⛶</span>
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div class="flv-player-error" v-if="hasError">
      <div class="error-message">
        {{ errorMessage || t("player.errors.playError") }}
      </div>
      <button class="error-retry" @click="$emit('retry')">
        {{ t("player.errors.retry") }}
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  video: {
    type: Object,
    required: true,
  },
  playerState: {
    type: String,
    default: "uninitialized",
  },
  volume: {
    type: Number,
    default: 100,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  debug: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "play",
  "pause",
  "volumeChange",
  "seek",
  "speedChange",
  "fullscreen",
  "retry",
]);

// 状态
const currentTime = ref(0);
const duration = ref(0);
const progress = ref(0);
const isPlaying = ref(false);
const loading = ref(false);
const hasError = ref(false);
const errorMessage = ref("");
let updateTimer = null;

// UI控制
const showControls = ref(true);
const showCenterIndicator = ref(true);
const controlsTimeout = ref(null);

// 鼠标事件处理
const handleMouseMove = () => {
  showControls.value = true;

  // 清除之前的计时器
  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value);
  }

  // 仅当视频正在播放时，设置自动隐藏
  if (isPlaying.value) {
    controlsTimeout.value = setTimeout(() => {
      showControls.value = false;
    }, 3000);
  }
};

const handleMouseLeave = () => {
  // 鼠标离开时，如果在播放状态，则隐藏控制栏
  if (isPlaying.value) {
    showControls.value = false;
  }
};

// 倍速选项
const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

// 格式化时间
const formatTime = (seconds) => {
  if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

// 计算属性
const currentTimeFormatted = computed(() => formatTime(currentTime.value));
const durationFormatted = computed(() => formatTime(duration.value));

// 更新进度
const updateVideoProgress = () => {
  if (!props.video) return;

  try {
    // 使用安全访问方法获取视频时间
    const safeGetTime = (propName) => {
      try {
        const value = props.video[propName];
        return !isNaN(value) && isFinite(value) ? value : 0;
      } catch (e) {
        return 0;
      }
    };

    // 更新当前播放时间
    const videoCurrentTime = safeGetTime("currentTime");
    if (videoCurrentTime > 0 || currentTime.value !== videoCurrentTime) {
      currentTime.value = videoCurrentTime;
    }

    // 更新视频总时长
    const videoDuration = safeGetTime("duration");
    if (videoDuration > 0) {
      duration.value = videoDuration;
    }

    // 计算进度
    if (duration.value > 0) {
      progress.value = (currentTime.value / duration.value) * 100;
    }

    // 检查播放状态
    const isPaused =
      props.video.paused === undefined ? true : props.video.paused;
    isPlaying.value = !isPaused;

    // 调试信息
    if (props.debug && videoDuration > 0) {
      console.log(
        `视频进度: ${videoCurrentTime}/${videoDuration} (${progress.value.toFixed(
          1
        )}%)`
      );
    }
  } catch (err) {
    console.warn("更新视频信息时出错:", err);
  }
};

// 进度条点击事件
const onProgressBarClick = (event) => {
  const progressBar = event.currentTarget;
  const rect = progressBar.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const percent = (offsetX / rect.width) * 100;

  if (duration.value > 0) {
    const seekTime = (percent * duration.value) / 100;
    emit("seek", seekTime);
  }
};

// 事件处理
const togglePlay = () => {
  if (isPlaying.value) {
    emit("pause");
  } else {
    emit("play");
  }
};

const onProgressChange = (e) => {
  if (!props.video || !duration.value) return;

  const percent = parseFloat(e.target.value);
  const seekTime = (percent / 100) * duration.value;
  emit("seek", seekTime);
};

const onVolumeChange = (e) => {
  const volumeValue = parseInt(e.target.value);
  emit("volumeChange", volumeValue);
};

const onSpeedChange = (e) => {
  const rate = parseFloat(e.target.value);
  emit("speedChange", rate);
};

const toggleFullscreen = () => {
  emit("fullscreen");
};

// 开始视频进度更新定时器
const startProgressTimer = () => {
  stopProgressTimer();

  // 使用更高频率的更新，提升进度条流畅度
  updateTimer = setInterval(() => {
    updateVideoProgress();
  }, 200); // 从300ms调整为200ms，更新更频繁

  // 立即更新一次
  nextTick(() => {
    updateVideoProgress();
  });
};

// 停止视频进度更新定时器
const stopProgressTimer = () => {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
};

// 监听播放器状态变化
watch(
  () => props.playerState,
  (newState) => {
    switch (newState) {
      case "loading":
        loading.value = true;
        hasError.value = false;
        showCenterIndicator.value = true;
        break;
      case "playing":
        loading.value = false;
        hasError.value = false;
        isPlaying.value = true;
        showCenterIndicator.value = false;
        // 只有在没有显示控制栏时添加自动隐藏
        if (showControls.value) {
          controlsTimeout.value = setTimeout(() => {
            showControls.value = false;
          }, 3000);
        }
        break;
      case "paused":
        loading.value = false;
        hasError.value = false;
        isPlaying.value = false;
        showCenterIndicator.value = true;
        showControls.value = true;
        break;
      case "ended":
        loading.value = false;
        hasError.value = false;
        isPlaying.value = false;
        showCenterIndicator.value = true;
        showControls.value = true;
        break;
      case "error":
        loading.value = false;
        hasError.value = true;
        isPlaying.value = false;
        showCenterIndicator.value = false;
        break;
      case "destroyed":
        loading.value = false;
        hasError.value = false;
        isPlaying.value = false;
        showCenterIndicator.value = false;
        break;
      default:
        loading.value = false;
        hasError.value = false;
        break;
    }
  }
);

// 监听视频对象
watch(
  () => props.video,
  (newVideo, oldVideo) => {
    if (newVideo) {
      // 当视频对象变化时，重置计时器
      stopProgressTimer();

      // 重置状态
      currentTime.value = 0;
      progress.value = 0;

      // 检查视频是否已经有时长信息
      if (newVideo.duration && !isNaN(newVideo.duration)) {
        duration.value = newVideo.duration;
      } else {
        // 监听durationchange事件获取视频时长
        const onDurationChange = () => {
          if (newVideo.duration && !isNaN(newVideo.duration)) {
            duration.value = newVideo.duration;
            newVideo.removeEventListener("durationchange", onDurationChange);
          }
        };
        newVideo.addEventListener("durationchange", onDurationChange);
      }

      // 启动进度更新
      startProgressTimer();
    } else {
      stopProgressTimer();
    }
  },
  { immediate: true }
);

onMounted(() => {
  startProgressTimer();
  showControls.value = true;
});

onBeforeUnmount(() => {
  stopProgressTimer();

  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value);
  }
});
</script>

<style scoped>
.flv-player-ui-container {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 53px;
  z-index: 10;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial,
    sans-serif;
  user-select: none;
  -webkit-user-select: none;
}

.flv-player-controlbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6));
  padding: 10px 15px;
  pointer-events: auto;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.flv-player-controlbar.show-controls {
  opacity: 1;
}

.flv-player-center-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
  z-index: 15;
}

.pause-indicator {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.pause-indicator:hover {
  transform: scale(1.1);
  background: rgba(0, 0, 0, 0.8);
}

.play-icon {
  font-size: 28px;
  color: white;
  line-height: 1;
  margin-left: 5px;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
}

.flv-player-left,
.flv-player-center,
.flv-player-right {
  display: flex;
  align-items: center;
}

.flv-player-center {
  flex: 1;
  padding: 0 15px;
}

.flv-player-left,
.flv-player-right {
  min-width: 120px;
}

.flv-player-play,
.flv-player-fullscreen {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  margin: 0 8px;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.flv-player-play:hover,
.flv-player-fullscreen:hover {
  background: rgba(255, 255, 255, 0.15);
}

.flv-player-time {
  color: #fff;
  font-size: 14px;
  margin-left: 10px;
  min-width: 80px;
  text-align: center;
}

.progress-container {
  width: 100%;
  height: 16px;
  position: relative;
  display: flex;
  align-items: center;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: absolute;
  cursor: pointer;
  z-index: 1;
}

.progress-bar {
  height: 100%;
  background: #1890ff;
  border-radius: 2px;
  position: absolute;
  left: 0;
  top: 0;
  transition: width 0.1s ease;
}

.flv-player-progress {
  width: 100%;
  height: 16px;
  position: relative;
  z-index: 2;
  opacity: 0;
  cursor: pointer;
}

.volume-control {
  position: relative;
  width: 80px;
  margin: 0 10px;
}

.flv-player-volume {
  width: 100%;
  height: 16px;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  position: relative;
}

.flv-player-volume::-webkit-slider-runnable-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.flv-player-volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  margin-top: -4px;
  position: relative;
}

.flv-player-volume::-moz-range-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.flv-player-volume::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: none;
}

.flv-player-speed {
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  padding: 3px 5px;
  cursor: pointer;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.flv-player-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  pointer-events: auto;
  z-index: 20;
}

.error-message {
  font-size: 16px;
  margin-bottom: 20px;
  text-align: center;
}

.error-retry {
  background: #1890ff;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.error-retry:hover {
  background: #40a9ff;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .flv-player-center {
    padding: 0 10px;
  }

  .flv-player-time {
    min-width: 60px;
    font-size: 12px;
  }

  .flv-player-right,
  .flv-player-left {
    min-width: 100px;
  }
}
</style>
