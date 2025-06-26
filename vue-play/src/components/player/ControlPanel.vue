<!--
 * @Author: st004362
 * @Date: 2025-06-16 15:48:30
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-23 10:51:15
 * @Description: 播放器控制面板
-->
<template>
  <div class="mode-selector">
    <div class="mode-tabs">
      <div
        class="mode-tab"
        :class="{ active: currentMode === 'live' }"
        @click="$emit('switch-mode', 'live')"
      >
        {{ t("ui.example.stats.live") }}
      </div>
      <div
        class="mode-tab"
        :class="{ active: currentMode === 'vod' }"
        @click="$emit('switch-mode', 'vod')"
      >
        {{ t("ui.example.stats.vod") }}
      </div>
    </div>
    <div class="mode-action"></div>
    <div class="advanced-options">
      <h2>{{ t("ui.example.stats.advancedOptions") }}</h2>
      <div class="option-group">
        <label v-if="currentMode === 'live'">
          <input
            type="checkbox"
            v-model="localOptions.lowLatency"
            @change="updateOptions"
          />
          {{ t("ui.multiScreen.settings.lowLatencyMode") }}
          <span class="status-text">{{
            t("ui.multiScreen.settings.lowLatencyHint")
          }}</span>
        </label>
        <label v-if="currentMode === 'live'">
          <input
            type="checkbox"
            v-model="localOptions.seekToLive"
            @change="updateOptions"
          />
          {{ t("ui.multiScreen.settings.autoChasing") }}
        </label>
        <label v-if="currentMode === 'live'">
          <input
            type="checkbox"
            v-model="localOptions.autoReconnect"
            @change="updateOptions"
          />
          {{ t("ui.multiScreen.settings.autoReconnect") }}
        </label>
        <label v-if="currentMode === 'vod'">
          <input
            type="checkbox"
            v-model="localOptions.autoplay"
            @change="updateOptions"
          />
          {{ t("ui.videoPlayback.autoplay") }}
        </label>
        <label>
          <input
            type="checkbox"
            v-model="localOptions.debug"
            @change="updateOptions"
          />
          {{ t("ui.multiScreen.settings.debugMode") }}
        </label>
      </div>

      <div class="option-row" v-if="currentMode === 'live'">
        <label>{{ t("ui.multiScreen.settings.maxRetryCount") }}:</label>
        <input
          type="number"
          v-model="localOptions.maxRetries"
          min="0"
          max="10"
          @change="updateOptions"
        />
      </div>

      <div class="option-row" v-if="currentMode === 'live'">
        <label>{{ t("ui.multiScreen.settings.retryInterval") }}:</label>
        <input
          type="number"
          v-model="localOptions.retryInterval"
          min="1000"
          max="10000"
          step="500"
          @change="updateOptions"
        />
      </div>

      <div class="option-row" v-if="currentMode === 'live'">
        <label>{{ t("ui.multiScreen.settings.maxRetryInterval") }}:</label>
        <input
          type="number"
          v-model="localOptions.maxRetryInterval"
          min="1000"
          max="10000"
          step="500"
          @change="updateOptions"
        />
      </div>

      <div class="option-row" v-if="currentMode === 'vod'">
        <label>{{ t("ui.videoPlayback.bufferSize") }}:</label>
        <input
          type="number"
          v-model="localOptions.bufferSize"
          min="0.5"
          max="10"
          step="0.5"
          @change="updateOptions"
        />
      </div>

      <div class="hardware-accel">
        <h3>{{ t("ui.videoPlayback.hwAccel.title") }}</h3>
        <div class="setting-item">
          <label>
            <input
              type="checkbox"
              v-model="localOptions.hwAccel"
              @change="updateOptions"
            />
            {{ t("ui.videoPlayback.hwAccel.enable") }}
          </label>
        </div>
        <div class="setting-item">
          <label>
            <input
              type="checkbox"
              v-model="localOptions.allowSoftwareRendering"
              @change="updateOptions"
            />
            {{ t("ui.videoPlayback.hwAccel.allowSoftware") }}
          </label>
        </div>
      </div>
    </div>
    <div class="status-container">
      <h2>{{ t("ui.example.stats.playerState") }}</h2>
      <div class="status-display">
        <div class="status-item">
          <strong>{{ t("ui.example.stats.state") }}:</strong>
          <span :class="'player-state ' + playerState">{{
            getStateText()
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from "vue";
import { useI18n } from "vue-i18n";
import { PLAYER_STATES } from "flv-player";

const { t } = useI18n();

const props = defineProps({
  currentMode: {
    type: String,
    required: true,
  },
  options: {
    type: Object,
    required: true,
  },
  playerState: {
    type: String,
    default: "uninitialized",
  },
  networkQuality: {
    type: String,
    default: "unknown",
  },
});

const emit = defineEmits(["switch-mode", "update-options"]);

// 本地选项状态，用于双向绑定
const localOptions = ref({ ...props.options });

// 监听props变化，更新本地选项
watch(
  () => props.options,
  (newOptions) => {
    localOptions.value = { ...newOptions };
  },
  { deep: true }
);

// 将更改通知给父组件
const updateOptions = () => {
  emit("update-options", { ...localOptions.value });
};

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
</script>

<style scoped lang="less">
.mode-selector {
  width: 400px;
  border-radius: 4px;
  margin-left: 10px;
  overflow: hidden;
}

.mode-tabs {
  display: flex;
  margin-bottom: 10px;
  border-bottom: 1px solid #444;
}

.mode-tab {
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid transparent;
  border-bottom: none;
  margin-right: 5px;
}

.mode-tab.active {
  background-color: #1890ff;
  border-color: #1890ff;
  border-radius: 4px 4px 0 0;
  font-weight: bold;
}

.mode-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  .mode-action-btn {
    background: #1890ff;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
  }
}

.advanced-options {
  background: #222;
  padding: 15px;
  border-radius: 4px;
}

h2 {
  margin-top: 0;
  color: #1890ff;
  font-size: 1.2rem;
  margin-bottom: 15px;
}

h3 {
  color: #1890ff;
  font-size: 1rem;
  margin: 15px 0 10px 0;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.option-group label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 0.9rem;
  color: #888;
  margin-left: 5px;
}

.option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.option-row input {
  width: 80px;
  padding: 5px;
  background: #333;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
}

.hardware-accel {
  margin-top: 15px;
  border-top: 1px solid #444;
  padding-top: 10px;
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.setting-item label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-container {
  margin-top: 20px;
}

.status-display {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.status-item {
  background: #333;
  padding: 10px;
  border-radius: 4px;
  flex: 1;
  min-width: 150px;
}

.player-state {
  padding: 3px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.player-state.LOADING {
  background-color: #e6a23c;
}
.player-state.READY {
  background-color: #409eff;
}
.player-state.PLAYING {
  background-color: #67c23a;
}
.player-state.PAUSED {
  background-color: #909399;
}
.player-state.ENDED {
  background-color: #606266;
}
.player-state.ERROR {
  background-color: #f56c6c;
}

.network-quality {
  padding: 3px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.network-quality.excellent {
  background-color: #67c23a;
}
.network-quality.good {
  background-color: #409eff;
}
.network-quality.fair {
  background-color: #e6a23c;
}
.network-quality.poor {
  background-color: #f56c6c;
}
.network-quality.unknown {
  background-color: #606266;
}
</style>
