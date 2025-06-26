## 播放库封装设计

### 文件结构

```
/FlvPlayer
├── /src
│   ├── /core           // 播放器核心逻辑
│   ├── /adapters       // 协议适配层（mpegts.js、flv.js、hls.js等）
│   ├── /ui             // UI组件
│   ├── /utils          // 工具库
│   ├── constants.js    // 常量定义
│   └── config.js       // 配置管理
├── /examples           // 示例代码
├── package.json        // 依赖与脚本
└── README.md           // 文档              // 文档
```

### 2. 关键流程

- **流接入**：通过 ws-flv 协议获取 FLV 流
- **解码播放**：mpegts.js 解析 FLV 并推送到 video 元素
- **事件管理**：全局事件总线（EventBus）统一分发播放、错误、状态等事件
- **UI交互**：UI 组件响应事件，驱动用户操作

### 3. 主要类与接口

- `Player`：播放器核心，负责生命周期、协议适配、事件分发
- `MpegtsAdapter`：mpegts.js 适配器，解耦底层解码库与播放器
- `EventBus`：全局事件系统，支持多模块解耦通信

## 实现要点

### 1. ws-flv 流接入
- 通过 WebSocket 连接后端推流服务
- 实时接收 FLV 数据片段，推送给 mpegts.js

### 2. mpegts.js 解码与播放

- 通过 `mpegts.createPlayer({ type: 'flv', url, ... })` 创建实例
- 支持直播（isLive）、点播等多种模式
- 支持自定义缓冲、低延迟参数
- 事件绑定：错误、统计、媒体信息等

### 3. 播放器封装

- 统一 API（play、pause、seek、destroy 等）
- 支持多协议适配（未来可扩展 flv.js、hls.js 等）
- 状态机管理播放状态，提升健壮性

### 4. UI 组件

- 支持进度条、缩略图、音量、全屏等常用控件
- 结构化分区，便于自定义和扩展
- 事件驱动，响应播放器状态变化

---

## 后续扩展与演进

### 1. 协议适配层扩展

- **HLS 支持**：集成 hls.js，适配 HLS 协议流
- **DASH 支持**：集成 dash.js，适配 DASH 协议流
- **MP4 回放**：支持原生 MP4 文件播放

### 2. UI 组件扩展

- 画中画（PIP）、截图、倍速、画质切换等
- 主题皮肤、响应式布局

### 3. 高级功能

- 自动重连、断点续播
- 统计与监控（卡顿、延迟、码率等）
- 多路流切换、AB测试
- 插件机制，支持第三方功能扩展

## 接口示例

```js
const player = new FlvPlayer({
  container: '#video-container',
  url: 'ws://localhost:8000/live/stream.flv',
  isLive: true,
  autoplay: true,
  ui: { controls: true, progress: true },
  adapter: 'mpegts', // 未来可选 'flvjs', 'hlsjs', 'native'
  // 其他配置...
});

player.on('ready', () => console.log('Player ready'));
player.on('playing', () => console.log('Playing'));
player.on('error', (error) => console.error('Error:', error));

player.play();
player.pause();
player.seek(30);
player.destroy();
```

---

## 总结

本播放库以 ws-flv + mpegts.js 为核心，兼顾低延迟、可扩展和易用性。通过模块化设计和协议适配层，未来可平滑扩展 HLS、DASH、MP4 等多种流媒体协议，并支持丰富的 UI 组件和高级功能，满足多样化的业务需求。

---



# FlvPlayer优化需求

## 核心目标

1. 降低实时播放延迟至<500ms（参考海康设备）
2. 实现多分屏UI组件支持新功能

## 技术参数

- 框架：Vue 3 Composition API
- 核心库：mpegts.js
- 协议：WebSocket-FLV
- 目标平台：Web/H5

## 功能需求

### 延迟优化

- [ ] 网络传输层优化（WebSocket低延迟模式）
- [ ] 解码器参数调优（缓冲策略调整）
- [ ] 实时帧管理（智能丢帧算法）
- [ ] 硬件加速支持检测与启用
- [ ] 性能监控面板

### 多分屏UI组件

- [ ] 支持1/4/9/16分屏布局
- [ ] 本地抓拍功能（JPEG格式）
- [ ] 本地录像功能（MP4格式）
- [ ] 全屏模式优化（单屏/全局）
- [ ] 多语言支持（中/英/越）

## 参考系统

1. 海康设备客户端：http://10.1.25.190
   - 关注：实时流延迟表现
   - 注意：硬件加速实现方式

2. 现有H5播放器：http://10.1.16.6/wiki/san-player/demo/
   - 参考：UI交互设计
   - 借鉴：多分屏实现方案

## 输出要求

1. 详细技术方案文档
2. 核心代码实现示例
3. 性能优化指标对比表
4. 多语言资源文件结构
   此方案完全基于现有播放库架构设计，聚焦解决延迟问题和实现新功能需求，同时保持协议适配层的可扩展性。建议优先实施延迟优化，再进行UI组件开发，最后进行系统集成测试。