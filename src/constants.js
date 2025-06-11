/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-11 13:51:52
 * @Description: 播放器全局常量定义，包括事件、状态、适配器类型、播放模式等
 */

/**
 * 播放器状态常量
 */
export const PLAYER_STATES = {
    // 初始状态，播放器刚创建
    IDLE: 'idle',
    // 正在加载资源
    LOADING: 'loading',
    // 资源已加载，准备就绪可以播放
    READY: 'ready',
    // 正在播放
    PLAYING: 'playing',
    // 已暂停
    PAUSED: 'paused',
    // 播放结束
    ENDED: 'ended',
    // 发生错误
    ERROR: 'error',
    // 已销毁
    DESTROYED: 'destroyed',
    // 缓冲中
    BUFFERING: 'buffering',
    // 已初始化
    INITIALIZED: 'initialized',
    // 正在销毁
    DESTROYING: 'destroying'
};

// 新增常量
export const PLAYER_ACTIONS = {
    PLAY_TOGGLE: 'player/play_toggle',
    VOLUME_CHANGE: 'player/volume_change',
    SEEK: 'player/seek',
    GET_DURATION: 'player/get_duration'
};

/**
 * 播放器事件常量
 */
export const PLAYER_EVENTS = {
    // 播放器状态变化
    STATE_CHANGE: 'state_change',
    // 发生错误
    ERROR: 'error',
    // 时间更新
    TIME_UPDATE: 'timeupdate',
    // 进度更新
    PROGRESS: 'progress',
    // 开始播放
    PLAY: 'play',
    // 暂停播放
    PAUSE: 'pause',
    // 播放结束
    ENDED: 'ended',
    // 销毁
    DESTROY: 'destroy',
    // 统计更新
    STATS_UPDATE: 'stats_update',
    // 已初始化
    INITIALIZED: 'initialized',
    // 媒体信息
    MEDIA_INFO: 'media_info',
    // 重连请求
    RECONNECT_NEEDED: 'reconnect_needed'
};

/**
 * 错误类型常量
 */
export const ERROR_TYPES = {
    // 网络错误
    NETWORK_ERROR: 'networkError',
    // 媒体错误
    MEDIA_ERROR: 'mediaError',
    // 解码错误
    DECODE_ERROR: 'decodeError',
    // 格式不支持
    NOT_SUPPORTED: 'notSupported',
    // 超时
    TIMEOUT: 'timeout',
    // 权限错误
    PERMISSION_ERROR: 'permissionError',
    // 初始化错误
    INIT_ERROR: 'initError',
    // 加载错误
    LOAD_ERROR: 'loadError',
    // 未知错误
    UNKNOWN: 'unknown'
};

/**
 * 媒体类型常量
 */
export const MEDIA_TYPES = {
    // FLV格式
    FLV: 'flv',
    // HLS格式
    HLS: 'hls',
    // DASH格式
    DASH: 'dash',
    // MP4格式
    MP4: 'mp4',
    // 原生HTML5支持的格式
    NATIVE: 'native'
};

/**
 * 日志级别常量
 */
export const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

/**
 * 适配器类型常量
 */
export const ADAPTER_TYPES = {
    MPEGTS: 'mpegts',
    // 未来可扩展: FLVJS: 'flvjs', HLSJS: 'hlsjs', NATIVE: 'native'
};

/**
 * 播放模式常量
 */
export const PLAY_MODES = {
    // 直播模式
    LIVE: 'live',
    // 点播模式
    VOD: 'vod'
};

/**
 * 连接类型常量
 */
export const CONNECTION_TYPES = {
    // WebSocket连接
    WEBSOCKET: 'websocket',
    // HTTP连接
    HTTP: 'http',
    // HTTPS连接
    HTTPS: 'https',
    // 本地文件
    LOCAL: 'local'
};

/**
 * UI组件类型常量（可扩展）
 */
export const UI_COMPONENT_TYPES = {
    PLAY_PAUSE: 'play_pause',
    PROGRESS: 'progress',
    TIME_DISPLAY: 'time_display',
    VOLUME: 'volume',
    FULLSCREEN: 'fullscreen',
    PIP: 'pip',
    SETTINGS: 'settings',
    THUMBNAIL: 'thumbnail'
};

/**
 * 统计类型常量
 */
export const STATS_TYPES = {
    FPS: 'fps',
    DROP_FRAME_RATE: 'dropFrameRate',
    BITRATE: 'bitrate',
    TOTAL_LOAD_TIME: 'totalLoadTime',
    FIRST_FRAME_TIME: 'firstFrameTime',
    BUFFER_LENGTH: 'bufferLength'
};

/**
 * 默认配置常量
 */
export const DEFAULT_CONFIG = {
    // 自动播放
    autoplay: false,
    // 静音
    muted: false,
    // 是否为直播
    isLive: false,
    // 显示控制栏
    controls: true,
    // 默认音量
    volume: 1.0,
    // 最大错误重试次数
    maxErrorRetries: 3,
    // 重试间隔(毫秒)
    retryInterval: 3000,
    // 调试模式
    debug: false,
    // 默认适配器
    adapter: ADAPTER_TYPES.MPEGTS,
    // 播放模式
    playMode: PLAY_MODES.LIVE,
    // 缓冲区大小(秒)
    bufferSize: 0.5,
    // 低延迟模式
    lowLatency: true,
    // WebSocket连接建立超时时间
    connectionTimeout: 5000,
    // 首个媒体数据包接收超时时间
    dataTimeout: 5000,
};
