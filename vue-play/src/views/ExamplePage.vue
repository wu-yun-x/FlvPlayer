<!--
 * @Author: st004362
 * @Date: 2025-06-16 11:43:46
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-20 17:31:47
 * @Description: 播放器示例
-->
<template>
  <div class="example-page">
    <div class="player-container-wrapper">
      <!-- 播放器组件 -->
      <PlayerComponent
        ref="playerComponentRef"
        :current-mode="currentMode"
        :url="url"
        :player-ready="playerReady"
        :is-playing="isPlaying"
        :volume="volume"
        :loading="loading"
        :player="player"
        :player-state="playerState"
        @toggle-play="togglePlay"
        @set-volume="setVolume"
        @load-player="loadPlayer"
        @destroy-player="destroyPlayer"
        @url-change="updateUrl"
      />

      <!-- 控制面板组件 -->
      <ControlPanel
        :current-mode="currentMode"
        :options="options"
        :player-state="playerState"
        :network-quality="networkQuality"
        @switch-mode="switchMode"
        @update-options="updateOptions"
      />
    </div>

    <!-- 状态面板组件 -->
    <StatusPanel
      :network-quality="networkQuality"
      :bitrate-info="bitrateInfo"
      :buffer-health="bufferHealth"
      :hw-accel-info="hwAccelInfo"
      :stats-info="statsInfo"
      :event-logs="eventLogs"
      ref="statusPanelRef"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import Player, {
  PLAYER_STATES,
  PLAYER_EVENTS,
  PLAY_MODES,
} from "../../../FlvPlayer/src/index.js";
import { useI18n } from "vue-i18n";

// 导入子组件
import PlayerComponent from "../components/player/PlayerComponent.vue";
import ControlPanel from "../components/player/ControlPanel.vue";
import StatusPanel from "../components/player/StatusPanel.vue";

// 使用国际化
const { t } = useI18n();

// 组件引用
const playerComponentRef = ref(null);
const statusPanelRef = ref(null);

// 状态变量
const player = ref(null);
const playerReady = ref(false);
const isPlaying = ref(false);
const playerState = ref("uninitialized");
const networkQuality = ref("unknown");
const loading = ref(false);
const eventLogs = ref([]);
const volume = ref(80);
const statsInfo = ref(t("ui.example.stats.notLoaded"));
const bitrateInfo = ref("");
const bufferHealth = ref(t("ui.example.stats.unknown"));
const hwAccelInfo = ref(t("ui.example.stats.notLoaded"));

// 配置选项
const currentMode = ref("live");
const url = ref("ws://localhost:8000/live/stream.flv");
const options = ref({
  // 基本选项
  lowLatency: true,
  autoReconnect: true,
  debug: true,
  // 直播特有选项
  seekToLive: true,
  maxRetries: 3,
  retryInterval: 2000,
  maxRetryInterval: 5000,
  // 点播特有选项
  autoplay: false,
  bufferSize: 1.0,
  // 硬件加速
  hwAccel: true,
  allowSoftwareRendering: false,
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
    watchHardwareAccelSettings();
  }
};

// 切换播放模式
const switchMode = (mode) => {
  currentMode.value = mode;
  // 更新URL
  updateUrlInput();

  // 如果有播放器实例，销毁它
  if (player.value) {
    destroyPlayer();
  }

  logEvent(t("ui.example.events.modeSwitch"), { mode });
};

// 更新URL
const updateUrl = (newUrl) => {
  url.value = newUrl;
};

// 更新URL输入框
const updateUrlInput = () => {
  if (currentMode.value === "live") {
    url.value =
      "https://sf1-hscdn-tos.pstatp.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-360p.flv";
  } else {
    url.value = "https://media.w3.org/2010/05/sintel/trailer.mp4";
  }
};

// 记录事件日志
const logEvent = (type, message = "") => {
  const now = new Date();
  const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

  eventLogs.value.unshift({
    time: timeStr,
    type,
    message: typeof message === "object" ? JSON.stringify(message) : message,
  });

  // 限制日志条目数量
  if (eventLogs.value.length > 20) {
    eventLogs.value.pop();
  }
};

