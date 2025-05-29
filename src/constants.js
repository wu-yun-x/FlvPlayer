/*
 * @Author: st004362
 * @Date: 2025-05-28 17:20:15
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 15:53:04
 * @Description: 定义播放器常量
 */

/**
 * 播放器状态常量
 */
export const PLAYER_STATES = {
    // 初始状态，播放器刚创建
    IDLE: 'idle',
    // 初始化完成
    INITIALIZED: 'initialized',
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
    // 正在销毁
    DESTROYING: 'destroying',
    // 已销毁
    DESTROYED: 'destroyed',
    // 正在缓冲
    BUFFERING: 'buffering'
};

/**
 * 播放器事件常量
 */
export const PLAYER_EVENTS = {
    // 播放器初始化完成
    INITIALIZED: 'initialized',
    // 播放器状态变化
    STATE_CHANGE: 'stateChange',
    // 开始加载资源
    LOADING: 'loading',
    // 资源加载完成，准备就绪
    READY: 'ready',
    // 开始播放
    PLAY: 'play',
    // 暂停播放
    PAUSE: 'pause',
    // 播放结束
    ENDED: 'ended',
    // 发生错误
    ERROR: 'error',
    // 时间更新
    TIME_UPDATE: 'timeUpdate',
    // 进度更新
    PROGRESS: 'progress',
    // 音量变化
    VOLUME_CHANGE: 'volumeChange',
    // 静音
    MUTE: 'mute',
    // 取消静音
    UNMUTE: 'unmute',
    // 开始跳转
    SEEKING: 'seeking',
    // 跳转完成
    SEEKED: 'seeked',
    // 正在缓冲
    WAITING: 'waiting',
    // 可以播放
    CAN_PLAY: 'canPlay',
    // 可以流畅播放
    CAN_PLAY_THROUGH: 'canPlayThrough',
    // 视频尺寸变化
    RESIZE: 'resize',
    // 全屏变化
    FULLSCREEN_CHANGE: 'fullscreenChange',
    // 画中画变化
    PIP_CHANGE: 'pipChange',
    // 播放速率变化
    RATE_CHANGE: 'rateChange',
    // 字幕变化
    TEXT_TRACK_CHANGE: 'textTrackChange',
    // 画质变化
    QUALITY_CHANGE: 'qualityChange',
    // 统计信息更新
    STATS_UPDATE: 'statsUpdate',
    // 销毁
    DESTROY: 'destroy'
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
    FLVJS: 'flvjs',
    HLSJS: 'hlsjs',
    DASHJS: 'dashjs',
    NATIVE: 'native'
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
 * UI组件类型常量
 */
export const UI_COMPONENT_TYPES = {
    // 播放/暂停按钮
    PLAY_PAUSE: 'playPause',
    // 进度条
    PROGRESS: 'progress',
    // 时间显示
    TIME_DISPLAY: 'timeDisplay',
    // 音量控制
    VOLUME: 'volume',
    // 全屏按钮
    FULLSCREEN: 'fullscreen',
    // 画中画按钮
    PIP: 'pip',
    // 设置按钮
    SETTINGS: 'settings',
    // 缩略图
    THUMBNAIL: 'thumbnail'
};

/**
 * 统计信息类型常量
 */
export const STATS_TYPES = {
    // 视频帧率
    FPS: 'fps',
    // 丢帧率
    DROP_FRAME_RATE: 'dropFrameRate',
    // 当前码率
    BITRATE: 'bitrate',
    // 总加载时间
    TOTAL_LOAD_TIME: 'totalLoadTime',
    // 首帧加载时间
    FIRST_FRAME_TIME: 'firstFrameTime',
    // 缓冲区长度
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
    controls: false,
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
    // UI配置
    ui: {
        enabled: true,
        components: [
            UI_COMPONENT_TYPES.PLAY_PAUSE,
            UI_COMPONENT_TYPES.PROGRESS,
            UI_COMPONENT_TYPES.TIME_DISPLAY,
            UI_COMPONENT_TYPES.VOLUME,
            UI_COMPONENT_TYPES.FULLSCREEN
        ]
    }
};
