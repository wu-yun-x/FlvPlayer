# `ws-flv`技术预研

## 一、背景与目标

### 业务需求

- 实时监控场景需要亚秒级延迟
- 视频回放需要支持精准进度控制
- 系统需兼容现代浏览器，无需插件支持
- 未来可扩展支持多种流媒体协议（HLS/DASH/MP4）

### 技术目标

1. 设计基于`ws-flv`的低延迟直播架构
2. 实现实时流与录像回放统一处理方案
3. 构建可扩展播放器框架，支持多协议扩展
4. 优化播放体验，降低卡顿率

## 二、核心技术选型

### 1. WebSocket-FLV协议栈

```mermaid
graph LR
A[视频源] --> B[FFmpeg转码]
B --> C[FLV封装]
C --> D[WebSocket传输]
D --> E[前端解码]
E --> F[视频渲染]
```

#### 核心优势

- **超低延迟**：端到端延迟0.5-1秒（HTTP-FLV为3-5秒）
- **高并发**：突破浏览器单域名`http`长链接6连接限制
- **高效传输**：二进制帧传输（Opcode 0x2）
- **实时性**：服务器主动推送，避免HTTP轮询

#### FLV关键特性

| 特性     | 说明        | 优势         |
| -------- | ----------- | ------------ |
| 封装格式 | 轻量级容器  | 适合流式传输 |
| 视频编码 | H.264/H.265 | 广泛兼容     |
| 音频编码 | AAC/MP3     | 低复杂度     |
| 文件结构 | Header+Tags | 易于解析     |

### 2. 解码库对比

| 特性         | mpegts.js  | jessibuca       | flv.js     |
| ------------ | ---------- | --------------- | ---------- |
| **解码方式** | 软解       | WebAssembly硬解 | 软解       |
| **延迟优化** | ★★★★       | ★★★★☆           | ★★★☆       |
| **设备兼容** | 主流浏览器 | 低端设备优化    | 主流浏览器 |
| **断流恢复** | 自动重连   | 手动重连        | 基础重连   |
| **维护状态** | 持续更新   | 活跃维护        | 停止更新   |
| **推荐场景** | 通用方案   | 硬件解码需求    | 旧系统兼容 |

**最终选型**：主推`mpegts.js`，特殊场景备选`jessibuca`

### 3. mpegts.js 详情

- 定义：一个基于 JavaScript 的 MPEG-TS/FLV 解码库，支持 Media Source Extensions (MSE)。

- 作用：负责将 `ws-flv` 流解码并推送到 HTML5 <video> 元素，实现无插件播放。

- 优势：

  - 支持直播和点播

  - 兼容性好，支持主流浏览器

  - 支持自定义缓冲、低延迟优化

  - 事件丰富，便于状态监控和 UI 交互

### 4.封装库的大致思路

+ 封装作用：简化调用，统一接口，增加错误处理、重连逻辑等
+ 封装思路：
  + 统一初始化参数（如 WebSocket 地址、播放器配置等）
  + 封装播放、暂停、重连、错误处理等常用功能
  + 提供事件回调（如播放开始、结束、错误等）
  + 兼容不同第三方库，方便后续切换
+ 好处：
  + 减少重复代码，提高开发效率
  + 统一接口，方便团队协作

  + 便于后续维护和扩展

### 5.实验展示

1. **Demo实现步骤**

   - **服务端**：使用Node.js + WebSocket库（如`ws`）搭建服务，集成`FFmpeg`||`OBS Studio`转码RTSP流为FLV。

   - **实时视频**：

     - ```mermaid
       sequenceDiagram
       participant Source as 视频源
       participant Server as 媒体服务器
       participant Client as 播放器
       
       Source->>Server: RTMP/RTSP流
       Server->>Server: 转码为FLV
       Server->>Client: WebSocket推送
       Client->>Client: 实时解码渲染
       Note right of Client: 动态缓冲调整
       ```

     - 使用`node-media-server`模拟服务端，可以使用`ffmpeg`||`OBS Studio`实现模拟服务端推送`ws-flv`实时视频推流。

     - 首帧优化：预加载关键帧

     - 追帧机制：延迟超阈值时自动跳帧(`mpegts.js`有自动追帧)

     - 断线重连：指数退避重连策略

   - **录像回放**：

     | 特性           | 实时流     | 录像回放        |
     | -------------- | ---------- | --------------- |
     | **数据源**     | 持续推流   | 存储分片        |
     | **缓冲策略**   | 最小化缓冲 | 预加载+按需请求 |
     | **播放控制**   | 播放/暂停  | 进度控制/跳转   |
     | **关键帧处理** | 实时追帧   | 关键帧定位      |

     - 使用http://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-480p.flv 来进行暂时模拟`http-flv`推流模式

   - **客户端**：通过`flv.js`连接WebSocket，渲染视频（示例代码见下文）。

2. **封装播放器库**

   - **功能设计**：支持实时流与回放模式切换、延迟优化（动态调整`currentTime`）。
   - **API设计**：提供统一的接口加载不同来源（WebSocket URL或本地文件）。



当前这个录像回放我当时问了一下孙博，问一下当前录像回放的话是要什么格式，他说和实时视频一直，只不过播放控制的功能













参考链接：

[WebSocket-FLV直播协议详解与实战应用-CSDN博客](https://blog.csdn.net/u014552102/article/details/133563788#:~:text=ws- flv （websocket,-flv）是一种直播协议，其基于WebSocket来传输FLV格式的 音视频。 可以用来替代rtmp，解决其需要浏览器端依赖flash的问题；替代http-flv，解决浏览器同域名请求的最大并发数限制导致的浏览器只能播放6路http-flv流的问题。)

[流媒体、直播解决方案及趋势_ws-flv-CSDN博客](https://blog.csdn.net/Run_Feng/article/details/121954201)

[以为 flv.js 直播超简单，结果被延迟和卡顿整疯了浏览器直播使用 flv.js 很简单，传入流地址就能播放。然而直播 - 掘金](https://juejin.cn/post/7299037876636663847)

[【RTSP流】使用flv.js + websocket播放rtsp视频流（h264）_flvjs播放websocket流-CSDN博客](https://blog.csdn.net/u013517229/article/details/123257726)

[Flv/Mpegts.js 介绍&优化延迟&踩坑什么是Flv.js Flv.js 是一个用于播放 FLV 格式视频的 J - 掘金](https://juejin.cn/post/7312294489220366336)

[构建基于Node.js的HTML5视频流媒体服务-CSDN博客](https://blog.csdn.net/weixin_31315007/article/details/148151427)
