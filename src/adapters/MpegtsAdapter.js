/*
 * @Author: st004362
 * @Date: 2025-05-28 18:05:15
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 17:24:08
 * @Description: mpegts.js适配器，用于连接mpegts.js和BasePlayer
 */

import mpegts from 'mpegts.js';
import {
    PLAYER_EVENTS,
    ERROR_TYPES,
    MEDIA_TYPES,
    CONNECTION_TYPES,
    PLAY_MODES
} from '../constants';

class MpegtsAdapter {
    constructor(videoElement, options = {}) {
        // 检查mpegts.js是否可用
        if (!mpegts || !mpegts.isSupported()) {
            throw new Error('mpegts.js is not supported in this browser');
        }

        this.videoElement = videoElement;
        this.options = options;
        this.player = null;
        this.eventHandlers = {};
        this.mediaInfo = null;
        this.statisticsInfo = null;
        this.retryTimes = 0;
        this.maxRetryTimes = options.maxErrorRetries || 3;
        this.retryInterval = options.retryInterval || 3000;
        this.isLive = options.isLive || false;
        this.currentUrl = '';

        // 添加连接状态管理
        this.connectionState = {
            isConnecting: false,
            isConnected: false,
            lastConnectTime: 0,
            reconnectTimer: null
        };

        // 缓冲区清理定时器
        this.bufferCleanupTimer = null;
    }

    /**
     * 初始化mpegts.js播放器
     */
    init() {
        // 设置mpegts.js日志级别
        if (this.options.debug) {
            mpegts.LoggingControl.enableVerbose = true;
            mpegts.LoggingControl.enableInfo = true;
            mpegts.LoggingControl.enableDebug = true;
        } else {
            mpegts.LoggingControl.enableVerbose = false;
            mpegts.LoggingControl.enableInfo = false;
            mpegts.LoggingControl.enableDebug = false;
        }

        // 获取mpegts.js支持的功能
        const features = mpegts.getFeatureList();

        // 检查是否支持MSE播放
        if (!features.mseLivePlayback) {
            throw new Error('MSE live playback is not supported in this browser');
        }

        return this;
    }

    /**
     * 加载视频流
     * @param {string} url - 视频流URL
     * @param {boolean} isLive - 是否为直播流
     */
    load(url, isLive = this.isLive) {
        if (!url) {
            throw new Error('URL is required');
        }

        // 防止重复加载相同URL
        if (this.currentUrl === url && this.player && this.connectionState.isConnected) {
            console.log('Already connected to this URL, ignoring duplicate load request');
            return true;
        }

        // 如果正在连接中，取消当前的连接
        if (this.connectionState.isConnecting) {
            this._clearReconnectTimer();
        }

        // 清理之前的缓冲区清理定时器
        this._clearBufferCleanupTimer();

        this.currentUrl = url;
        this.isLive = isLive;

        // 更新连接状态
        this.connectionState.isConnecting = true;
        this.connectionState.isConnected = false;
        this.connectionState.lastConnectTime = Date.now();

        // 销毁之前的播放器实例
        this.destroy();

        // 解析URL类型
        const urlType = this._getUrlType(url);
        const mediaType = this._getMediaType(url);

        // 创建mpegts.js播放器配置
        const playerConfig = this._createPlayerConfig(url, urlType, mediaType);

        // 创建mpegts.js播放器实例
        try {
            this.player = mpegts.createPlayer(playerConfig);

            // 绑定事件
            this._bindEvents();

            // 附加到视频元素
            this.player.attachMediaElement(this.videoElement);

            // 加载
            this.player.load();

            // 如果是直播模式，启动缓冲区定期清理
            if (this.isLive && this.options.lowLatency) {
                this._startBufferCleanup();
            }

            return true;
        } catch (error) {
            this.connectionState.isConnecting = false;
            this._emitError(ERROR_TYPES.INIT_ERROR, 'Failed to create mpegts.js player', error);
            return false;
        }
    }

