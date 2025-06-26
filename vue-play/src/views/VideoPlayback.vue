<!--
 * @Author: st004362
 * @Date: 2025-06-16 09:23:04
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-23 09:39:44
 * @Description: 录像回放
-->
<template>
  <div class="video-playback-page">
    <div class="player-container-wrapper">
      <!-- 播放器组件 -->
      <PlayerComponent
        ref="playerComponentRef"
        :current-mode="'vod'"
        :url="url"
        :player-ready="playerReady"
        :is-playing="isPlaying"
        :volume="volume"
        :loading="loading"
        :player-state="playerState"
        :showUI="true"
        :autoplay="options.autoplay"
        :player="player"
        :debug="options.debug"
        @toggle-play="togglePlay"
        @set-volume="setVolume"
        @load-player="loadPlayer"
        @destroy-player="destroyPlayer"
        @url-change="updateUrl"
        @seek="handleSeek"
        @speed-change="handleSpeedChange"
      />

      <!-- 控制面板组件 -->
      <div class="control-panel">
        <h2>{{ t("ui.videoPlayback.controls") }}</h2>
        <div class="playback-options">
          <div class="option-row">
            <label>{{ t("ui.videoPlayback.autoplay") }}:</label>
            <input
              type="checkbox"
              v-model="options.autoplay"
              @change="updateOptions({ autoplay: options.autoplay })"
            />
          </div>

          <div class="option-row">
            <label>{{ t("ui.videoPlayback.bufferSize") }}:</label>
            <input
              type="number"
              v-model="options.bufferSize"
              min="0.5"
              max="10"
              step="0.5"
              @change="updateOptions({ bufferSize: options.bufferSize })"
            />
          </div>

          <div class="hardware-accel">
            <h3>{{ t("ui.videoPlayback.hwAccel.title") }}</h3>
            <div class="option-row">
              <label>
                <input
                  type="checkbox"
                  v-model="options.hwAccel"
                  @change="updateOptions({ hwAccel: options.hwAccel })"
                />
                {{ t("ui.videoPlayback.hwAccel.enable") }}
              </label>
            </div>
            <div class="option-row">
              <label>
                <input
                  type="checkbox"
                  v-model="options.allowSoftwareRendering"
                  @change="
                    updateOptions({
                      allowSoftwareRendering: options.allowSoftwareRendering,
                    })
                  "
                />
                {{ t("ui.videoPlayback.hwAccel.allowSoftware") }}
              </label>
            </div>
          </div>

          <div class="video-list">
            <h3>{{ t("ui.videoPlayback.presetVideos.title") }}</h3>
            <div
              class="video-item"
              v-for="(video, index) in videoList"
              :key="index"
              :class="{ active: url === video.url }"
              @click="selectVideo(video.url)"
            >
              <div class="video-info">
                <span class="video-name">{{ video.name }}</span>
                <span class="video-type">({{ getVideoType(video.url) }})</span>
                <span class="video-duration">{{ video.duration }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import Player, {
  PLAYER_STATES,
  PLAYER_EVENTS,
  PLAY_MODES,
} from "../../../FlvPlayer/src/index.js";

// 导入子组件
import PlayerComponent from "../components/player/PlayerComponent.vue";

const { t } = useI18n();

// 组件引用
const playerComponentRef = ref(null);

// 状态变量
const player = ref(null);
const playerReady = ref(false);
const isPlaying = ref(false);
const playerState = ref("uninitialized");
const loading = ref(false);
const volume = ref(80);

// 简化播放器状态 - 移除不必要的状态跟踪
const cleanupInProgress = ref(false);

// 视频列表 - 更新测试URL
const videoList = computed(() => [
  {
    name: t("ui.videoPlayback.presetVideos.video1.name"),
    url: "https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-360p.flv",
    duration: "01:30",
  },
  {
    name: t("ui.videoPlayback.presetVideos.video2.name"),
    url: "https://media.w3.org/2010/05/sintel/trailer.mp4",
    duration: "00:52",
  },
]);

// 配置选项
const url = ref("");
const options = ref({
  // 点播特有选项
  autoplay: false,
  bufferSize: 1.0,
  // 硬件加速
  hwAccel: true,
  allowSoftwareRendering: false,
  // 其他选项
  debug: false,
});

// 获取视频类型
const getVideoType = (videoUrl) => {
  if (!videoUrl) return "";
  if (videoUrl.toLowerCase().endsWith(".flv"))
    return t("ui.common.videoType.flv");
  if (videoUrl.toLowerCase().endsWith(".mp4"))
    return t("ui.common.videoType.mp4");
  return t("ui.common.videoType.unknown");
};

// 判断当前视频类型
const currentVideoType = computed(() => {
  return getVideoType(url.value);
});

// 判断是否是FLV
const isFlvVideo = computed(() => {
  return currentVideoType.value === "FLV";
});

// 更新选项
const updateOptions = (newOptions) => {
  options.value = { ...options.value, ...newOptions };

  // 如果播放器已存在，更新硬件加速设置
  if (
    player.value &&
    (newOptions.hwAccel !== undefined ||
      newOptions.allowSoftwareRendering !== undefined)
  ) {
    updateHardwareAcceleration();
  }
};

// 更新URL
const updateUrl = (newUrl) => {
  if (url.value === newUrl) return; // 相同URL不处理

  url.value = newUrl;

  // 如果播放器存在，需要重新加载新URL
  if (player.value) {
    selectVideo(newUrl);
  }
};

// 选择视频
const selectVideo = async (videoUrl) => {
  try {
    loading.value = true; // 显示加载状态
    url.value = videoUrl;

    // 销毁现有播放器并完全清理DOM
    await destroyPlayerAndCleanup();

    // 重新加载播放器
    await loadPlayer();
  } catch (error) {
    console.error("切换视频失败:", error);
    playerState.value = PLAYER_STATES.ERROR;
  } finally {
    loading.value = false;
  }
};

// 初始化播放器
const loadPlayer = async () => {
  if (cleanupInProgress.value) {
    console.log("正在清理资源，等待完成...");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (player.value) {
    console.warn("播放器实例已存在，先销毁...");
    await destroyPlayerAndCleanup();
  }

  loading.value = true;
  console.log(`正在加载: ${url.value} (${currentVideoType.value})`);

  try {
    // 确保容器干净
    if (playerComponentRef.value) {
      playerComponentRef.value.cleanupVideoElements();
    }

    // 等待DOM更新
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 创建新播放器
    await createPlayer();

    // 播放器创建成功后设置状态
    if (player.value) {
      playerReady.value = true;
    } else {
      throw new Error("播放器未创建成功");
    }
  } catch (error) {
    console.error("初始化播放器失败:", error);
    playerState.value = PLAYER_STATES.ERROR;
  } finally {
    loading.value = false;
  }
};

// 创建播放器实例
const createPlayer = async () => {
  // 确保容器存在
  if (!playerComponentRef.value) {
    throw new Error("播放器容器不存在");
  }

  const container = playerComponentRef.value.getPlayerContainer();
  if (!container) {
    throw new Error("无法获取播放器容器元素");
  }

  // 根据视频类型构建配置
  const isFlv = isFlvVideo.value;
  const playerConfig = {
    container: container,
    controls: false, // 禁用原生控件
    playMode: PLAY_MODES.VOD,
    autoplay: options.value.autoplay,
    debug: options.value.debug,
    bufferSize: options.value.bufferSize,
    connectionTimeout: 8000, // 延长超时时间
    dataTimeout: 8000,
    enableHardwareAcceleration: options.value.hwAccel,
    allowSoftwareRendering: options.value.allowSoftwareRendering,

    // 禁用内置UI，完全由Vue组件控制
    ui: {
      enabled: false,
    },

    // 媒体源
    mediaDataSource: {
      type: isFlv ? "flv" : "mp4",
      url: url.value,
      isLive: false,
      withCredentials: false,
      cors: true,
    },
  };

  // 添加FLV特定配置
  if (isFlv) {
    playerConfig.mpegtsConfig = {
      enableStashBuffer: true,
      stashInitialSize: 256, // 增加缓冲区大小
      autoCleanupSourceBuffer: true,
      lazyLoadMaxDuration: 3 * 60,
      seekType: "range",
      enableWorker: options.value.hwAccel,
    };
  }

  // 创建播放器实例
  console.log("创建播放器实例...");
  player.value = new Player(playerConfig);

  // 绑定事件
  setupPlayerEvents();

  // 设置音量
  player.value.setVolume(volume.value / 100);

  // 加载视频
  console.log(`正在加载媒体: ${url.value}`);
  try {
    await player.value.load(url.value);
    console.log("媒体加载成功");
  } catch (error) {
    console.error("加载媒体失败:", error);
    throw error;
  }
};

// 设置播放器事件
const setupPlayerEvents = () => {
  if (!player.value) return;

  // 播放器就绪
  player.value.on(PLAYER_EVENTS.READY, () => {
    playerReady.value = true;
    playerState.value = PLAYER_STATES.READY;
    console.log("播放器就绪");

    // 自动播放
    if (options.value.autoplay) {
      setTimeout(() => togglePlay(), 100);
    }
  });

  // 开始播放
  player.value.on(PLAYER_EVENTS.PLAY, () => {
    isPlaying.value = true;
    playerState.value = PLAYER_STATES.PLAYING;
  });

  // 暂停播放
  player.value.on(PLAYER_EVENTS.PAUSE, () => {
    isPlaying.value = false;
    playerState.value = PLAYER_STATES.PAUSED;
  });

  // 播放结束
  player.value.on(PLAYER_EVENTS.ENDED, () => {
    isPlaying.value = false;
    playerState.value = PLAYER_STATES.ENDED;
  });

  // 错误处理
  player.value.on(PLAYER_EVENTS.ERROR, (error) => {
    console.error("播放器错误:", error);
    playerState.value = PLAYER_STATES.ERROR;
  });

  // 状态变化
  player.value.on(PLAYER_EVENTS.STATE_CHANGE, (data) => {
    const newState = data.state || data;
    playerState.value = newState;
  });
};

// 彻底销毁播放器和清理DOM
const destroyPlayerAndCleanup = async () => {
  // 标记正在清理
  cleanupInProgress.value = true;

  try {
    await destroyPlayer();

    // 等待DOM更新
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 确保DOM清理
    if (playerComponentRef.value) {
      playerComponentRef.value.cleanupVideoElements();
    }
  } finally {
    cleanupInProgress.value = false;
  }
};

// 销毁播放器
const destroyPlayer = () => {
  return new Promise((resolve) => {
    if (!player.value) {
      resolve();
      return;
    }

    console.log("开始销毁播放器...");

    // 重置状态
    const cleanup = () => {
      console.log("执行播放器资源清理...");

      // 停止播放并解绑媒体资源
      if (player.value) {
        try {
          // 停止播放
          if (player.value.videoElement) {
            player.value.videoElement.pause();
            player.value.videoElement.removeAttribute("src");
            player.value.videoElement.load();
          }

          // 卸载媒体源扩展对象
          if (player.value.adapter && player.value.adapter.player) {
            try {
              player.value.adapter.player.unload();
              player.value.adapter.player.detachMediaElement();
            } catch (e) {
              console.warn("卸载媒体适配器失败:", e);
            }
          }
        } catch (e) {
          console.warn("清理播放器资源出错:", e);
        }
      }

      // 重置状态变量
      player.value = null;
      playerReady.value = false;
      isPlaying.value = false;
      playerState.value = "uninitialized";

      console.log("播放器已完全销毁和清理");
      resolve();
    };

    // 尝试销毁播放器
    try {
      // 移除事件监听
      if (player.value) {
        player.value.off(PLAYER_EVENTS.READY);
        player.value.off(PLAYER_EVENTS.PLAY);
        player.value.off(PLAYER_EVENTS.PAUSE);
        player.value.off(PLAYER_EVENTS.ENDED);
        player.value.off(PLAYER_EVENTS.ERROR);
        player.value.off(PLAYER_EVENTS.STATE_CHANGE);

        // 销毁播放器实例
        player.value.once(PLAYER_EVENTS.DESTROY, () => {
          console.log("播放器实例已销毁");
          cleanup();
        });

        player.value.destroy();
      }
    } catch (e) {
      console.warn("播放器销毁时出错:", e);
      cleanup(); // 强制清理
    }

    // 安全超时
    setTimeout(() => {
      if (player.value) {
        console.warn("销毁超时，强制清理");
        cleanup();
      }
    }, 300);
  });
};

// 切换播放/暂停
const togglePlay = async () => {
  if (!player.value) return;

  try {
    if (isPlaying.value) {
      // 暂停播放
      player.value.pause();
    } else {
      // 开始播放
      const playPromise = player.value.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("播放失败:", error);
        });
      }
    }
  } catch (error) {
    console.error("播放控制错误:", error);
  }
};

