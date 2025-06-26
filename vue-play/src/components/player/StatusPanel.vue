<!--
 * @Author: st004362
 * @Date: 2025-06-16 15:49:12
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-23 10:37:05
 * @Description: 播放器状态面板
-->
<template>
  <div class="status-panel">
    <div class="network-quality-panel">
      <h3>{{ t("ui.example.stats.networkQuality") }}</h3>
      <div class="network-quality-box" :class="networkQuality">
        {{ t("ui.example.stats.networkQuality") }}: {{ networkQuality }},
        {{ t("ui.example.stats.bitrate") }}: {{ bitrateInfo }},
        {{ t("ui.example.stats.bufferHealth") }}: {{ bufferHealth }}
      </div>
      <!-- 图表容器 -->
      <div class="chart-container">
        <canvas
          id="bitrateChart"
          width="600"
          height="200"
          ref="bitrateChart"
        ></canvas>
      </div>
    </div>

    <div class="hardware-info">
      <h3>{{ t("ui.example.stats.hardwareInfo") }}</h3>
      <pre id="hwAccelInfo">{{ hwAccelInfo }}</pre>
    </div>

    <div class="stats-info">
      <h3>{{ t("ui.example.stats.statsInfo") }}</h3>
      <pre>{{ statsInfo }}</pre>
    </div>

    <div class="events-log">
      <h3>{{ t("ui.example.stats.eventsLog") }}</h3>
      <div class="log-container">
        <div v-for="(log, index) in eventLogs" :key="index" class="log-entry">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-type">{{ log.type }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  networkQuality: {
    type: String,
    default: "unknown",
  },
  bitrateInfo: {
    type: String,
    default: "",
  },
  bufferHealth: {
    type: [String, Number],
    default: "未知",
  },
  hwAccelInfo: {
    type: String,
    default: "未加载",
  },
  statsInfo: {
    type: String,
    default: "未加载",
  },
  eventLogs: {
    type: Array,
    default: () => [],
  },
});

const bitrateChart = ref(null);

// 图表数据
const bitrateLabels = ref(Array(20).fill(""));
const bitrateData = ref(Array(20).fill(0));
let chart = null;

// 初始化图表
const initBitrateChart = () => {
  nextTick(() => {
    if (!bitrateChart.value) return;

    // 动态加载Chart.js
    import("chart.js/auto")
      .then((ChartModule) => {
        const Chart = ChartModule.default;

        // 销毁之前的图表实例（如果存在）
        if (chart) {
          chart.destroy();
        }

        // 创建图表
        const ctx = bitrateChart.value.getContext("2d");
        chart = new Chart(ctx, {
          type: "line",
          data: {
            labels: bitrateLabels.value,
            datasets: [
              {
                label: "网络速率 (kbps)",
                data: bitrateData.value,
                borderColor: "rgb(75, 192, 192)",
                tension: 0.1,
              },
            ],
          },
          options: {
            animation: false,
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      })
      .catch((error) => {
        console.error("加载Chart.js失败:", error);
      });
  });
};

// 更新图表数据
const updateChart = (data) => {
  if (!chart) return;

  const bitrate =
    data.realTimeBitrate > 0 ? data.realTimeBitrate : data.bitrate;

  // 创建新数组以避免反应性陷阱和无限递归
  const newLabels = [...bitrateLabels.value];
  const newData = [...bitrateData.value];

  // 移除第一个元素并添加新元素
  newLabels.shift();
  newLabels.push(new Date().toLocaleTimeString());

  newData.shift();
  newData.push(Math.round(bitrate / 1000));

  // 整体替换数组，而不是修改数组内容
  bitrateLabels.value = newLabels;
  bitrateData.value = newData;

  chart.update();
};

onMounted(() => {
  initBitrateChart();
});

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy();
    chart = null;
  }
});

// 暴露方法给父组件
defineExpose({
  updateChart,
});
</script>

<style scoped lang="less">
.status-panel {
  background: #222;
  padding: 15px;
  border-radius: 4px;
}

h3 {
  color: #1890ff;
  font-size: 1rem;
  margin: 15px 0 10px 0;
}

.network-quality-panel {
  margin-top: 20px;
}

.network-quality-box {
  background: #333;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  border-left: 4px solid #409eff;
}

.network-quality-box.excellent {
  border-color: #67c23a;
}

.network-quality-box.good {
  border-color: #409eff;
}

.network-quality-box.fair {
  border-color: #e6a23c;
}

.network-quality-box.poor {
  border-color: #f56c6c;
}

.chart-container {
  background: #111;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.hardware-info,
.stats-info {
  margin-top: 20px;
}

.hardware-info pre,
.stats-info pre {
  background-color: #111;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
  font-family: monospace;
  color: #eee;
  white-space: pre-wrap;
}

.events-log {
  margin-top: 20px;
}

.log-container {
  background: #111;
  padding: 10px;
  border-radius: 4px;
  height: 200px;
  overflow-y: auto;
}

.log-entry {
  padding: 5px 0;
  border-bottom: 1px solid #333;
  font-family: monospace;
  display: flex;
  gap: 10px;
}

.log-time {
  color: #909399;
}

.log-type {
  min-width: 60px;
  color: #409eff;
}

.log-message {
  word-break: break-all;
}
</style>