    /**
     * 播放视频
     */
    play() {
        if (!this.player) return false;

        const playPromise = this.videoElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // 自动播放被阻止
                if (error.name === 'NotAllowedError') {
                    this._emitError(ERROR_TYPES.PERMISSION_ERROR, 'Autoplay was prevented', error);
                } else {
                    this._emitError(ERROR_TYPES.MEDIA_ERROR, 'Failed to play video', error);
                }
            });
        }

        return true;
    }

    /**
     * 暂停视频
     */
    pause() {
        if (!this.player) return false;

        this.videoElement.pause();
        return true;
    }

    /**
     * 跳转到指定时间
     * @param {number} time - 跳转时间（秒）
     */
    seek(time) {
        if (!this.player || this.isLive) return false;

        this.player.currentTime = time;
        return true;
    }

    /**
     * 设置音量
     * @param {number} volume - 音量（0-1）
     */
    setVolume(volume) {
        if (!this.player) return false;

        this.videoElement.volume = Math.max(0, Math.min(1, volume));
        return true;
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
        // 清除重连定时器
        this._clearReconnectTimer();

        // 清除缓冲区清理定时器
        this._clearBufferCleanupTimer();

        // 重置连接状态
        this.connectionState.isConnecting = false;
        this.connectionState.isConnected = false;

        if (this.player) {
            try {
                this._unbindEvents();
                this.player.unload();
                this.player.detachMediaElement();
                this.player.destroy();
                this.player = null;
                this.mediaInfo = null;
                this.statisticsInfo = null;
                this.retryTimes = 0;
            } catch (error) {
                console.error('Error while destroying mpegts player:', error);
            }
        }
    }

    /**
     * 注册事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(callback);
    }

    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (!this.eventHandlers[event]) return;

        if (!callback) {
            delete this.eventHandlers[event];
            return;
        }

        const index = this.eventHandlers[event].indexOf(callback);
        if (index !== -1) {
            this.eventHandlers[event].splice(index, 1);
            if (this.eventHandlers[event].length === 0) {
                delete this.eventHandlers[event];
            }
        }
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     * @private
     */
    _emit(event, data) {
        if (!this.eventHandlers[event]) return;

        this.eventHandlers[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
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
    _emitError(type, message, originalError) {
        const errorInfo = {
            type,
            message,
            originalError
        };

        this._emit(PLAYER_EVENTS.ERROR, errorInfo);
    }

    /**
     * 绑定mpegts.js事件
     * @private
     */
    _bindEvents() {
        if (!this.player) return;

        // 存储事件处理函数，以便后续可以正确解绑
        this._eventHandlers = {};

        // 错误事件
        this._eventHandlers.error = (errorType, errorDetail) => {
            let type = ERROR_TYPES.UNKNOWN;
            let message = 'Unknown error';

            switch (errorType) {
                case mpegts.ErrorTypes.NETWORK_ERROR:
                    type = ERROR_TYPES.NETWORK_ERROR;
                    message = `Network error: ${errorDetail.message || 'unknown'}`;
                    // 网络错误可以尝试重连
                    this._tryReconnect();
                    break;
                case mpegts.ErrorTypes.MEDIA_ERROR:
                    type = ERROR_TYPES.MEDIA_ERROR;
                    message = `Media error: ${errorDetail.message || 'unknown'}`;
                    break;
                case mpegts.ErrorTypes.OTHER_ERROR:
                    if (errorDetail.code === -2) {
                        type = ERROR_TYPES.DECODE_ERROR;
                        message = 'Decode error';
                    } else {
                        message = `Other error: ${errorDetail.message || 'unknown'}`;
                    }
                    break;
            }

            this._emitError(type, message, { errorType, errorDetail });
        };
        this.player.on(mpegts.Events.ERROR, this._eventHandlers.error);

        // 媒体信息事件
        this._eventHandlers.mediaInfo = (mediaInfo) => {
            this.mediaInfo = mediaInfo;
            this.connectionState.isConnecting = false;
            this.connectionState.isConnected = true;
            this._emit(PLAYER_EVENTS.READY, { mediaInfo });
        };
        this.player.on(mpegts.Events.MEDIA_INFO, this._eventHandlers.mediaInfo);

        // 统计信息事件
        this._eventHandlers.statisticsInfo = (statisticsInfo) => {
            this.statisticsInfo = statisticsInfo;
            this._emit(PLAYER_EVENTS.STATS_UPDATE, { statisticsInfo });
        };
        this.player.on(mpegts.Events.STATISTICS_INFO, this._eventHandlers.statisticsInfo);

        // 其他事件
        const eventMapping = {
            [mpegts.Events.LOADING_COMPLETE]: PLAYER_EVENTS.READY,
            [mpegts.Events.RECOVERED_EARLY_EOF]: PLAYER_EVENTS.READY,
            [mpegts.Events.METADATA_ARRIVED]: 'metadataArrived',
            [mpegts.Events.SCRIPTDATA_ARRIVED]: 'scriptdataArrived',
            [mpegts.Events.TIMED_ID3_METADATA_ARRIVED]: 'timedID3MetadataArrived',
            [mpegts.Events.PES_PRIVATE_DATA_DESCRIPTOR]: 'pesPrivateDataDescriptor',
            [mpegts.Events.PES_PRIVATE_DATA_ARRIVED]: 'pesPrivateDataArrived',
            [mpegts.Events.SMPTE2038_METADATA_ARRIVED]: 'smpte2038MetadataArrived'
        };

        this._eventHandlers.otherEvents = {};

        Object.keys(eventMapping).forEach(mpegtsEvent => {
            const handler = (data) => {
                this._emit(eventMapping[mpegtsEvent], data);
            };

            // 存储处理函数以便后续解绑
            this._eventHandlers.otherEvents[mpegtsEvent] = handler;

            this.player.on(mpegtsEvent, handler);
        });
    }

    /**
     * 解绑mpegts.js事件
     * @private
     */
    _unbindEvents() {
        if (!this.player || !this._eventHandlers) return;

        // 解绑主要事件
        if (this._eventHandlers.error) {
            this.player.off(mpegts.Events.ERROR, this._eventHandlers.error);
        }

        if (this._eventHandlers.mediaInfo) {
            this.player.off(mpegts.Events.MEDIA_INFO, this._eventHandlers.mediaInfo);
        }

        if (this._eventHandlers.statisticsInfo) {
            this.player.off(mpegts.Events.STATISTICS_INFO, this._eventHandlers.statisticsInfo);
        }

        // 解绑其他事件
        if (this._eventHandlers.otherEvents) {
            const eventMapping = {
                [mpegts.Events.LOADING_COMPLETE]: true,
                [mpegts.Events.RECOVERED_EARLY_EOF]: true,
                [mpegts.Events.METADATA_ARRIVED]: true,
                [mpegts.Events.SCRIPTDATA_ARRIVED]: true,
                [mpegts.Events.TIMED_ID3_METADATA_ARRIVED]: true,
                [mpegts.Events.PES_PRIVATE_DATA_DESCRIPTOR]: true,
                [mpegts.Events.PES_PRIVATE_DATA_ARRIVED]: true,
                [mpegts.Events.SMPTE2038_METADATA_ARRIVED]: true
            };

            Object.keys(eventMapping).forEach(mpegtsEvent => {
                const handler = this._eventHandlers.otherEvents[mpegtsEvent];
                if (handler) {
                    this.player.off(mpegtsEvent, handler);
                }
            });
        }

        // 清除存储的事件处理函数
        this._eventHandlers = null;
    }

    /**
     * 清除重连定时器
     * @private
     */
    _clearReconnectTimer() {
        if (this.connectionState.reconnectTimer) {
            clearTimeout(this.connectionState.reconnectTimer);
            this.connectionState.reconnectTimer = null;
        }
    }

    /**
     * 尝试重连
     * @private
     */
    _tryReconnect() {
        // 如果已经达到最大重试次数或没有URL，则不再重试
        if (this.retryTimes >= this.maxRetryTimes || !this.currentUrl) return;

        // 如果已经在重连中，不要再次触发重连
        if (this.connectionState.reconnectTimer) return;

        // 防止短时间内多次重连
        const now = Date.now();
        const timeSinceLastConnect = now - this.connectionState.lastConnectTime;
        if (timeSinceLastConnect < 1000) {
            console.log(`Reconnect too frequent, delaying. Last connect was ${timeSinceLastConnect}ms ago`);
            this.retryInterval = Math.min(this.retryInterval * 1.5, 10000); // 指数退避，最大10秒
        }

        this.retryTimes++;

        this._clearReconnectTimer();
        this.connectionState.reconnectTimer = setTimeout(() => {
            if (this.player) {
                this._emit(PLAYER_EVENTS.LOADING, {
                    url: this.currentUrl,
                    retryTimes: this.retryTimes
                });

                console.log(`Reconnecting (${this.retryTimes}/${this.maxRetryTimes}) to ${this.currentUrl}`);
                this.load(this.currentUrl, this.isLive);
            }
        }, this.retryInterval);
    }

    /**
     * 获取URL类型
     * @param {string} url - URL
     * @returns {string} URL类型
     * @private
     */
    _getUrlType(url) {
        if (url.startsWith('ws://') || url.startsWith('wss://')) {
            return CONNECTION_TYPES.WEBSOCKET;
        } else if (url.startsWith('http://')) {
            return CONNECTION_TYPES.HTTP;
        } else if (url.startsWith('https://')) {
            return CONNECTION_TYPES.HTTPS;
        } else {
            return CONNECTION_TYPES.LOCAL;
        }
    }

    /**
     * 获取媒体类型
     * @param {string} url - URL
     * @returns {string} 媒体类型
     * @private
     */
    _getMediaType(url) {
        const extension = url.split('?')[0].split('.').pop().toLowerCase();

        switch (extension) {
            case 'flv':
                return MEDIA_TYPES.FLV;
            case 'm3u8':
                return MEDIA_TYPES.HLS;
            case 'mpd':
                return MEDIA_TYPES.DASH;
            case 'mp4':
                return MEDIA_TYPES.MP4;
            default:
                // 根据URL中的关键字判断
                if (url.includes('flv')) {
                    return MEDIA_TYPES.FLV;
                } else if (url.includes('m3u8')) {
                    return MEDIA_TYPES.HLS;
                } else if (url.includes('mpd')) {
                    return MEDIA_TYPES.DASH;
                } else if (url.includes('mp4')) {
                    return MEDIA_TYPES.MP4;
                } else {
                    // 默认为FLV
                    return MEDIA_TYPES.FLV;
                }
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
    _createPlayerConfig(url, urlType, mediaType) {
        const config = {
            type: mediaType.toLowerCase(),
            url: url,
            isLive: this.isLive,
            cors: true,
            withCredentials: false,
            hasAudio: true,
            hasVideo: true
        };

        // 根据播放模式设置不同的配置
        if (this.isLive) {
            // 直播模式配置 - 优化低延迟
            config.enableStashBuffer = false;
            config.stashInitialSize = 32; // 进一步减小初始缓冲区大小
            config.liveBufferLatencyChasing = true; // 启用延迟追赶
            config.liveBufferLatencyMaxLatency = 0.8; // 降低最大延迟阈值
            config.liveBufferLatencyMinRemain = 0.1; // 降低最小剩余时间
            config.liveSync = true; // 启用直播同步
            config.lazyLoad = false; // 禁用延迟加载
            config.fixAudioTimestampGap = true; // 修复音频时间戳间隙
            config.seekType = 'range'; // 使用range请求而不是完整加载
            config.rangeLoadZeroStart = false; // 不从头开始加载
            config.forceKeyFrameOnDiscontinuity = true; // 强制关键帧
            config.accurateSeek = false; // 禁用精确跳转（直播不需要）

            // 如果指定了低延迟模式
            if (this.options.lowLatency) {
                config.liveBufferLatencyMaxLatency = 0.5; // 更低的最大延迟
                config.liveBufferLatencyMinRemain = 0.05; // 更低的最小剩余时间
                config.autoCleanupSourceBuffer = true; // 自动清理源缓冲区
                config.autoCleanupMaxBackwardDuration = 1; // 最大后向清理时长（秒）
                config.autoCleanupMinBackwardDuration = 0.5; // 最小后向清理时长（秒）
            }
        } else {
            // 点播模式配置
            config.enableStashBuffer = true;
            config.stashInitialSize = 1024 * 64; // 64KB
            config.lazyLoad = true;
        }

        // 添加用户自定义配置
        if (this.options.mpegtsConfig) {
            Object.assign(config, this.options.mpegtsConfig);
        }

        return config;
    }

    /**
     * 清除缓冲区清理定时器
     * @private
     */
    _clearBufferCleanupTimer() {
        if (this.bufferCleanupTimer) {
            clearInterval(this.bufferCleanupTimer);
            this.bufferCleanupTimer = null;
        }
    }

    /**
     * 启动缓冲区定期清理
     * @private
     */
    _startBufferCleanup() {
        // 清除之前的定时器
        this._clearBufferCleanupTimer();

        // 每5秒检查一次缓冲区状态
        this.bufferCleanupTimer = setInterval(() => {
            if (!this.player || !this.isLive) return;

            try {
                // 获取当前缓冲区信息
                const mediaElement = this.videoElement;
                if (!mediaElement || !mediaElement.buffered || mediaElement.buffered.length === 0) return;

                const currentTime = mediaElement.currentTime;
                const bufferEnd = mediaElement.buffered.end(mediaElement.buffered.length - 1);
                const bufferSize = bufferEnd - currentTime;

                // 如果缓冲区过大，则清理旧的缓冲区
                if (bufferSize > 2.0) { // 如果缓冲超过2秒
                    if (this.options.debug) {
                        console.log(`缓冲区过大 (${bufferSize.toFixed(2)}s)，尝试清理...`);
                    }

                    // 如果播放器支持直接清理缓冲区的方法
                    if (this.player.cleanupSourceBuffer) {
                        this.player.cleanupSourceBuffer();
                    }

                    // 如果延迟太大，尝试追帧
                    if (bufferSize > 3.0 && this.player.currentTime) {
                        const jumpTarget = bufferEnd - 1.0; // 跳到缓冲区末尾减1秒的位置
                        if (this.options.debug) {
                            console.log(`延迟过大，执行追帧: ${currentTime.toFixed(2)}s -> ${jumpTarget.toFixed(2)}s`);
                        }
                        this.player.currentTime = jumpTarget;
                    }
                }
            } catch (error) {
                console.error('Error during buffer cleanup:', error);
            }
        }, 5000); // 每5秒检查一次
    }
}

export default MpegtsAdapter;