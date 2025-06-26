/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-13 10:33:27
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


// 延迟监控阈值配置
export const LATENCY_THRESHOLDS = {
    WARNING: 2,              // 延迟警告阈值（秒）
    CRITICAL: 5,             // 延迟严重阈值（秒）
    EMERGENCY: 10            // 延迟紧急阈值（秒）
}

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
    // 正在重连
    RECONNECTING: 'reconnecting',
    // 重连失败
    RECONNECT_FAILED: 'reconnectFailed',
    // 网络质量变化事件
    NETWORK_QUALITY_CHANGE: 'network_quality_change',
    // UI更新事件
    UI_UPDATE: 'ui_update',
    // 硬件加速信息
    HW_ACCEL_INFO: 'hw_accel_info',
    // 硬件加速设置变更事件
    HW_ACCEL_CHANGED: 'hw_accel_changed',
    // 延迟相关事件
    LATENCY_WARNING: 'latency_warning',       // 延迟警告
    LATENCY_CRITICAL: 'latency_critical',     // 延迟严重
    LATENCY_EMERGENCY: 'latency_emergency',   // 延迟紧急
    LATENCY_NORMAL: 'latency_normal',         // 延迟恢复正常
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
    // 基础重试间隔(毫秒)
    retryInterval: 3000,
    // 最大重试间隔(毫秒)
    maxRetryInterval: 5000,
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

/**
 * 网络质量配置常量
 */
export const NETWORK_QUALITY = {
    EXCELLENT: 'excellent',
    NORMAL: 'normal',
    POOR: 'poor'
};

/**
 * 网络质量对应的缓冲区配置
 */

export const BUFFER_CONFIGS = {
    // 优质网络
    excellent: {
        enableStashBuffer: false,
        stashInitialSize: 64,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 0.5,
        lazyLoadMaxDuration: 0.3,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 0.5,
        liveBufferLatencyMinRemain: 0.1
    },
    // 一般网络
    normal: {
        enableStashBuffer: false,
        stashInitialSize: 128,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 1,
        lazyLoadMaxDuration: 0.5,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1,
        liveBufferLatencyMinRemain: 0.2
    },
    // 较差网络
    poor: {
        enableStashBuffer: false,
        stashInitialSize: 256,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 2,
        lazyLoadMaxDuration: 1,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 2,
        liveBufferLatencyMinRemain: 0.5
    }
}