// 更新硬件加速UI
const updateHWAccelUI = () => {
  if (!player.value) return;

  try {
    const hwInfo = player.value.getHardwareAccelerationInfo();
    if (hwInfo) {
      options.value.hwAccel = hwInfo.enabled;
      options.value.allowSoftwareRendering = hwInfo.isSoftwareRendering;

      // 显示硬件加速信息，格式化以便于阅读
      const infoToShow = {
        [t("ui.example.stats.supportStatus")]: hwInfo.supported
          ? t("ui.example.stats.supported")
          : t("ui.example.stats.notSupported"),
        [t("ui.example.stats.currentStatus")]: hwInfo.enabled
          ? t("ui.example.stats.enabled")
          : t("ui.example.stats.disabled"),
        [t("ui.example.stats.renderMode")]: hwInfo.isSoftwareRendering
          ? t("ui.example.stats.softwareRendering")
          : t("ui.example.stats.hardwareRendering"),
        [t("ui.example.stats.performanceLevel")]: hwInfo.performance,
        [t("ui.example.stats.renderer")]: hwInfo.type,
      };

      hwAccelInfo.value = JSON.stringify(infoToShow, null, 2);

      // 如果是软件渲染，显示警告
      if (hwInfo.isSoftwareRendering && hwInfo.enabled) {
        logEvent(
          t("ui.example.events.note"),
          t("ui.example.events.softwareRenderingWarning")
        );

        // 如果性能不佳，建议禁用
        if (
          player.value &&
          player.value.video &&
          player.value.video.videoWidth > 720
        ) {
          logEvent(
            t("ui.example.events.suggestion"),
            t("ui.example.events.highResolutionWarning")
          );
        }
      }
    } else {
      hwAccelInfo.value = "未获取到硬件加速信息";
    }
  } catch (error) {
    console.error("获取硬件加速信息失败:", error);
    hwAccelInfo.value = "获取硬件加速信息失败";
  }
};

// 初始化播放器
const loadPlayer = () => {
  if (player.value) {
    destroyPlayer();
  }

  loading.value = true;
  logEvent("初始化", "创建播放器实例");

  try {
    const isLive = currentMode.value === "live";

    // 确保容器干净
    if (playerComponentRef.value) {
      playerComponentRef.value.cleanupVideoElements();
    }

    player.value = new Player({
      container: playerComponentRef.value.getPlayerContainer(),
      controls: false,
      playMode: isLive ? PLAY_MODES.LIVE : PLAY_MODES.VOD,
      autoplay: isLive || options.value.autoplay, // 直播模式下自动播放
      debug: options.value.debug,
      lowLatency: isLive && options.value.lowLatency,
      autoReconnect: isLive && options.value.autoReconnect,
      maxErrorRetries: isLive ? options.value.maxRetries : 0,
      retryInterval: isLive ? options.value.retryInterval : 2000,
      maxRetryInterval: isLive ? options.value.maxRetryInterval : 5000,
      bufferSize: isLive ? 1.0 : options.value.bufferSize,
      connectionTimeout: 8000, // 增加超时时间
      dataTimeout: 8000,
      enableHardwareAcceleration: options.value.hwAccel,
      allowSoftwareRendering: options.value.allowSoftwareRendering,

      // 禁用内置UI
      ui: {
        enabled: false,
      },

      // 媒体源
      mediaDataSource: {
        type: isLive ? "flv" : url.value.endsWith(".flv") ? "flv" : "mp4",
        url: url.value,
        isLive: isLive,
        withCredentials: false,
      },

      // 根据模式设置不同的配置
      mpegtsConfig: isLive
        ? {
            // 直播模式 - 低延迟优先
            enableStashBuffer: false,
            stashInitialSize: 256, // 增加初始缓冲区大小
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 2 * 60,
            autoCleanupMinBackwardDuration: 1 * 60,
            lazyLoadMaxDuration: 2 * 60,
            forceKeyFrameOnDiscontinuity: true,
            liveBufferLatencyMaxLatency: 2.0,
            liveBufferLatencyMinRemain: 0.5,
            liveBufferLatencyChasing: options.value.seekToLive,
            seekType: "range",
            enableWorker: options.value.hwAccel,
          }
        : {
            // 点播模式 - 流畅播放优先
            enableStashBuffer: true,
            stashInitialSize: 256,
            autoCleanupSourceBuffer: false,
            autoCleanupMaxBackwardDuration: 30,
            autoCleanupMinBackwardDuration: 10,
            lazyLoadMaxDuration: 3 * 60,
            lazyLoadRecoverDuration: 30,
            enableWorker: options.value.hwAccel,
          },
    });

    // 注册事件
    player.value.on(PLAYER_EVENTS.READY, () => {
      playerReady.value = true;
      playerState.value = PLAYER_STATES.READY;
      logEvent("就绪", "播放器已就绪");

      // 直播模式下自动播放
      if (currentMode.value === "live") {
        setTimeout(() => {
          if (player.value && !isPlaying.value) {
            player.value.play().catch((e) => {
              logEvent("错误", "自动播放失败: " + e.message);
            });
          }
        }, 100);
      }
    });

    // 其他事件处理
    setupPlayerEvents();

    // 设置音量
    player.value.setVolume(volume.value / 100);

    // 开始加载
    logEvent("加载", `正在加载: ${url.value}`);
    player.value.load(url.value);

    // 更新硬件加速UI
    setTimeout(() => {
      updateHWAccelUI();
    }, 100);
  } catch (error) {
    logEvent("初始化错误", error.message);
    console.error("初始化播放器失败:", error);
  } finally {
    loading.value = false;
  }
};

