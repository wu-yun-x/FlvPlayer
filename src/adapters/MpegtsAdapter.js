/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-11 15:51:45
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
        // 记录连接开始时间
        this._connectionStartTime = null;
        // 设置连接状态
        this._isConnected = false;
        // 设置是否接收到了数据
        this._hasReceivedData = false;
        // 设置连接超时计时器
        this._connectionTimeoutTimer = null;
        // 设置数据接收超时计时器
        this._dataTimeoutTimer = null;
        this._init();
    }

    /**
     * 初始化 mpegts.js 实例
     * @private
     */
    _init() {
        if (mpegts.getFeatureList().mseLivePlayback) {
            this.player = mpegts.createPlayer(this.mediaDataSource, this.config)
            // 先绑定事件，再进行连接
            this._bindEvents();

            // 记录开始时间和设置超时计时器
            this._connectionStartTime = Date.now();
            this._connectionTimeoutTimer = setTimeout(() => {
                if (!this._isConnected) {
                    this._handleTimeout('WebSocket connection timeout');
                }
            }, this.connectionTimeout);

            // 最后才开始连接和加载
            this.player.attachMediaElement(this.video)
            this.player.load()
        }
    }

    /**
     * 绑定 mpegts.js 事件到全局 eventBus
     * @private
     */
    _bindEvents() {
        // 连接建立事件（通过STATISTICS_INFO判断）
        this.player.on(mpegts.Events.STATISTICS_INFO, (info) => {
            // 只有在首次收到统计信息且的确有数据时，才认为连接成功
            if (!this._isConnected && info && typeof info.totalBytes === 'number') {
                this._isConnected = true;
                this._clearConnectionTimeoutTimer();
                console.log(`[MpegtsAdapter] WebSocket连接建立，耗时: ${Date.now() - this._connectionStartTime}ms`);

                // 设置数据接收超时计时器
                this._dataTimeoutTimer = setTimeout(() => {
                    if (!this._hasReceivedData) {
                        this._handleTimeout('No media data received timeout');
                    }
                }, this.dataTimeout);
            }

            // 检查是否收到媒体数据
            if (!this._hasReceivedData && info.totalBytes > 0) {
                this._hasReceivedData = true;
                this._clearDataTimeoutTimer();
                console.log(`[MpegtsAdapter] 收到首个媒体数据，总耗时: ${Date.now() - this._connectionStartTime}ms`);
            }

            // 发送统计信息到事件总线
            eventBus.emit(PLAYER_EVENTS.STATS_UPDATE, {
                statisticsInfo: info,
                isConnected: this._isConnected,
                hasReceivedData: this._hasReceivedData,
                connectionTime: Date.now() - this._connectionStartTime
            });
        });

        // 媒体信息事件（作为备用连接检测）
        this.player.on(mpegts.Events.MEDIA_INFO, (info) => {
            if (!this._isConnected) {
                this._isConnected = true;
                this._clearConnectionTimeoutTimer();
            } else if (!this.hasReceivedData) {
                this._hasReceivedData = true;
                this._clearDataTimeoutTimer();
                console.log(`[MpegtsAdapter] 通过MEDIA_INFO确认接收到数据，总耗时: ${Date.now() - this._connectionStartTime}ms`);
            }
            // 发送媒体信息到事件总线
            eventBus.emit(PLAYER_EVENTS.MEDIA_INFO, info);
        });

        // 添加错误事件监听
        this.player.on(mpegts.Events.ERROR, (e) => {
            this._clearAllTimers();
            // 触发错误事件
            eventBus.emit(PLAYER_EVENTS.ERROR, e);
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
                hasReceivedData: this._hasReceivedData
            });
            this.destroy();
            eventBus.emit(PLAYER_EVENTS.RECONNECT_NEEDED);
        }
    }

    /**
     * 清除连接超时计时器
     * @private
     */
    _clearConnectionTimeoutTimer() {
        if (this._connectionTimeoutTimer) {
            clearTimeout(this._connectionTimeoutTimer);
            this._connectionTimeoutTimer = null;
        }
    }

    /**
     * 清除数据接收超时计时器
     * @private
     */
    _clearDataTimeoutTimer() {
        if (this._dataTimeoutTimer) {
            clearTimeout(this._dataTimeoutTimer);
            this._dataTimeoutTimer = null;
        }
    }

    /**
     * 清除所有超时计时器
     * @private
     */
    _clearAllTimers() {
        this._clearConnectionTimeoutTimer();
        this._clearDataTimeoutTimer();
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