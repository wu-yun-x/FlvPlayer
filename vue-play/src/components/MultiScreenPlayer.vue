<template>
  <div class="multi-screen-player">
    <div class="controls">
      <div class="controls-left">
        <!-- 现有控制按钮 -->
        <button @click="setLayout('1x1')" :class="{ active: layout === '1x1' }">
          1 {{ t("ui.multiScreen.screen") }}
        </button>
        <button @click="setLayout('2x2')" :class="{ active: layout === '2x2' }">
          4 {{ t("ui.multiScreen.screen") }}
        </button>
        <button @click="setLayout('3x3')" :class="{ active: layout === '3x3' }">
          6 {{ t("ui.multiScreen.screen") }}
        </button>
        <button @click="loadStream" :disabled="loading">
          {{ t("ui.multiScreen.loadStream") }}
        </button>
        <button @click="playStream" :disabled="!hasPlayers">
          {{ t("ui.multiScreen.play") }}
        </button>
        <button @click="showSettings = !showSettings" class="settings-btn">
          {{
            showSettings
              ? t("ui.multiScreen.hideSettings")
              : t("ui.multiScreen.showSettings")
          }}
        </button>
        <!-- 加载模式选择 -->
        <div class="mode-selector">
          <label class="mode-label">
            <input type="radio" v-model="loadMode" value="all" />
            <span>{{ t("ui.multiScreen.loadModes.all") }}</span>
          </label>
          <label class="mode-label">
            <input type="radio" v-model="loadMode" value="selective" />
            <span>{{ t("ui.multiScreen.loadModes.selective") }}</span>
          </label>
        </div>
        <span v-if="loading" class="loading-indicator">{{
          t("ui.multiScreen.loading")
        }}</span>
      </div>
      <div class="controls-right">
        <button @click="handleToggleFullscreen">
          {{
            isFullscreen
              ? t("ui.multiScreen.exitFullscreen")
              : t("ui.multiScreen.fullscreen")
          }}
        </button>
        <button @click="captureAllScreens">
          {{
            isCapturing
              ? t("ui.multiScreen.capturing")
              : t("ui.multiScreen.capture")
          }}
        </button>
        <div class="server-url">
          <span class="server-url-label">{{
            t("ui.multiScreen.serverUrlLabel")
          }}</span>
          <input
            type="text"
            v-model="serverUrl"
            :placeholder="t('ui.multiScreen.serverUrlPlaceholder')"
            class="server-url-input"
          />
        </div>
      </div>
    </div>

    <!-- 高级设置面板 -->
    <div v-if="showSettings" class="advanced-settings">
      <div class="settings-grid">
        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.lowLatencyMode" />
            {{ t("ui.multiScreen.settings.lowLatencyMode") }}
          </label>
          <span class="setting-hint">{{
            t("ui.multiScreen.settings.lowLatencyHint")
          }}</span>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.autoChasing" />
            {{ t("ui.multiScreen.settings.autoChasing") }}
          </label>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.autoReconnect" />
            {{ t("ui.multiScreen.settings.autoReconnect") }}
          </label>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" v-model="settings.debugMode" />
            {{ t("ui.multiScreen.settings.debugMode") }}
          </label>
        </div>

        <div class="setting-item">
          <label>{{ t("ui.multiScreen.settings.maxRetryCount") }}</label>
          <input
            type="number"
            v-model.number="settings.maxRetryCount"
            min="0"
            max="10"
          />
        </div>

        <div class="setting-item">
          <label>{{ t("ui.multiScreen.settings.retryInterval") }}</label>
          <input
            type="number"
            v-model.number="settings.retryInterval"
            min="500"
            step="500"
          />
        </div>

        <div class="setting-item">
          <label>{{ t("ui.multiScreen.settings.maxRetryInterval") }}</label>
          <input
            type="number"
            v-model.number="settings.maxRetryInterval"
            min="1000"
            step="1000"
          />
        </div>

        <div class="setting-item setting-group">
          <label>
            <input type="checkbox" v-model="settings.hardwareAcceleration" />
          </label>
          <div class="setting-header">
            {{ t("ui.multiScreen.settings.hardwareAcceleration") }}
          </div>
          <span class="setting-hint">{{
            t("ui.multiScreen.settings.hardwareAccelHint")
          }}</span>
          <label>
            <input type="checkbox" v-model="settings.softwareFallback" />
            {{ t("ui.multiScreen.settings.softwareFallback") }}
          </label>
        </div>
      </div>

      <div class="settings-actions">
        <button @click="applySettings" class="apply-btn">
          {{ t("ui.multiScreen.settings.apply") }}
        </button>
        <button @click="resetSettings" class="reset-btn">
          {{ t("ui.multiScreen.settings.reset") }}
        </button>
      </div>
    </div>

    <div class="screen-container" ref="screenContainer">
      <SplitScreen
        :layout="layout"
        :screens="screens"
        @screen-click="handleScreenClick"
        @layout-change="handleLayoutChange"
      >
        <template
          v-for="(_, index) in screensCount"
          :key="index"
          #[`screen-${index}`]
        >
          <div
            class="player-container"
            :ref="
              (el) => {
                if (el) playerContainers[index] = el;
              }
            "
            @click="handlePlayerContainerClick(index)"
            v-clean-player
          >
            <!-- FlvPlayer 将在这里挂载 -->
            <span class="screen-number"
              >{{ t("ui.multiScreen.screenLabel") }} {{ index + 1 }}</span
            >

            <!-- 状态覆盖层 -->
            <div
              v-if="!playerStates[index] || playerStates[index] === 'error'"
              class="screen-overlay"
            >
              <div class="stream-status">
                {{
                  playerStates[index] === "error"
                    ? t("ui.multiScreen.status.error")
                    : t("ui.multiScreen.status.notConnected")
                }}
                <button
                  v-if="playerStates[index] === 'error'"
                  @click.stop="reloadStream(index)"
                  class="retry-button"
                >
                  {{ t("ui.multiScreen.status.retry") }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </SplitScreen>
    </div>

    <div class="status-bar">
      {{ t("ui.multiScreen.status.currentStatus") }}: {{ statusMessage }}
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import SplitScreen from "./SplitScreen.vue";
import { useNativeScreenshot } from "../hooks/useScreenshot";
import { useFullscreen } from "../hooks/useFullscreen";
import { usePlayerManager } from "../hooks/usePlayerManager";
import { usePlayerSettings } from "../hooks/usePlayerSettings";
import { getScreenCount, generateScreens } from "../utils/layoutUtils";
import { useI18n } from "vue-i18n";

// 引入国际化
const { t } = useI18n();

// 服务器URL
const serverUrl = ref("ws://localhost:8000/live/stream.flv");
const layout = ref("2x2"); // 默认2x2分屏
const activeScreen = ref(0);
const playerContainers = reactive([]); // 使用reactive数组存储DOM引用
const showSettings = ref(false); // 设置面板显示状态
const loadMode = ref("all"); // 加载模式 - 'all' 为全部加载，'selective' 为选择性加载

// 使用自定义hooks
const { isCapturing, captureAndDownload } = useNativeScreenshot();
const { isFullscreen, toggleFullscreen } = useFullscreen();
const {
  players,
  playerStates,
  playerReady,
  loading,
  statusMessage,
  cleanupContainer,
  initSinglePlayer,
  destroyAllPlayers,
  playStream: playPlayerStream,
} = usePlayerManager();
const {
  settings,
  loadSettings,
  saveSettings,
  resetSettings,
  applySettingsToPlayers,
} = usePlayerSettings();

// 根据布局计算屏幕数量
const screensCount = computed(() => getScreenCount(layout.value));

// 检查是否有播放器实例
const hasPlayers = computed(() => players.length > 0);

// 准备屏幕数据
const screens = computed(() => generateScreens(layout.value));

// 设置布局
const setLayout = async (newLayout) => {
  // 先销毁现有的播放器
  destroyAllPlayers(players, playerContainers);

  // 更新布局
  layout.value = newLayout;

  // 清空容器引用数组
  playerContainers.length = 0;
  playerStates.length = 0;

  // 等待视图更新
  await nextTick();

  // 确保所有播放器容器都被清理
  document.querySelectorAll(".player-container").forEach((container) => {
    cleanupContainer(container);
  });

  statusMessage.value = "布局已更改，等待加载流";
};

// 处理屏幕点击
const handleScreenClick = async (index) => {
  activeScreen.value = index;
  console.log(`点击了屏幕 ${index + 1}`);

  // 如果是选择性加载模式且该屏幕没有播放器，提示用户加载
  if (loadMode.value === "selective") {
    if (index >= screensCount.value || !playerContainers[index]) {
      console.error(`播放器 ${index + 1} 容器不存在`);
      return;
    }
    statusMessage.value = `正在加载屏幕 ${index + 1} 的流...`;

    // 如果已存在播放器，直接返回
    if (players[index]) return;

    // 初始化播放器
    const player = await initSinglePlayer(
      index,
      playerContainers[index],
      serverUrl.value,
      settings,
      true
    );
    if (player) {
      players[index] = player;
      statusMessage.value = `屏幕 ${index + 1} 已加载`;

      // 可选：自动播放
      try {
        player.play();
      } catch (error) {
        console.error(`自动播放失败:`, error);
      }
    } else {
      statusMessage.value = `屏幕 ${index + 1} 加载失败`;
    }
  }
};

// 处理播放器容器点击
const handlePlayerContainerClick = (index) => {
  // 尽在选择性加载模式下处理
  if (loadMode.value === "selective" && !players[index]) {
    activeScreen.value = index;
    statusMessage.value = `已选中屏幕 ${index + 1}, 点击加载按钮开始播放`;
  }
};

// 重新加载单个流
const reloadStream = async (index) => {
  if (players[index]) {
    try {
      // 销毁现有播放器实例
      if (typeof players[index].destroy === "function") {
        players[index].destroy();
      }

      // 手动清理播放器容器
      cleanupContainer(playerContainers[index]);

      // 重置播放器引用
      players[index] = null;
    } catch (error) {
      console.error(`销毁播放器 ${index + 1} 失败:`, error);
    }
  }

  // 延迟一下再创建新播放器，确保DOM已更新
  await new Promise((resolve) => setTimeout(resolve, 100));

  const player = await initSinglePlayer(
    index,
    playerContainers[index],
    serverUrl.value,
    settings,
    true
  );
  if (player) {
    players[index] = player;
    statusMessage.value = `播放器 ${index + 1} 已重新加载`;
  } else {
    statusMessage.value = `播放器 ${index + 1} 重新加载失败`;
  }
};

// 初始化所有播放器
const initPlayers = async () => {
  loading.value = true;
  statusMessage.value = "正在初始化播放器...";

  if (!playerContainers || playerContainers.length === 0) {
    console.error("播放器容器尚未准备好");
    loading.value = false;
    statusMessage.value = "播放器容器初始化失败";
    return;
  }

  // 先确保所有容器都被清理
  for (let i = 0; i < playerContainers.length; i++) {
    if (playerContainers[i]) {
      cleanupContainer(playerContainers[i]);
    }
  }

  console.log(
    `初始化 ${screensCount.value} 个播放器，容器数量: ${playerContainers.length}`
  );

  try {
    // 清空现有播放器数组但保持数组长度
    players.length = screensCount.value;
    playerStates.length = screensCount.value;
    for (let i = 0; i < screensCount.value; i++) {
      players[i] = null;
      playerStates[i] = null;
    }

    if (loadMode.value === "selective") {
      // 选择性加载模式 - 只加载第一个播放器
      const firstPlayer = await initSinglePlayer(
        0,
        playerContainers[0],
        serverUrl.value,
        settings,
        true
      );
      if (firstPlayer) {
        players[0] = firstPlayer;
        statusMessage.value = "首个屏幕已加载，点击其他屏幕进行加载";
      } else {
        statusMessage.value = "首个屏幕加载失败";
      }
    } else {
      // 全部加载模式 - 顺序加载所有播放器
      for (let index = 0; index < screensCount.value; index++) {
        statusMessage.value = `正在加载屏幕 ${index + 1}/${screensCount.value}`;

        // 初始化播放器
        const player = await initSinglePlayer(
          index,
          playerContainers[index],
          serverUrl.value,
          settings,
          true
        );

        if (player) {
          players[index] = player;
        }

        // 每个播放器之间增加延迟，避免同时连接
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const activePlayerCount = players.filter((p) => p !== null).length;
      statusMessage.value =
        activePlayerCount > 0
          ? `成功加载 ${activePlayerCount}/${screensCount.value} 个播放器`
          : "所有播放器初始化失败";
    }
  } catch (error) {
    console.error("初始化播放器时发生错误:", error);
    statusMessage.value = "初始化播放器时发生错误";
  } finally {
    loading.value = false;
  }
};

// 加载流
const loadStream = async () => {
  // 先销毁现有的播放器
  await destroyAllPlayers(players, playerContainers);

  // 确保容器清理
  playerContainers.forEach((container) => {
    if (container) cleanupContainer(container);
  });

  // 等待清理完成
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (loadMode.value === "all") {
    // 全部加载模式 - 使用现有方法
    initPlayers();
  } else {
    // 选择性加载模式 - 只初始化第一个屏幕
    statusMessage.value =
      "选择性加载模式：仅加载第一个屏幕，其他屏幕请点击加载";
    handleScreenClick(0); // 只加载第一个
  }
};

// 播放流
const playStream = () => {
  if (players.length === 0) {
    statusMessage.value = "没有可用的播放器实例";
    return;
  }

  console.log(`尝试播放 ${players.length} 个视频流`);
  statusMessage.value = "正在尝试播放...";

  let playSuccess = 0;
  players.forEach((player, index) => {
    if (!player) return;

    try {
      console.log(`播放屏幕 ${index + 1} 的视频`);
      // 确保视频元素存在
      const videoElement = playerContainers[index]?.querySelector("video");
      if (!videoElement) {
        console.warn(`屏幕 ${index + 1} 没有找到视频元素`);
        return;
      }

      playPlayerStream(player)
        .then(() => {
          playSuccess++;
          statusMessage.value = `成功播放 ${playSuccess}/${
            players.filter(Boolean).length
          } 个视频`;
        })
        .catch((error) => {
          console.error(`播放器${index + 1}播放失败:`, error);
          // 如果视频播放失败，检查清理容器
          setTimeout(() => cleanupContainer(playerContainers[index]), 100);
        });
    } catch (error) {
      console.error(`调用播放器${index + 1}播放方法时出错:`, error);
    }
  });
};

// 抓拍特定屏幕的方法
const captureScreen = async (screenIndex) => {
  if (screenIndex !== undefined && playerContainers.value[screenIndex]) {
    const container = playerContainers.value[screenIndex];
    const videoElement = container.querySelector("video"); // 假设有视频元素

    const targetElement = videoElement || container;
    const fileName = `屏幕${
      screenIndex + 1
    }_${new Date().toLocaleDateString()}`;
    return await captureAndDownload(targetElement, fileName);
  }
  return false;
};

// 抓拍所有屏幕的方法
const captureAllScreens = async () => {
  if (screenContainer.value) {
    const fileName = `多屏监控_${new Date().toLocaleDateString()}`;
    // 检查是否有屏幕处于放大状态
    const isZoomed = document.querySelector(".screen-zoomed");
    return await captureAndDownload(screenContainer.value, fileName, {
      onlyVisible: !!isZoomed,
    });
  }
  return false;
};

// 应用设置
const applySettings = () => {
  // 应用设置到所有播放器
  const result = applySettingsToPlayers(players);
  statusMessage.value = result;
};

// 切换全屏状态
const handleToggleFullscreen = () => {
  const container = screenContainer.value;
  if (container) {
    toggleFullscreen(container);
  }
};

// 处理布局变更（当屏幕被双击缩放时）
const handleLayoutChange = (event) => {
  console.log("布局变更:", event);

  if (event.zoomed) {
    // 屏幕被放大，记录被放大的屏幕索引
    const screenIndex = event.screenIndex;
    statusMessage.value = `屏幕 ${event.screenIndex + 1} 已放大 (双击恢复)`;

    // 如果是3x3布局的第一个屏幕（索引0），特殊处理
    if (layout.value === "3x3" && screenIndex === 0) {
      console.log("放大3x3布局的主屏");
    }
  } else {
    // 屏幕恢复原状
    statusMessage.value = "屏幕已恢复正常显示";
  }
};

// 监听布局变化
watch(
  () => layout.value,
  (newLayout, oldLayout) => {
    if (newLayout !== oldLayout) {
      console.log(`布局从 ${oldLayout} 切换到 ${newLayout}`);
      // 重置播放器数组状态
      players.length = 0;
      playerStates.length = 0;

      // 下一轮事件循环中确保容器被清理
      nextTick(() => {
        document.querySelectorAll(".player-container").forEach((container) => {
          cleanupContainer(container);
        });
      });
    }
  }
);

// 监听播放器状态变化
watch(
  () => [...playerStates],
  (newStates) => {
    // 检查是否有错误状态
    const errorIndex = newStates.findIndex((state) => state === "error");
    if (errorIndex !== -1) {
      console.log(`播放器 ${errorIndex + 1} 出现错误状态，检查是否需要清理`);
      // 如果播放器出错，确保其容器被清理
      if (playerContainers[errorIndex]) {
        setTimeout(() => {
          cleanupContainer(playerContainers[errorIndex]);
        }, 200);
      }
    }
  },
  { deep: true }
);

// 组件挂载后初始化
onMounted(() => {
  // 加载保存的设置
  loadSettings();
  statusMessage.value = "组件已挂载，等待加载流";
});

// 组件卸载前清理
onBeforeUnmount(() => {
  console.log("组件卸载，清理所有播放器资源");
  // 销毁所有播放器
  destroyAllPlayers(players, playerContainers);

  // 再次检查确保所有视频元素都被清理
  nextTick(() => {
    document.querySelectorAll(".player-container video").forEach((video) => {
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.parentNode?.removeChild(video);
      } catch (e) {
        console.warn("卸载时清理视频元素失败:", e);
      }
    });
  });
});
</script>

<style scoped>
/* 保持原有样式不变 */
.multi-screen-player {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 全屏模式样式调整 */
:fullscreen .multi-screen-player,
:-webkit-full-screen .multi-screen-player,
:-moz-full-screen .multi-screen-player {
  background: #000;
  height: 100vh;
}

/* 全屏模式下隐藏状态栏，增加视频空间 */
:fullscreen .status-bar,
:-webkit-full-screen .status-bar,
:-moz-full-screen .status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  opacity: 0.7;
  transition: opacity 0.3s;
}

:fullscreen .status-bar:hover,
:-webkit-full-screen .status-bar:hover,
:-moz-full-screen .status-bar:hover {
  opacity: 1;
}

.screen-container {
  flex: 1;
  position: relative;
  width: 100%;
}

/* 加载模式选择器 */
.mode-selector {
  display: flex;
  align-items: center;
  margin: 0 10px;
  padding: 4px 8px;
  background: #444;
  border-radius: 4px;
}

.mode-label {
  display: flex;
  align-items: center;
  margin-right: 10px;
  cursor: pointer;
  font-size: 12px;
}

.mode-label input {
  margin-right: 4px;
}

.controls {
  display: flex;
  padding: 10px;
  background: #333;
  align-items: center;
  .controls-left {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 60%;
  }
  .controls-right {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 40%;
    justify-content: flex-end;
    button {
      padding: 6px 12px;
      background: #1890ff;
      border: none;
      border-radius: 4px;
      color: white;
      cursor: pointer;
    }

    .server-url {
      display: flex;
      align-items: center;
      gap: 8px;
      .server-url-label {
        color: #888;
      }
      .server-url-input {
        padding: 6px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #222;
        color: #fff;
        min-width: 260px;
      }
    }
  }
  button {
    margin-right: 10px;
    margin-bottom: 4px;
    padding: 6px 12px;
    background: #555;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:disabled {
    background: #444;
    color: #888;
    cursor: not-allowed;
  }
  button.active {
    background: #1890ff;
  }
}

.loading-indicator {
  color: #1890ff;
  margin-left: 10px;
  font-size: 14px;
}

.player-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
}

.screen-number {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10;
}

.screen-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
}

.stream-status {
  color: white;
  font-size: 16px;
  background: rgba(255, 0, 0, 0.3);
  padding: 8px 16px;
  border-radius: 4px;
  text-align: center;
}

.retry-button {
  margin-top: 8px;
  padding: 4px 8px;
  background: #1890ff;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.status-bar {
  background: #222;
  color: #ddd;
  padding: 8px 12px;
  font-size: 12px;
  border-top: 1px solid #444;
}

.advanced-settings {
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  margin: 10px 0;
  padding: 15px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 15px;
}

.setting-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-hint {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.setting-group {
  border: 1px solid #444;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-header {
  font-weight: bold;
  color: #1890ff;
}

.settings-actions {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.apply-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  padding: 6px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.reset-btn {
  background-color: #555;
  color: white;
  border: none;
  padding: 6px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.settings-btn {
  background-color: #444;
}

input[type="number"] {
  background-color: #333;
  color: white;
  border: 1px solid #555;
  padding: 5px;
  border-radius: 3px;
  width: 80px;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
</style>