// 设置播放器事件
const setupPlayerEvents = () => {
  if (!player.value) return;

  player.value.on(PLAYER_EVENTS.PLAY, () => {
    isPlaying.value = true;
    playerState.value = PLAYER_STATES.PLAYING;
    logEvent("播放", "开始播放");
  });

  player.value.on(PLAYER_EVENTS.PAUSE, () => {
    isPlaying.value = false;
    playerState.value = PLAYER_STATES.PAUSED;
    logEvent("暂停", "已暂停播放");
  });

  player.value.on(PLAYER_EVENTS.ENDED, () => {
    isPlaying.value = false;
    playerState.value = PLAYER_STATES.ENDED;
    logEvent("结束", "播放结束");
  });

  player.value.on(PLAYER_EVENTS.ERROR, (error) => {
    playerState.value = PLAYER_STATES.ERROR;
    logEvent("错误", error);

    // 直播模式下尝试重连
    if (currentMode.value === "live" && options.value.autoReconnect) {
      logEvent("重连", "尝试重新连接直播流");
      setTimeout(() => {
        if (player.value) {
          player.value.load(url.value);
        }
      }, options.value.retryInterval);
    }
  });

  player.value.on(PLAYER_EVENTS.STATE_CHANGE, (data) => {
    playerState.value = data;
    logEvent("状态变化", data);
  });

  player.value.on(PLAYER_EVENTS.STATS_UPDATE, (data) => {
    if (data.statisticsInfo) {
      statsInfo.value = JSON.stringify(data.statisticsInfo, null, 2);
    }
  });

  player.value.on(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE, (data) => {
    networkQuality.value = data.quality || "unknown";
    // 确保bufferHealth始终为字符串类型
    bufferHealth.value =
      data.bufferHealth !== undefined && data.bufferHealth !== null
        ? data.bufferHealth.toString()
        : "未知";
    // 如果有实时比特率，优先显示
    if (data.realTimeBitrate && data.realTimeBitrate > 0) {
      bitrateInfo.value = `实时: ${Math.round(
        data.realTimeBitrate / 1000
      )}kbps`;
      if (data.staticBitrate > 0) {
        bitrateInfo.value += ` (静态: ${Math.round(
          data.staticBitrate / 1000
        )}kbps)`;
      }
    } else if (data.bitrate) {
      bitrateInfo.value = `${Math.round(data.bitrate / 1000)}kbps`;
    }

    logEvent("网络质量", data.quality);

    // 通知图表更新
    if (statusPanelRef.value) {
      statusPanelRef.value.updateChart(data);
    }
  });

  // 监听硬件加速事件
  player.value.on(PLAYER_EVENTS.HW_ACCEL_INFO, (info) => {
    logEvent("硬件加速信息", info);
    updateHWAccelUI();
  });

  player.value.on(PLAYER_EVENTS.HW_ACCEL_CHANGED, (info) => {
    logEvent("硬件加速设置已变更", info);
    updateHWAccelUI();
  });
};