// 设置音量
const setVolume = (value) => {
  volume.value = value;

  if (player.value) {
    player.value.setVolume(value / 100);
  }
};

// 更新硬件加速设置
const updateHardwareAcceleration = () => {
  if (!player.value) return;

  player.value.setHardwareAcceleration({
    enabled: options.value.hwAccel,
    allowSoftwareRendering: options.value.allowSoftwareRendering,
  });
};

// 设置播放位置
const handleSeek = (time) => {
  if (!player.value || !player.value.videoElement) return;
  player.value.videoElement.currentTime = time;
};

// 设置播放速度
const handleSpeedChange = (rate) => {
  if (!player.value || !player.value.videoElement) return;
  player.value.videoElement.playbackRate = rate;
};

// 生命周期钩子
onMounted(async () => {
  console.log("录像回放页面已加载");
  // 默认加载第一个视频
  await selectVideo(videoList.value[0].url);
});

onBeforeUnmount(() => {
  destroyPlayerAndCleanup();
});
</script>

<style scoped>
.video-playback-page {
  background-color: #1a1a1a;
  color: #fff;
  height: 100%;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  overflow: auto;
}

.player-container-wrapper {
  width: 100%;
  display: flex;
  box-sizing: border-box;
  gap: 20px;
}

.control-panel {
  width: 300px;
  background-color: #222;
  border-radius: 4px;
  padding: 15px;
}

.playback-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hardware-accel {
  background-color: #2a2a2a;
  border-radius: 4px;
  padding: 10px;
}

.video-list {
  margin-top: 20px;
}

.video-item {
  padding: 10px;
  background-color: #2a2a2a;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.video-item:hover {
  background-color: #3a3a3a;
}

.video-item.active {
  background-color: #1890ff;
}

.video-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.video-name {
  flex: 1;
}

.video-type {
  color: #999;
  margin-right: 10px;
  font-size: 12px;
}

.video-duration {
  font-size: 12px;
  color: #bbb;
}

h2 {
  margin-top: 0;
  font-size: 18px;
  border-bottom: 1px solid #333;
  padding-bottom: 10px;
}

h3 {
  margin-top: 5px;
  font-size: 16px;
}

input[type="checkbox"] {
  margin-right: 5px;
}

input[type="number"] {
  width: 60px;
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 5px;
  border-radius: 3px;
}
</style>
