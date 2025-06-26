# 项目使用指南

## 项目架构

本项目由三个主要部分组成：
1. **FlvPlayer**：核心播放器库，支持FLV和MP4格式视频
2. **Server**：提供视频服务和流媒体支持的后端服务
3. **vue-play**：基于Vue的前端示例应用

## 安装与运行步骤

### 1. 构建 FlvPlayer 库

```bash
# 进入FlvPlayer目录
cd FlvPlayer

# 安装依赖
pnpm install
# 构建库(可有可无)
pnpm run build

```

构建后将在`dist`目录生成ES和UMD格式的库文件。

### 2. 启动后端服务

```bash
# 进入Server目录
cd Server

# 安装依赖
pnpm install

# 启动服务
node app.js
```

服务将在`http://localhost:8000`运行，提供视频点播和直播流。

### 3. 运行前端示例

```bash
# 进入vue-play目录
cd vue-play

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

前端应用将在`http://localhost:5173`(或其他vite默认端口)运行。

## 各组件详细说明

### 1. FlvPlayer

FlvPlayer是一个功能完整的视频播放器库，已配置为标准npm包，可以在项目中直接引用：

```javascript
// 导入播放器
import Player from 'flv-player';
import { PLAYER_STATES, PLAYER_EVENTS } from 'flv-player';

// 创建播放器实例
const player = new Player({
  container: document.getElementById('player-container'),
  mediaDataSource: {
    type: 'flv',  // 或 'mp4'
    url: 'http://localhost:8000/live/stream.flv',
    isLive: true
  }
});

// 监听事件
player.on(PLAYER_EVENTS.READY, () => {
  console.log('播放器已就绪');
});

// 控制播放
player.play();
```

主要特性：
- 支持FLV和MP4格式
- 适配点播和直播场景
- 内置延迟控制和网络监控
- 可配置硬件加速

### 2. Server

后端服务提供以下功能：
- `/video/*`：MP4视频点播服务
- `/live/*`：FLV流媒体直播服务
- `/api/simulate/*`：网络模拟API，用于测试

服务配置位于`config.js`，可根据需要修改端口、视频源目录等参数。

### 3. vue-play

Vue示例应用展示了FlvPlayer的完整使用方式，包括：
- 点播/直播模式切换
- 播放控制与状态显示
- 网络质量监控
- 参数配置界面

## 使用场景示例

### 直播场景

```javascript
// 在vue-play项目中使用直播模式
import { usePlayerManager } from './hooks/usePlayerManager';

const { initSinglePlayer, destroyPlayer } = usePlayerManager();

// 初始化直播播放器
const player = await initSinglePlayer(
  0,  // 播放器索引
  container,  // DOM容器
  'http://localhost:8000/live/stream.flv',  // 流地址
  {  // 配置选项
    maxRetryCount: 3,
    autoReconnect: true,
    lowLatencyMode: true,
    hardwareAcceleration: true
  },
  true  // 是否为直播
);
```

### 点播场景

```javascript
// 在vue-play项目中使用点播模式
const player = await initSinglePlayer(
  0,
  container,
  'http://localhost:8000/video/example.mp4',
  {
    autoReconnect: false,
    hardwareAcceleration: true,
    softwareFallback: true
  },
  false  // 非直播模式
);
```

## 高级配置选项

### 播放器配置

```javascript
const playerConfig = {
  // 基础设置
  container: document.getElementById('player-container'),
  controls: false,  // 是否显示内置控制条
  muted: true,
  
  // 视频源
  mediaDataSource: {
    type: 'flv',  // 'flv' 或 'mp4'
    url: 'http://localhost:8000/live/stream.flv',
    isLive: true,
  },
  
  // 连接设置
  connectionTimeout: 10000,  // 连接超时(毫秒)
  maxErrorRetries: 3,  // 最大重试次数
  autoReconnect: true,  // 自动重连
  
  // 性能设置
  enableHardwareAcceleration: true,  // 启用硬件加速
  softwareAcceleration: true,  // 允许软件渲染回退
  
  // mpegts配置
  mpegtsConfig: {
    enableWorker: true,
    stashInitialSize: 128,
    autoCleanupSourceBuffer: true,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 1.0,
    liveBufferLatencyMinRemain: 0.1,
    debug: false,
  },
};

const player = new Player(playerConfig);
```

### 事件监听

```javascript
import { PLAYER_EVENTS } from 'flv-player';

// 就绪事件
player.on(PLAYER_EVENTS.READY, () => {
  console.log('播放器已就绪');
});

// 错误事件
player.on(PLAYER_EVENTS.ERROR, (error) => {
  console.error('播放出错:', error);
});

// 状态变化
player.on(PLAYER_EVENTS.STATE_CHANGE, (state) => {
  console.log('播放器状态变更:', state);
});

// 网络质量变化
player.on(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE, (quality) => {
  console.log('网络质量:', quality);
});
```

## 常见问题处理

1. **直播延迟过高**：
   - 启用低延迟模式: `lowLatencyMode: true`
   - 调整latency参数: `liveBufferLatencyMaxLatency: 1.0`

2. **播放器卡顿**：
   - 检查网络连接
   - 尝试启用硬件加速: `enableHardwareAcceleration: true`
   - 调整缓冲区大小: `stashInitialSize: 256`

3. **连接频繁断开**：
   - 增加重试次数: `maxErrorRetries: 5`
   - 延长重试间隔: `retryInterval: 3000`

4. **播放器资源清理**：
   - 使用完毕后调用: `player.destroy()`
   - 可使用`cleanupContainer`方法清理DOM中残留的视频元素

## 集成到现有项目

1. 将FlvPlayer作为本地依赖添加到项目：
   ```bash
   pnpm add file:../path/to/FlvPlayer
   ```

2. 在项目中导入使用：
   ```javascript
   import Player, { PLAYER_STATES } from 'flv-player';
   ```

3. 按需配置并创建播放器实例：
   ```javascript
   const player = new Player({...配置项});
   ```

本项目提供了完整的视频播放解决方案，适用于各种Web视频播放场景，特别是低延迟直播应用。通过合理配置，可以获得流畅的播放体验和灵活的功能扩展。
