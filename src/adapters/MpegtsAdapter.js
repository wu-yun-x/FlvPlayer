/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-11 17:08:57
 * @Description: mpegts.js 协议适配器，负责与 mpegts.js 实例交互，提供统一的播放器适配接口
 */
import mpegts from 'mpegts.js';
import { PLAYER_EVENTS, ERROR_TYPES } from '../constants';
import eventBus from '../events/EventBus';

/**
 * MpegtsAdapter 负责管理 mpegts.js 实例，并与 Player 进行解耦
 * - 只暴露必要的播放器控制方法
 * - 事件转发到全局 eventBus
 */
class MpegtsAdapter {
    /**
     * 构造函数
     * @param {HTMLVideoElement} video - video元素
     * @param {Object} options - 播放器配置
     */
    constructor(video, options) {
        this.video = video;
        this.config = options.mpegtsConfig;
        this.mediaDataSource = options.mediaDataSource;
        // 从options中获取连接超时时间，默认使用常量中的值
        this.connectionTimeout = options.connectionTimeout
        // 接收数据超时时间
        this.dataTimeout = options.dataTimeout;
        // 重连相关配置
        this.maxErrorRetries = options.maxErrorRetries;
        this.retryInterval = options.retryInterval;
        this.maxRetryInterval = options.maxRetryInterval;
        // 重连状态
        this._currentRetry = 0;
        this._retryTimer = null;
        this._connectionStartTime = null;
        this._isConnected = false;
        this._hasReceivedData = false;

        this._init();
    }

    /**
     * 初始化 mpegts.js 实例
     * @private
     */
    _init() {
        this._clearAllTimers();
        if (mpegts.getFeatureList().mseLivePlayback) {
            this._createPlayer();
        }
    }


    /**
     * 创建 mpegts.js 实例
     * @private
     */
    _createPlayer() {
        this._connectionStartTime = Date.now();

        // 创建播放器实例
        this.player = mpegts.createPlayer(this.mediaDataSource, this.config);
        this._bindEvents();
        this.player.attachMediaElement(this.video);

        // 设置连接超时计时器（仅用于数据接收超时检测）
        this._connectionTimeoutTimer = setTimeout(() => {
            if (!this._hasReceivedData) {
                this._handleTimeout('No media data received timeout');
            }
        }, this.connectionTimeout);

        this.player.load();
    }

    /**
   * 绑定 mpegts.js 事件到全局 eventBus
   * @private
   */
    _bindEvents() {
        // 错误事件处理（包括连接失败）
        this.player.on(mpegts.Events.ERROR, (error) => {
            console.error('[MpegtsAdapter] 播放器错误:', error);
            this._clearAllTimers();

            // 检查是否需要重试
            if (this._currentRetry < this.maxErrorRetries) {
                this._scheduleRetry();
            } else {
                console.warn('[MpegtsAdapter] 达到最大重试次数，停止重连');
                eventBus.emit(PLAYER_EVENTS.RECONNECT_FAILED);
                this.destroy();
            }
            eventBus.emit(PLAYER_EVENTS.ERROR, error);
        });

        // 统计信息事件（用于检测数据接收）
        this.player.on(mpegts.Events.STATISTICS_INFO, (info) => {
            if (info && typeof info.totalBytes === 'number') {
                if (!this._isConnected) {
                    this._isConnected = true;
                    this._clearConnectionTimeoutTimer();
                    console.log(`[MpegtsAdapter] WebSocket连接建立，耗时: ${Date.now() - this._connectionStartTime}ms`);
                } else if (!this._hasReceivedData && info.totalBytes > 0) {
                    this._hasReceivedData = true;
                    this._clearDataTimeoutTimer();
                    this._currentRetry = 0; // 重置重试计数
                    console.log(`[MpegtsAdapter] 收到首个媒体数据，总耗时: ${Date.now() - this._connectionStartTime}ms`);
                }

                eventBus.emit(PLAYER_EVENTS.STATS_UPDATE, {
                    statisticsInfo: info,
                    isConnected: this._isConnected,
                    hasReceivedData: this._hasReceivedData,
                    connectionTime: Date.now() - this._connectionStartTime
                });
            }
        });

        // 媒体信息事件
        this.player.on(mpegts.Events.MEDIA_INFO, (info) => {
            if (!this._hasReceivedData) {
                this._hasReceivedData = true;
                this._clearConnectionTimeoutTimer();
                console.log(`[MpegtsAdapter] 通过MEDIA_INFO确认接收到数据`);
            }
            eventBus.emit(PLAYER_EVENTS.MEDIA_INFO, info);
        });
    }