// 销毁播放器
const destroyPlayer = () => {
  if (!player.value) return;

  logEvent("销毁", "销毁播放器实例");

  try {
    // 清理播放器资源
    if (player.value.videoElement) {
      player.value.videoElement.pause();
      player.value.videoElement.removeAttribute("src");
      player.value.videoElement.load();
    }

    // 取消事件监听
    player.value.off(PLAYER_EVENTS.READY);
    player.value.off(PLAYER_EVENTS.PLAY);
    player.value.off(PLAYER_EVENTS.PAUSE);
    player.value.off(PLAYER_EVENTS.ENDED);
    player.value.off(PLAYER_EVENTS.ERROR);
    player.value.off(PLAYER_EVENTS.STATE_CHANGE);
    player.value.off(PLAYER_EVENTS.STATS_UPDATE);
    player.value.off(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE);
    player.value.off(PLAYER_EVENTS.HW_ACCEL_INFO);
    player.value.off(PLAYER_EVENTS.HW_ACCEL_CHANGED);

    // 销毁播放器
    player.value.destroy();
    player.value = null;
  } catch (e) {
    logEvent("错误", "播放器销毁时出错: " + e.message);
    console.error("销毁播放器失败:", e);
  } finally {
    // 清理DOM
    if (playerComponentRef.value) {
      playerComponentRef.value.cleanupVideoElements();
    }

    // 重置状态
    playerReady.value = false;
    isPlaying.value = false;
    playerState.value = "uninitialized";
    statsInfo.value = t("ui.example.stats.notLoaded");
    bitrateInfo.value = "";
    bufferHealth.value = t("ui.example.stats.unknown");
    hwAccelInfo.value = t("ui.example.stats.notLoaded");
  }
};

// 切换播放/暂停
const togglePlay = () => {
  if (!player.value) return;

  if (isPlaying.value) {
    player.value.pause();
  } else {
    player.value.play();
  }
};

// 设置音量
const setVolume = (value) => {
  volume.value = value;
  if (player.value) {
    player.value.setVolume(value / 100);
    logEvent("音量", `设置音量: ${value}%`);
  }
};

// 监听硬件加速设置变化
const watchHardwareAccelSettings = () => {
  if (!player.value) return;

  player.value.setHardwareAcceleration({
    enabled: options.value.hwAccel,
    allowSoftwareRendering: options.value.allowSoftwareRendering,
  });
};

// 监听配置选项变更
watch(
  () => options.value.hwAccel,
  () => {
    if (player.value) watchHardwareAccelSettings();
  }
);

watch(
  () => options.value.allowSoftwareRendering,
  () => {
    if (player.value) watchHardwareAccelSettings();
  }
);

// 生命周期钩子
onMounted(() => {
  logEvent("组件", "示例页面已加载");
});

onBeforeUnmount(() => {
  destroyPlayer();
});
</script>

<style scoped lang="less">
.example-page {
  background-color: #1a1a1a;
  color: #fff;
  height: calc(100% - 68px);
}

.player-container-wrapper {
  width: 100%;
  display: flex;
  padding: 0 20px;
  box-sizing: border-box;
  justify-content: space-between;
}
</style>
