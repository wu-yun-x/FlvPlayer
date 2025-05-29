## 播放库封装设计

### 文件结构

```
/FlvPlayer
├── /src
│   ├── /core
│   │   ├── BasePlayer.js       // 播放器基类
│   │   ├── FlvPlayer.js        // FLV播放器实现
│   │   ├── HlsPlayer.js        // HLS播放器实现(未来扩展)
│   │   └── DashPlayer.js       // DASH播放器实现(未来扩展)
│   ├── /ui
│   │   ├── ProgressBar.js      // 进度条组件
│   │   ├── ThumbnailBar.js     // 缩略图进度条
│   │   ├── ControlPanel.js     // 控制面板
│   │   └── PlayerUI.js         // UI组件管理器
│   ├── /utils
│   │   ├── EventEmitter.js     // 事件发射器
│   │   ├── StateMachine.js     // 状态机
│   │   └── Logger.js           // 日志工具
│   ├── /adapters
│   │   ├── MpegtsAdapter.js    // mpegts.js适配器
│   │   ├── FlvjsAdapter.js     // flv.js适配器(未来扩展)
│   │   └── HlsjsAdapter.js     // hls.js适配器(未来扩展)
│   ├── constants.js            // 常量定义
│   ├── config.js               // 配置管理
│   └── index.js                // 入口文件
├── /examples                   // 示例代码
├── /dist                       // 打包后的文件
├── package.json                // 项目配置
└── README.md                   // 文档
```

### 内容划分

#### 1. 核心模块 (core)

**BasePlayer.js**

- 定义播放器接口和共享功能
- 状态管理（准备中/播放中/暂停/错误）
- 事件系统（播放、暂停、错误等事件）
- 提供统一的API（play、pause、seek等）

**FlvPlayer.js**

- 继承BasePlayer
- 处理WebSocket-FLV和HTTP-FLV流
- 实现特定于FLV的功能

**HlsPlayer.js** (未来扩展)

- 继承BasePlayer
- 处理HLS流
- 实现特定于HLS的功能

**DashPlayer.js** (未来扩展)

- 继承BasePlayer
- 处理DASH流
- 实现特定于DASH的功能

#### 2. UI模块 (ui)

**ProgressBar.js**

- 实现进度条功能
- 显示缓冲进度
- 支持拖动定位

**ThumbnailBar.js**

- 实现带关键帧预览的缩略图进度条
- 鼠标悬停显示预览图

**ControlPanel.js**

- 实现播放控制面板（播放/暂停按钮、音量控制等）

**PlayerUI.js**

- 组合和管理所有UI组件
- 处理UI事件和状态更新

#### 3. 工具模块 (utils)

**EventEmitter.js**

- 实现事件发射和订阅系统

**StateMachine.js**

- 实现播放器状态管理
- 定义状态转换规则和回调

**Logger.js**

- 提供日志功能
- 支持不同级别的日志

#### 4. 适配器模块 (adapters)

**MpegtsAdapter.js**

- 适配mpegts.js库
- 转换API和事件

**FlvjsAdapter.js** (未来扩展)

- 适配flv.js库
- 转换API和事件

**HlsjsAdapter.js** (未来扩展)

- 适配hls.js库
- 转换API和事件

#### 5. 配置和常量

**constants.js**

- 定义播放器状态常量
- 定义事件类型常量
- 定义错误类型常量

**config.js**

- 默认配置管理
- 配置合并和验证

**index.js**

- 库的主入口
- 导出公共API

### 开发流程

1. **阶段一：核心功能**
   - 实现BasePlayer和FlvPlayer
   - 实现MpegtsAdapter
   - 实现基本的事件系统和状态管理
   - 支持WebSocket-FLV播放

2. **阶段二：UI组件**
   - 实现基本进度条
   - 实现播放控制面板
   - 集成UI组件到播放器

3. **阶段三：高级功能**
   - 实现缓冲进度显示
   - 实现缩略图预览功能
   - 完善状态机管理
   - 增加错误处理和自动重连

4. **阶段四：扩展支持**
   - 添加HLS支持
   - 添加DASH支持
   - 添加MP4回放支持

### 接口设计示例

```javascript
// 使用示例
const player = new FlvPlayer({
  container: '#video-container',
  url: 'ws://localhost:8000/live/stream.flv',
  isLive: true,
  autoplay: true,
  ui: {
    controls: true,
    progress: true,
    thumbnails: true
  },
  adapter: 'mpegts', // 或 'flvjs', 'hlsjs' 等
  // 其他配置...
});

// 注册事件
player.on('ready', () => console.log('Player ready'));
player.on('playing', () => console.log('Playing'));
player.on('error', (error) => console.error('Error:', error));

// 控制播放
player.play();
player.pause();
player.seek(30); // 跳转到30秒

// 销毁播放器
player.destroy();
```

这个设计为你提供了一个可扩展的播放库框架，可以逐步实现你需要的功能，并且易于维护和扩展。你可以根据实际需求调整文件结构和模块划分。