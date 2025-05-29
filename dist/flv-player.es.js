import s from "mpegts.js";
class p {
  constructor() {
    this._events = {};
  }
  on(e, t) {
    return this._events[e] || (this._events[e] = []), this._events[e].push(t), this;
  }
  off(e, t) {
    if (!this._events[e]) return this;
    if (!t)
      return delete this._events[e], this;
    const i = this._events[e].indexOf(t);
    return i !== -1 && (this._events[e].splice(i, 1), this._events[e].length === 0 && delete this._events[e]), this;
  }
  once(e, t) {
    const i = (...r) => {
      this.off(e, i), t.apply(this, r);
    };
    return i.originalListener = t, this.on(e, i);
  }
  emit(e, ...t) {
    return this._events[e] ? ([...this._events[e]].forEach((r) => {
      try {
        r.apply(this, t);
      } catch (l) {
        console.error(`Error in event listener for ${e}:`, l);
      }
    }), !0) : !1;
  }
}
const a = {
  // 初始状态，播放器刚创建
  IDLE: "idle",
  // 初始化完成
  INITIALIZED: "initialized",
  // 正在加载资源
  LOADING: "loading",
  // 资源已加载，准备就绪可以播放
  READY: "ready",
  // 正在播放
  PLAYING: "playing",
  // 已暂停
  PAUSED: "paused",
  // 播放结束
  ENDED: "ended",
  // 发生错误
  ERROR: "error",
  // 正在销毁
  DESTROYING: "destroying",
  // 已销毁
  DESTROYED: "destroyed",
  // 正在缓冲
  BUFFERING: "buffering"
}, n = {
  // 播放器初始化完成
  INITIALIZED: "initialized",
  // 播放器状态变化
  STATE_CHANGE: "stateChange",
  // 开始加载资源
  LOADING: "loading",
  // 资源加载完成，准备就绪
  READY: "ready",
  // 开始播放
  PLAY: "play",
  // 暂停播放
  PAUSE: "pause",
  // 播放结束
  ENDED: "ended",
  // 发生错误
  ERROR: "error",
  // 时间更新
  TIME_UPDATE: "timeUpdate",
  // 进度更新
  PROGRESS: "progress",
  // 音量变化
  VOLUME_CHANGE: "volumeChange",
  // 静音
  MUTE: "mute",
  // 取消静音
  UNMUTE: "unmute",
  // 开始跳转
  SEEKING: "seeking",
  // 跳转完成
  SEEKED: "seeked",
  // 正在缓冲
  WAITING: "waiting",
  // 可以播放
  CAN_PLAY: "canPlay",
  // 可以流畅播放
  CAN_PLAY_THROUGH: "canPlayThrough",
  // 视频尺寸变化
  RESIZE: "resize",
  // 全屏变化
  FULLSCREEN_CHANGE: "fullscreenChange",
  // 画中画变化
  PIP_CHANGE: "pipChange",
  // 播放速率变化
  RATE_CHANGE: "rateChange",
  // 字幕变化
  TEXT_TRACK_CHANGE: "textTrackChange",
  // 画质变化
  QUALITY_CHANGE: "qualityChange",
  // 统计信息更新
  STATS_UPDATE: "statsUpdate",
  // 销毁
  DESTROY: "destroy"
}, o = {
  // 网络错误
  NETWORK_ERROR: "networkError",
  // 媒体错误
  MEDIA_ERROR: "mediaError",
  // 解码错误
  DECODE_ERROR: "decodeError",
  // 格式不支持
  NOT_SUPPORTED: "notSupported",
  // 超时
  TIMEOUT: "timeout",
  // 权限错误
  PERMISSION_ERROR: "permissionError",
  // 初始化错误
  INIT_ERROR: "initError",
  // 加载错误
  LOAD_ERROR: "loadError",
  // 未知错误
  UNKNOWN: "unknown"
}, h = {
  // FLV格式
  FLV: "flv",
  // HLS格式
  HLS: "hls",
  // DASH格式
  DASH: "dash",
  // MP4格式
  MP4: "mp4",
  // 原生HTML5支持的格式
  NATIVE: "native"
}, m = {
  MPEGTS: "mpegts",
  FLVJS: "flvjs",
  HLSJS: "hlsjs",
  DASHJS: "dashjs",
  NATIVE: "native"
}, R = {
  // 直播模式
  LIVE: "live",
  // 点播模式
  VOD: "vod"
}, d = {
  // WebSocket连接
  WEBSOCKET: "websocket",
  // HTTP连接
  HTTP: "http",
  // HTTPS连接
  HTTPS: "https",
  // 本地文件
  LOCAL: "local"
}, c = {
  // 播放/暂停按钮
  PLAY_PAUSE: "playPause",
  // 进度条
  PROGRESS: "progress",
  // 时间显示
  TIME_DISPLAY: "timeDisplay",
  // 音量控制
  VOLUME: "volume",
  // 全屏按钮
  FULLSCREEN: "fullscreen"
}, u = {
  // 自动播放
  autoplay: !1,
  // 静音
  muted: !1,
  // 是否为直播
  isLive: !1,
  // 显示控制栏
  controls: !1,
  // 默认音量
  volume: 1,
  // 最大错误重试次数
  maxErrorRetries: 3,
  // 重试间隔(毫秒)
  retryInterval: 3e3,
  // 调试模式
  debug: !1,
  // 默认适配器
  adapter: m.MPEGTS,
  // 播放模式
  playMode: R.LIVE,
  // 缓冲区大小(秒)
  bufferSize: 0.5,
  // 低延迟模式
  lowLatency: !0,
  // UI配置
  ui: {
    enabled: !0,
    components: [
      c.PLAY_PAUSE,
      c.PROGRESS,
      c.TIME_DISPLAY,
      c.VOLUME,
      c.FULLSCREEN
    ]
  }
};
class _ extends p {
  constructor(e = {}) {
    super(), this.options = this._mergeOptions(e), this.state = a.IDLE, this.container = null, this.videoElement = null, this.errorCount = 0, this.maxErrorRetries = this.options.maxErrorRetries || u.maxErrorRetries, this.retryTimer = null, this._init();
  }
  _mergeOptions(e) {
    return { ...{
      ...u,
      ...e
    } };
  }
  _init() {
    this._initContainer(), this._initVideoElement(), this._bindEvents(), this.setState(a.INITIALIZED), this.emit(n.INITIALIZED, this), this.options.url && this.load(this.options.url);
  }
  _initContainer() {
    const { container: e } = this.options;
    if (typeof e == "string")
      this.container = document.querySelector(e);
    else if (e instanceof HTMLElement)
      this.container = e;
    else
      throw new Error("Container must be a CSS selector string or HTMLElement");
    if (!this.container)
      throw new Error("Container element not found");
  }
  _initVideoElement() {
    this.videoElement = document.createElement("video"), this.videoElement.className = "flv-player-video", this.options.controls && (this.videoElement.controls = !0), this.videoElement.muted = !!this.options.muted, this.videoElement.volume = this.options.volume, this.videoElement.style.width = "100%", this.videoElement.style.height = "100%", this.videoElement.oncontextmenu = () => !1, this.options.isLive && (this.videoElement.preload = "none"), this.container.appendChild(this.videoElement);
  }
  _bindEvents() {
    [
      "play",
      "pause",
      "ended",
      "timeupdate",
      "seeking",
      "seeked",
      "volumechange",
      "waiting",
      "playing",
      "canplay"
    ].forEach((t) => {
      this.videoElement.addEventListener(t, (i) => {
        this.emit(t, i), this._log(`Video event: ${t}`);
      });
    }), this.videoElement.addEventListener("error", this._handleError.bind(this));
  }
  setState(e) {
    const t = this.state;
    this.state = e, this.emit(n.STATE_CHANGE, { prevState: t, currentState: e }), this._log(`State changed from ${t} to ${e}`);
  }
  getState() {
    return this.state;
  }
  load(e) {
    this.options.url = e, this.setState(a.LOADING), this.emit(n.LOADING, { url: e }), this._log(`Loading URL: ${e}`);
  }
  // 抽象方法需要子类实现
  play() {
    throw new Error("Method not implemented");
  }
  pause() {
    throw new Error("Method not implemented");
  }
  seek(e) {
    throw new Error("Method not implemented");
  }
  setVolume(e) {
    if (e < 0 || e > 1)
      throw new Error("Volume must be between 0 and 1");
    this.videoElement.volume = e, this.options.volume = e, this.emit(n.VOLUME_CHANGE, { volume: e }), this._log(`Volume set to ${e}`);
  }
  mute() {
    this.videoElement.muted = !0, this.emit(n.MUTE, {}), this._log("Player muted");
  }
  unmute() {
    this.videoElement.muted = !1, this.emit(n.UNMUTE, {}), this._log("Player unmuted");
  }
  _clearRetryTimer() {
    this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null);
  }
  _handleError(e) {
    this.errorCount++, this.setState(a.ERROR);
    const t = {
      type: o.UNKNOWN,
      message: "An unknown error occurred",
      originalError: e,
      count: this.errorCount
    };
    if (e && e.target && e.target.error) {
      const i = e.target.error;
      switch (t.code = i.code, t.message = i.message, i.code) {
        case 1:
          t.type = o.MEDIA_ERROR, t.message = "Media resource not found";
          break;
        case 2:
          t.type = o.NETWORK_ERROR, t.message = "Network error occurred during playback";
          break;
        case 3:
          t.type = o.DECODE_ERROR, t.message = "Media decoding error";
          break;
        case 4:
          t.type = o.NOT_SUPPORTED, t.message = "Media format not supported";
          break;
      }
    }
    if (this.emit(n.ERROR, t), this._log(`Error: ${t.message}`, "error"), this.options.autoReconnect !== !1 && this.errorCount <= this.maxErrorRetries && this.options.url) {
      this._clearRetryTimer();
      const i = Math.min(
        this.options.retryInterval * Math.pow(1.5, this.errorCount - 1),
        1e4
        // 最大10秒
      );
      this._log(`Retrying playback (${this.errorCount}/${this.maxErrorRetries}) in ${i}ms...`), this.retryTimer = setTimeout(() => {
        this.state !== a.DESTROYED && this.load(this.options.url);
      }, i);
    }
  }
  destroy() {
    this.setState(a.DESTROYING), this._clearRetryTimer(), this.videoElement && ([
      "play",
      "pause",
      "ended",
      "timeupdate",
      "seeking",
      "seeked",
      "volumechange",
      "waiting",
      "playing",
      "canplay",
      "error"
    ].forEach((t) => {
      this.videoElement.removeEventListener(t, () => {
      });
    }), this.videoElement.parentNode && this.videoElement.parentNode.removeChild(this.videoElement), this.videoElement = null), this._events = {}, this.setState(a.DESTROYED), this._log("Player destroyed");
  }
  _log(e, t = "info") {
    if (!this.options.debug) return;
    const i = "[FlvPlayer]";
    switch (t) {
      case "error":
        console.error(`${i} ${e}`);
        break;
      case "warn":
        console.warn(`${i} ${e}`);
        break;
      case "info":
      default:
        console.log(`${i} ${e}`);
    }
  }
}
class y {
  constructor(e, t = {}) {
    if (!s || !s.isSupported())
      throw new Error("mpegts.js is not supported in this browser");
    this.videoElement = e, this.options = t, this.player = null, this.eventHandlers = {}, this.mediaInfo = null, this.statisticsInfo = null, this.retryTimes = 0, this.maxRetryTimes = t.maxErrorRetries || 3, this.retryInterval = t.retryInterval || 3e3, this.isLive = t.isLive || !1, this.currentUrl = "", this.connectionState = {
      isConnecting: !1,
      isConnected: !1,
      lastConnectTime: 0,
      reconnectTimer: null
    }, this.bufferCleanupTimer = null;
  }
  /**
   * 初始化mpegts.js播放器
   */
  init() {
    if (this.options.debug ? (s.LoggingControl.enableVerbose = !0, s.LoggingControl.enableInfo = !0, s.LoggingControl.enableDebug = !0) : (s.LoggingControl.enableVerbose = !1, s.LoggingControl.enableInfo = !1, s.LoggingControl.enableDebug = !1), !s.getFeatureList().mseLivePlayback)
      throw new Error("MSE live playback is not supported in this browser");
    return this;
  }
  /**
   * 加载视频流
   * @param {string} url - 视频流URL
   * @param {boolean} isLive - 是否为直播流
   */
  load(e, t = this.isLive) {
    if (!e)
      throw new Error("URL is required");
    if (this.currentUrl === e && this.player && this.connectionState.isConnected)
      return console.log("Already connected to this URL, ignoring duplicate load request"), !0;
    this.connectionState.isConnecting && this._clearReconnectTimer(), this._clearBufferCleanupTimer(), this.currentUrl = e, this.isLive = t, this.connectionState.isConnecting = !0, this.connectionState.isConnected = !1, this.connectionState.lastConnectTime = Date.now(), this.destroy();
    const i = this._getUrlType(e), r = this._getMediaType(e), l = this._createPlayerConfig(e, i, r);
    try {
      return this.player = s.createPlayer(l), this._bindEvents(), this.player.attachMediaElement(this.videoElement), this.player.load(), this.isLive && this.options.lowLatency && this._startBufferCleanup(), !0;
    } catch (f) {
      return this.connectionState.isConnecting = !1, this._emitError(o.INIT_ERROR, "Failed to create mpegts.js player", f), !1;
    }
  }
  /**
   * 播放视频
   */
  play() {
    if (!this.player) return !1;
    const e = this.videoElement.play();
    return e !== void 0 && e.catch((t) => {
      t.name === "NotAllowedError" ? this._emitError(o.PERMISSION_ERROR, "Autoplay was prevented", t) : this._emitError(o.MEDIA_ERROR, "Failed to play video", t);
    }), !0;
  }
  /**
   * 暂停视频
   */
  pause() {
    return this.player ? (this.videoElement.pause(), !0) : !1;
  }
  /**
   * 跳转到指定时间
   * @param {number} time - 跳转时间（秒）
   */
  seek(e) {
    return !this.player || this.isLive ? !1 : (this.player.currentTime = e, !0);
  }
  /**
   * 设置音量
   * @param {number} volume - 音量（0-1）
   */
  setVolume(e) {
    return this.player ? (this.videoElement.volume = Math.max(0, Math.min(1, e)), !0) : !1;
  }
  /**
   * 获取媒体信息
   * @returns {Object} 媒体信息
   */
  getMediaInfo() {
    return this.mediaInfo;
  }
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStatisticsInfo() {
    return this.statisticsInfo;
  }
  /**
   * 销毁播放器
   */
  destroy() {
    if (this._clearReconnectTimer(), this._clearBufferCleanupTimer(), this.connectionState.isConnecting = !1, this.connectionState.isConnected = !1, this.player)
      try {
        this._unbindEvents(), this.player.unload(), this.player.detachMediaElement(), this.player.destroy(), this.player = null, this.mediaInfo = null, this.statisticsInfo = null, this.retryTimes = 0;
      } catch (e) {
        console.error("Error while destroying mpegts player:", e);
      }
  }
  /**
   * 注册事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(e, t) {
    this.eventHandlers[e] || (this.eventHandlers[e] = []), this.eventHandlers[e].push(t);
  }
  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(e, t) {
    if (!this.eventHandlers[e]) return;
    if (!t) {
      delete this.eventHandlers[e];
      return;
    }
    const i = this.eventHandlers[e].indexOf(t);
    i !== -1 && (this.eventHandlers[e].splice(i, 1), this.eventHandlers[e].length === 0 && delete this.eventHandlers[e]);
  }
  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @private
   */
  _emit(e, t) {
    this.eventHandlers[e] && this.eventHandlers[e].forEach((i) => {
      try {
        i(t);
      } catch (r) {
        console.error(`Error in event handler for ${e}:`, r);
      }
    });
  }
  /**
   * 触发错误事件
   * @param {string} type - 错误类型
   * @param {string} message - 错误信息
   * @param {Error} originalError - 原始错误
   * @private
   */
  _emitError(e, t, i) {
    const r = {
      type: e,
      message: t,
      originalError: i
    };
    this._emit(n.ERROR, r);
  }
  /**
   * 绑定mpegts.js事件
   * @private
   */
  _bindEvents() {
    if (!this.player) return;
    this._eventHandlers = {}, this._eventHandlers.error = (t, i) => {
      let r = o.UNKNOWN, l = "Unknown error";
      switch (t) {
        case s.ErrorTypes.NETWORK_ERROR:
          r = o.NETWORK_ERROR, l = `Network error: ${i.message || "unknown"}`, this._tryReconnect();
          break;
        case s.ErrorTypes.MEDIA_ERROR:
          r = o.MEDIA_ERROR, l = `Media error: ${i.message || "unknown"}`;
          break;
        case s.ErrorTypes.OTHER_ERROR:
          i.code === -2 ? (r = o.DECODE_ERROR, l = "Decode error") : l = `Other error: ${i.message || "unknown"}`;
          break;
      }
      this._emitError(r, l, { errorType: t, errorDetail: i });
    }, this.player.on(s.Events.ERROR, this._eventHandlers.error), this._eventHandlers.mediaInfo = (t) => {
      this.mediaInfo = t, this.connectionState.isConnecting = !1, this.connectionState.isConnected = !0, this._emit(n.READY, { mediaInfo: t });
    }, this.player.on(s.Events.MEDIA_INFO, this._eventHandlers.mediaInfo), this._eventHandlers.statisticsInfo = (t) => {
      this.statisticsInfo = t, this._emit(n.STATS_UPDATE, { statisticsInfo: t });
    }, this.player.on(s.Events.STATISTICS_INFO, this._eventHandlers.statisticsInfo);
    const e = {
      [s.Events.LOADING_COMPLETE]: n.READY,
      [s.Events.RECOVERED_EARLY_EOF]: n.READY,
      [s.Events.METADATA_ARRIVED]: "metadataArrived",
      [s.Events.SCRIPTDATA_ARRIVED]: "scriptdataArrived",
      [s.Events.TIMED_ID3_METADATA_ARRIVED]: "timedID3MetadataArrived",
      [s.Events.PES_PRIVATE_DATA_DESCRIPTOR]: "pesPrivateDataDescriptor",
      [s.Events.PES_PRIVATE_DATA_ARRIVED]: "pesPrivateDataArrived",
      [s.Events.SMPTE2038_METADATA_ARRIVED]: "smpte2038MetadataArrived"
    };
    this._eventHandlers.otherEvents = {}, Object.keys(e).forEach((t) => {
      const i = (r) => {
        this._emit(e[t], r);
      };
      this._eventHandlers.otherEvents[t] = i, this.player.on(t, i);
    });
  }
  /**
   * 解绑mpegts.js事件
   * @private
   */
  _unbindEvents() {
    if (!(!this.player || !this._eventHandlers)) {
      if (this._eventHandlers.error && this.player.off(s.Events.ERROR, this._eventHandlers.error), this._eventHandlers.mediaInfo && this.player.off(s.Events.MEDIA_INFO, this._eventHandlers.mediaInfo), this._eventHandlers.statisticsInfo && this.player.off(s.Events.STATISTICS_INFO, this._eventHandlers.statisticsInfo), this._eventHandlers.otherEvents) {
        const e = {
          [s.Events.LOADING_COMPLETE]: !0,
          [s.Events.RECOVERED_EARLY_EOF]: !0,
          [s.Events.METADATA_ARRIVED]: !0,
          [s.Events.SCRIPTDATA_ARRIVED]: !0,
          [s.Events.TIMED_ID3_METADATA_ARRIVED]: !0,
          [s.Events.PES_PRIVATE_DATA_DESCRIPTOR]: !0,
          [s.Events.PES_PRIVATE_DATA_ARRIVED]: !0,
          [s.Events.SMPTE2038_METADATA_ARRIVED]: !0
        };
        Object.keys(e).forEach((t) => {
          const i = this._eventHandlers.otherEvents[t];
          i && this.player.off(t, i);
        });
      }
      this._eventHandlers = null;
    }
  }
  /**
   * 清除重连定时器
   * @private
   */
  _clearReconnectTimer() {
    this.connectionState.reconnectTimer && (clearTimeout(this.connectionState.reconnectTimer), this.connectionState.reconnectTimer = null);
  }
  /**
   * 尝试重连
   * @private
   */
  _tryReconnect() {
    if (this.retryTimes >= this.maxRetryTimes || !this.currentUrl || this.connectionState.reconnectTimer) return;
    const t = Date.now() - this.connectionState.lastConnectTime;
    t < 1e3 && (console.log(`Reconnect too frequent, delaying. Last connect was ${t}ms ago`), this.retryInterval = Math.min(this.retryInterval * 1.5, 1e4)), this.retryTimes++, this._clearReconnectTimer(), this.connectionState.reconnectTimer = setTimeout(() => {
      this.player && (this._emit(n.LOADING, {
        url: this.currentUrl,
        retryTimes: this.retryTimes
      }), console.log(`Reconnecting (${this.retryTimes}/${this.maxRetryTimes}) to ${this.currentUrl}`), this.load(this.currentUrl, this.isLive));
    }, this.retryInterval);
  }
  /**
   * 获取URL类型
   * @param {string} url - URL
   * @returns {string} URL类型
   * @private
   */
  _getUrlType(e) {
    return e.startsWith("ws://") || e.startsWith("wss://") ? d.WEBSOCKET : e.startsWith("http://") ? d.HTTP : e.startsWith("https://") ? d.HTTPS : d.LOCAL;
  }
  /**
   * 获取媒体类型
   * @param {string} url - URL
   * @returns {string} 媒体类型
   * @private
   */
  _getMediaType(e) {
    switch (e.split("?")[0].split(".").pop().toLowerCase()) {
      case "flv":
        return h.FLV;
      case "m3u8":
        return h.HLS;
      case "mpd":
        return h.DASH;
      case "mp4":
        return h.MP4;
      default:
        return e.includes("flv") ? h.FLV : e.includes("m3u8") ? h.HLS : e.includes("mpd") ? h.DASH : e.includes("mp4") ? h.MP4 : h.FLV;
    }
  }
  /**
   * 创建mpegts.js播放器配置
   * @param {string} url - URL
   * @param {string} urlType - URL类型
   * @param {string} mediaType - 媒体类型
   * @returns {Object} 播放器配置
   * @private
   */
  _createPlayerConfig(e, t, i) {
    const r = {
      type: i.toLowerCase(),
      url: e,
      isLive: this.isLive,
      cors: !0,
      withCredentials: !1,
      hasAudio: !0,
      hasVideo: !0
    };
    return this.isLive ? (r.enableStashBuffer = !1, r.stashInitialSize = 32, r.liveBufferLatencyChasing = !0, r.liveBufferLatencyMaxLatency = 0.8, r.liveBufferLatencyMinRemain = 0.1, r.liveSync = !0, r.lazyLoad = !1, r.fixAudioTimestampGap = !0, r.seekType = "range", r.rangeLoadZeroStart = !1, r.forceKeyFrameOnDiscontinuity = !0, r.accurateSeek = !1, this.options.lowLatency && (r.liveBufferLatencyMaxLatency = 0.5, r.liveBufferLatencyMinRemain = 0.05, r.autoCleanupSourceBuffer = !0, r.autoCleanupMaxBackwardDuration = 1, r.autoCleanupMinBackwardDuration = 0.5)) : (r.enableStashBuffer = !0, r.stashInitialSize = 1024 * 64, r.lazyLoad = !0), this.options.mpegtsConfig && Object.assign(r, this.options.mpegtsConfig), r;
  }
  /**
   * 清除缓冲区清理定时器
   * @private
   */
  _clearBufferCleanupTimer() {
    this.bufferCleanupTimer && (clearInterval(this.bufferCleanupTimer), this.bufferCleanupTimer = null);
  }
  /**
   * 启动缓冲区定期清理
   * @private
   */
  _startBufferCleanup() {
    this._clearBufferCleanupTimer(), this.bufferCleanupTimer = setInterval(() => {
      if (!(!this.player || !this.isLive))
        try {
          const e = this.videoElement;
          if (!e || !e.buffered || e.buffered.length === 0) return;
          const t = e.currentTime, i = e.buffered.end(e.buffered.length - 1), r = i - t;
          if (r > 2 && (this.options.debug && console.log(`缓冲区过大 (${r.toFixed(2)}s)，尝试清理...`), this.player.cleanupSourceBuffer && this.player.cleanupSourceBuffer(), r > 3 && this.player.currentTime)) {
            const l = i - 1;
            this.options.debug && console.log(`延迟过大，执行追帧: ${t.toFixed(2)}s -> ${l.toFixed(2)}s`), this.player.currentTime = l;
          }
        } catch (e) {
          console.error("Error during buffer cleanup:", e);
        }
    }, 5e3);
  }
}
class T extends _ {
  /**
   * FLV播放器构造函数
   * @param {Object} options - 播放器配置
   */
  constructor(e) {
    const i = { ...{
      lowLatency: !0,
      // 默认启用低延迟模式
      autoReconnect: !0,
      // 默认启用自动重连
      maxErrorRetries: 3,
      // 默认最大重试次数
      retryInterval: 2e3
      // 默认重试间隔
    }, ...e };
    (i.isLive || i.playMode === "live") && (i.liveBufferLatencyChasing = !0, i.lowLatency && (i.liveBufferLatencyMaxLatency = 0.5, i.liveBufferLatencyMinRemain = 0.05)), super(i), this._initAdapter();
  }
  /**
   * 初始化适配器
   * @private
   */
  _initAdapter() {
    try {
      this.adapter = new y(this.videoElement, this.options), this.adapter.init(), this._bindAdapterEvents(), this._log("Adapter initialized successfully");
    } catch (e) {
      this._handleError({
        type: o.INIT_ERROR,
        message: "Failed to initialize adapter",
        originalError: e
      });
    }
  }
  /**
   * 绑定适配器事件
   * @private
   */
  _bindAdapterEvents() {
    this.adapter.on(n.ERROR, (e) => {
      this._handleError(e);
    }), this.adapter.on(n.READY, (e) => {
      this.setState(a.READY), this.emit(n.READY, e);
    }), this.adapter.on(n.STATS_UPDATE, (e) => {
      if (this.emit(n.STATS_UPDATE, e), this.options.isLive && e.statisticsInfo && this.options.debug) {
        const t = e.statisticsInfo;
        t.currentSegmentIndex !== void 0 && t.decodedFrames !== void 0 && this._log(`当前延迟: ${t.currentTime !== void 0 ? t.currentTime.toFixed(2) : "N/A"}s, 缓冲: ${t.videoBuffered !== void 0 ? t.videoBuffered.toFixed(2) : "N/A"}s`);
      }
    }), this.adapter.on(n.LOADING, (e) => {
      this.setState(a.LOADING), this.emit(n.LOADING, e);
    }), this.adapter.on("metadataArrived", (e) => {
      this.emit("metadataArrived", e);
    });
  }
  /**
   * 加载视频
   * @param {string} url - 视频URL
   * @returns {boolean} - 加载是否成功
   */
  load(e) {
    super.load(e);
    try {
      return this.adapter.load(e, this.options.isLive) ? (this._log(`Successfully loaded URL: ${e}`), this.options.autoplay && this.play(), !0) : (this._handleError({
        type: o.LOAD_ERROR,
        message: `Failed to load URL: ${e}`
      }), !1);
    } catch (t) {
      return this._handleError({
        type: o.LOAD_ERROR,
        message: `Exception while loading URL: ${e}`,
        originalError: t
      }), !1;
    }
  }
  /**
   * 播放视频
   */
  play() {
    if (this.state !== a.PLAYING)
      try {
        this.adapter.play() && (this.setState(a.PLAYING), this.emit(n.PLAY), this._log("Started playback"));
      } catch (e) {
        this._handleError({
          type: o.MEDIA_ERROR,
          message: "Failed to start playback",
          originalError: e
        });
      }
  }
  /**
   * 暂停视频
   */
  pause() {
    if (this.state !== a.PAUSED)
      try {
        this.adapter.pause() && (this.setState(a.PAUSED), this.emit(n.PAUSE), this._log("Paused playback"));
      } catch (e) {
        this._handleError({
          type: o.MEDIA_ERROR,
          message: "Failed to pause playback",
          originalError: e
        });
      }
  }
  /**
   * 跳转到指定时间
   * @param {number} time - 跳转时间（秒）
   */
  seek(e) {
    if (this.options.isLive) {
      this._log("Seek is not supported in live mode", "warn");
      return;
    }
    try {
      this.adapter.seek(e) && (this.emit(n.SEEKING, { time: e }), this._log(`Seeking to ${e} seconds`));
    } catch (t) {
      this._handleError({
        type: o.MEDIA_ERROR,
        message: `Failed to seek to ${e} seconds`,
        originalError: t
      });
    }
  }
  /**
   * 设置音量
   * @param {number} volume - 音量（0-1）
   */
  setVolume(e) {
    super.setVolume(e);
    try {
      this.adapter.setVolume(e);
    } catch (t) {
      this._log(`Error setting volume: ${t.message}`, "warn");
    }
  }
  /**
   * 获取媒体信息
   * @returns {Object} 媒体信息
   */
  getMediaInfo() {
    return this.adapter ? this.adapter.getMediaInfo() : null;
  }
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStatisticsInfo() {
    return this.adapter ? this.adapter.getStatisticsInfo() : null;
  }
  /**
   * 销毁播放器
   */
  destroy() {
    if (this.adapter)
      try {
        this.adapter.destroy(), this.adapter = null;
      } catch (e) {
        this._log(`Error destroying adapter: ${e.message}`, "error");
      }
    super.destroy();
  }
  /**
   * 检查浏览器是否支持
   * @returns {boolean} 是否支持
   */
  static isSupported() {
    return s && s.isSupported();
  }
}
const g = "1.0.0", A = T.isSupported;
export {
  m as ADAPTER_TYPES,
  d as CONNECTION_TYPES,
  u as DEFAULT_CONFIG,
  o as ERROR_TYPES,
  T as FlvPlayer,
  h as MEDIA_TYPES,
  n as PLAYER_EVENTS,
  a as PLAYER_STATES,
  R as PLAY_MODES,
  T as default,
  A as isSupported,
  g as version
};
//# sourceMappingURL=flv-player.es.js.map
