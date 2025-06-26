<!--
 * @Author: st004362
 * @Date: 2025-06-16 15:47:25
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-23 10:14:30
 * @Description: 统一播放器组件
-->
<template>
  <div class="player-container">
    <!-- 播放器挂载点 - 完全空的容器，由播放器实例控制 -->
    <div class="player-mount" ref="playerContainer"></div>

    <!-- 播放器UI - 仅在点播模式下显示 -->
    <PlayerUI
      v-if="currentMode === 'vod' && showPlayerUI"
      :video="getVideoElement()"
      :player-state="playerState"
      :volume="volume"
      :enabled="showUI"
      :debug="debug"
      @play="$emit('toggle-play')"
      @pause="$emit('toggle-play')"
      @volumeChange="$emit('set-volume', $event)"
      @seek="$emit('seek', $event)"
      @speedChange="$emit('speed-change', $event)"
      @fullscreen="toggleFullscreen"
      @retry="$emit('load-player')"
    />

    <!-- 控制面板 -->
    <div class="player-ui">
      <div class="player-controls">
        <div>
          <button @click="handleLoadPlayer" :disabled="loading">
            {{ t("ui.common.initialize") }}
          </button>
          <button @click="$emit('toggle-play')" :disabled="!playerReady">
            {{ isPlaying ? t("ui.common.paused") : t("ui.common.play") }}
          </button>
          <button @click="handleDestroyPlayer" :disabled="!playerReady">
            {{ t("ui.common.destroy") }}
          </button>
        </div>
        <div class="url-input">
          <label>{{
            currentMode === "live"
              ? t("ui.common.LiveStreamingAddress")
              : t("ui.common.PlaybackAddress")
          }}</label>
          <input
            type="text"
            :value="url"
            :placeholder="t('ui.common.PlaybackAddressPlaceholder')"
            class="url-field"
            @input="$emit('url-change', $event.target.value)"
          />
        </div>
        <div>
          <span class="status-indicator" :class="getStatusClass()"></span>
          <span>{{ getStateText() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  defineProps,
  defineEmits,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { useI18n } from "vue-i18n";
import { PLAYER_STATES } from "flv-player";
import PlayerUI from "./PlayerUI.vue";

const { t } = useI18n();

const props = defineProps({
  currentMode: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  playerReady: {
    type: Boolean,
    default: false,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  volume: {
    type: Number,
    default: 80,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  player: {
    type: Object,
    default: null,
  },
  playerState: {
    type: String,
    default: "uninitialized",
  },
  autoplay: {
    type: Boolean,
    default: false,
  },
  showUI: {
    type: Boolean,
    default: true,
  },
  debug: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "toggle-play",
  "set-volume",
  "load-player",
  "destroy-player",
  "url-change",
  "seek",
  "speed-change",
]);

const playerContainer = ref(null);
let isProcessing = false; // 防止重复点击

// 是否显示播放器UI
const showPlayerUI = computed(() => {
  return props.playerReady && !!getVideoElement();
});

// 获取视频元素
const getVideoElement = () => {
  if (props.player && props.player.videoElement) {
    return props.player.videoElement;
  }
  return null;
};

// 处理加载播放器按钮点击
const handleLoadPlayer = async () => {
  if (isProcessing) return; // 如果正在处理，忽略点击
  isProcessing = true;

  // 在加载前清理容器内的所有视频元素
  cleanupVideoElements();

  emit("load-player");

  // 1秒后重置状态，防止快速重复点击
  setTimeout(() => {
    isProcessing = false;
  }, 1000);
};

// 处理销毁播放器
const handleDestroyPlayer = async () => {
  if (isProcessing) return;
  isProcessing = true;

  emit("destroy-player");

  // 确保销毁后清理DOM
  setTimeout(() => cleanupVideoElements(), 300);

  // 防止重复点击
  setTimeout(() => {
    isProcessing = false;
  }, 1000);
};

// 清理容器中的所有视频元素
const cleanupVideoElements = () => {
  if (!playerContainer.value) return;

  // 查找所有视频元素
  const videos = playerContainer.value.querySelectorAll("video");

  // 记录找到的视频数量
  if (videos.length > 0 && props.debug) {
    console.log(`清理视频容器: 发现 ${videos.length} 个视频元素`);
  }

  videos.forEach((video) => {
    try {
      // 暂停播放
      video.pause();

      // 移除事件监听器
      const clonedVideo = video.cloneNode(false);

      // 移除src属性并调用load以释放资源
      video.removeAttribute("src");
      video.load();

      // 从DOM中移除
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    } catch (e) {
      console.warn("清理视频元素失败:", e);
    }
  });

  // 使用更彻底的方式清理容器
  if (playerContainer.value) {
    // 保留容器但清空内容
    playerContainer.value.innerHTML = "";
  }
};

// 全屏切换
const toggleFullscreen = () => {
  const el = playerContainer.value;
  if (!el) return;

  if (document.fullscreenElement) {
    document.exitFullscreen().catch((err) => {
      console.error(`退出全屏失败: ${err.message}`);
    });
  } else {
    el.requestFullscreen().catch((err) => {
      console.error(`进入全屏失败: ${err.message}`);
    });
  }
};

// 播放器状态变化或URL变化时清理
watch(
  () => props.playerState,
  (newState, oldState) => {
    if (newState === "uninitialized" && oldState !== "uninitialized") {
      // 回到未初始化状态时清理容器
      setTimeout(() => cleanupVideoElements(), 100);
    }
  }
);

// 当URL变化时也检查清理
watch(
  () => props.url,
  () => {
    // URL改变时，可能需要清理容器
    if (!props.player) {
      setTimeout(() => cleanupVideoElements(), 100);
    }
  }
);

// 组件挂载和卸载时清理
onMounted(() => {
  cleanupVideoElements();
});

onBeforeUnmount(() => {
  cleanupVideoElements();
});

// 获取状态文本
const getStateText = () => {
  switch (props.playerState) {
    case PLAYER_STATES.LOADING:
      return t("ui.common.loading");
    case PLAYER_STATES.READY:
      return t("ui.common.states.ready");
    case PLAYER_STATES.PLAYING:
      return t("ui.common.states.playing");
    case PLAYER_STATES.PAUSED:
      return t("ui.common.states.paused");
    case PLAYER_STATES.ENDED:
      return t("ui.common.states.ended");
    case PLAYER_STATES.ERROR:
      return t("ui.common.states.error");
    default:
      return t("ui.common.states.uninitialized");
  }
};

// 获取状态CSS类
const getStatusClass = () => {
  switch (props.playerState) {
    case PLAYER_STATES.READY:
    case PLAYER_STATES.PLAYING:
      return "status-connected";
    case PLAYER_STATES.LOADING:
      return "status-connecting";
    case PLAYER_STATES.ERROR:
    default:
      return "status-disconnected";
  }
};

// 暴露方法给父组件
defineExpose({
  getPlayerContainer: () => playerContainer.value,
  getVideoElement,
  cleanupVideoElements,
});
</script>

<style scoped lang="less">
.player-container {
  width: 100%;
  height: 60%;
  background: #000;
  position: relative;
  border-radius: 4px;
}

.player-mount {
  width: 100%;
  aspect-ratio: 20 / 9.1;
  background: #000;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.player-ui {
  padding: 10px;
  background: #111;
}

.player-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.player-controls button {
  padding: 8px 16px;
  background: #1890ff;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  margin: 0 10px;
}

.player-controls button:disabled {
  background: #333;
  cursor: not-allowed;
}

.url-input {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1;
}

.url-field {
  flex-grow: 1;
  max-width: 400px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  padding: 5px;
}

.status-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-connected {
  background-color: #4caf50;
}

.status-connecting {
  background-color: #ffc107;
}

.status-disconnected {
  background-color: #f44336;
}
</style>