    /**
     * 处理超时事件
     * @param {string} reason - 超时原因
     */
    _handleTimeout(reason) {
        console.warn(`[MpegtsAdapter] ${reason}`);
        if (!this._isConnected || !this._hasReceivedData) {
            eventBus.emit(PLAYER_EVENTS.ERROR, {
                type: ERROR_TYPES.TIMEOUT,
                details: reason,
                isConnected: this._isConnected,
                hasReceivedData: this._hasReceivedData,
                retryCount: this._currentRetry,
                maxErrorRetries: this.maxErrorRetries
            });

            // 是否可以进行重试
            if (this._currentRetry < this.maxErrorRetries) {
                this._scheduleRetry();
            } else {
                console.warn('[MpegtsAdapter] 达到最大重试次数，停止重连');
                eventBus.emit(PLAYER_EVENTS.RECONNECT_FAILED);
                this.destroy();
            }
        }
    }

    /**
     * 计算指数退避延迟时间
     */
    _getRetryDelay() {
        // 使用指数退避算法：baseDelay * (2 ^ retryCount)
        const delay = this.retryInterval * Math.pow(2, this._currentRetry);
        // 添加一些随机性，避免多个客户端同时重连
        const jitter = Math.random() * 1000
        // 确保不超过最大延迟时间
        return Math.floor(Math.min(delay + jitter, this.maxRetryInterval));
    }

    /**
     * 计划重连
     */
    _scheduleRetry() {
        const delay = this._getRetryDelay();
        console.log(`[MpegtsAdapter] 计划第 ${this._currentRetry + 1}/${this.maxErrorRetries} 次重连，延迟: ${delay}ms`);

        eventBus.emit(PLAYER_EVENTS.RECONNECTING, {
            attempt: this._currentRetry + 1,
            maxErrorRetries: this.maxErrorRetries,
            delay: delay
        });

        this._retryTimer = setTimeout(() => {
            this._currentRetry++;
            this._isConnected = false;
            this._hasReceivedData = false;
            this._createPlayer();
        }, delay);
    }

    /**
     * 清除所有超时计时器
     * @private
     */
    _clearAllTimers() {
        if (this._connectionTimeoutTimer) {
            clearTimeout(this._connectionTimeoutTimer)
            this._connectionTimeoutTimer = null;
        }
        if (this._dataTimeoutTimer) {
            clearTimeout(this._dataTimeoutTimer);
            this._dataTimeoutTimer = null;
        }
        if (this._retryTimer) {
            clearTimeout(this._retryTimer);
            this._retryTimer = null;
        }
    }

    /**
     * 加载新的视频源
     * @param {string} url
     */
    load(url) {
        if (this.player) {
            this.player.unload();
            this.player.detachMediaElement();
            this.player.destroy();
        }
        this.config.url = url;
        this._init();
    }

    /**
     * 播放
     */
    play() { this.video.play(); }

    /** 暂停 */
    pause() { this.video.pause(); }

    /** 销毁适配器和 mpegts 实例 */
    destroy() {
        // 清除超时计时器
        this._clearAllTimers();
        if (this.player) {
            this.player.unload();
            this.player.detachMediaElement();
            this.player.destroy();
            this.player = null;
        }
    }
}

export default MpegtsAdapter;