/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-12 17:33:43
 * @Description: mpegts.js 协议适配器，负责与 mpegts.js 实例交互，提供统一的播放器适配接口
 */
import mpegts from 'mpegts.js';
import eventBus from '../events/EventBus';
import { detectAndEnableHardwareAcceleration } from '../utils/HardwareAcceleration';
import { PLAYER_EVENTS, ERROR_TYPES, NETWORK_QUALITY, BUFFER_CONFIGS } from '../constants';


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

        // 网络质量监控相关
        this._networkQuality = NETWORK_QUALITY.NORMAL // 默认为一般网络
        this._qualityCheckInterval = 5000 // 每5秒检查一次
        this._stallCount = 0 // 卡顿次数
        this._lastCheckTime = 0 // 上次检查时间
        this._bitrateHistory = [] // 比特率历史记录
        this._qualityCheckTimer = null // 质量检查定时器

        // 硬件加速相关
        this._hwAccelInfo = null;
        this._hwAccelEnabled = options.enableHardwareAcceleration !== false;

        // 数据接收历史记录
        this._dataReceiveHistory = [];


        this._init();
    }

    /**
     * 初始化 mpegts.js 实例
     * @private
     */
    _init() {
        this._clearAllTimers();

        // 检测硬件加速
        this._detectHardwareAcceleration();

        if (mpegts.getFeatureList().mseLivePlayback) {
            this._createPlayer();
        }
        // 启动网络质量监控
        this._startQualityMonitoring();
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
                // 添加时间戳和字节数到历史记录
                const now = Date.now();
                // 保存最新统计信息
                this._latestStats = {
                    ...info,
                    timestamp: now,  // 添加时间戳
                };
                // 将数据点添加到历史记录
                this._dataReceiveHistory.push({
                    timestamp: now,
                    bytes: info.totalBytes
                });
                // 保留最近的N个数据点（如30秒内的）
                const keepDuration = 30000; // 30秒
                const cutoffTime = now - keepDuration;
                this._dataReceiveHistory = this._dataReceiveHistory.filter(item => item.timestamp >= cutoffTime);
                // 保存最新统计信息
                if (!this._isConnected) {
                    this._isConnected = true;
                    console.log(`[MpegtsAdapter] WebSocket连接建立，耗时: ${now - this._connectionStartTime}ms`);
                } else if (!this._hasReceivedData && info.totalBytes > 0) {
                    this._hasReceivedData = true;
                    this._currentRetry = 0; // 重置重试计数
                    console.log(`[MpegtsAdapter] 收到首个媒体数据，总耗时: ${now - this._connectionStartTime}ms`);
                }

                eventBus.emit(PLAYER_EVENTS.STATS_UPDATE, {
                    statisticsInfo: info,
                    isConnected: this._isConnected,
                    hasReceivedData: this._hasReceivedData,
                    connectionTime: now - this._connectionStartTime
                });
            }
        });

        // 媒体信息事件
        this.player.on(mpegts.Events.MEDIA_INFO, (info) => {
            this._isConnected = true;
            if (!this._hasReceivedData) {
                this._hasReceivedData = true;
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

    /**
     * 启动网络质量监控
     */
    _startQualityMonitoring() {
        // 初始化监控
        this._lastCheckTime = Date.now();
        // 定期检查网络质量
        this._qualityCheckTimer = setInterval(() => {
            this._checkNetworkQuality();
        }, this._qualityCheckInterval);

        // 监听卡顿事件
        this.video.addEventListener('waiting', () => {
            this._stallCount++;
        });

        // 监听播放事件
        this.video.addEventListener('playing', () => {
            // 播放恢复后重置卡顿计数
            this._stallCount = 0;
        });
    }

    // 检查网络质量
    _checkNetworkQuality() {
        // 检查连接和播放器状态
        if (!this.player || !this._isConnected) return;

        const now = Date.now();
        const timeDiff = (now - this._lastCheckTime) / 1000; // 转换为秒

        // 计算缓冲健康度
        const bufferHealth = this._calculateBufferHealth();

        // 从mediaInfo获取视频和音频比特率
        let totalBitrate = 0;
        if (this.player.mediaInfo) {
            const mediaInfo = this.player.mediaInfo;
            // 视频和音频比特率（kbps转为bps）
            const videoBitrate = mediaInfo.videoDataRate ? mediaInfo.videoDataRate * 1000 : 0;
            const audioBitrate = mediaInfo.audioDataRate ? mediaInfo.audioDataRate * 1000 : 0;
            totalBitrate = videoBitrate + audioBitrate;
        }

        // 从视频元素获取信息
        const videoReadyState = this.video.readyState;

        // 评估网络质量
        let newQuality;

        // 根据比特率、缓冲健康度和卡顿来评估
        if (totalBitrate > 0) {
            // 使用比特率进行评估
            if (totalBitrate > 2000000 && bufferHealth > 0.8 && this._stallCount === 0) {
                newQuality = NETWORK_QUALITY.EXCELLENT;
            } else if (totalBitrate < 500000 || bufferHealth < 0.3 || this._stallCount > 2) {
                newQuality = NETWORK_QUALITY.POOR;
            } else {
                newQuality = NETWORK_QUALITY.NORMAL;
            }
        } else {
            // 无比特率信息时使用缓冲和就绪状态评估
            if (bufferHealth > 0.8 && this._stallCount === 0 && videoReadyState === 4) {
                newQuality = NETWORK_QUALITY.EXCELLENT;
            } else if (bufferHealth < 0.3 || this._stallCount > 2 || videoReadyState < 3) {
                newQuality = NETWORK_QUALITY.POOR;
            } else {
                newQuality = NETWORK_QUALITY.NORMAL;
            }
        }

        // 如果网络质量发生变化，调整缓冲区配置
        if (newQuality !== this._networkQuality) {
            this._networkQuality = newQuality;
            this._applyBufferConfig(newQuality);

            // 发送网络质量变化事件
            eventBus.emit(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE, {
                quality: newQuality,
                bitrate: totalBitrate,
                bufferHealth: bufferHealth,
                stallCount: this._stallCount
            });
        }

        // 更新检查时间
        this._lastCheckTime = now;
    }

    // 计算缓冲健康度(0-1)
    _calculateBufferHealth() {
        if (!this.video || !this.video.buffered || this.video.buffered.length === 0) {
            return 0;
        }

        const currentTime = this.video.currentTime;
        const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
        const bufferLength = bufferedEnd - currentTime;

        // 根据缓冲长度计算健康度，最大参考值为3秒
        return Math.min(bufferLength / 3, 1);
    }

    // 应用缓存区配置
    _applyBufferConfig(quality) {
        if (!this.player) return
        const config = BUFFER_CONFIGS[quality]
        console.log(`[MpegtsAdapter] 网络质量: ${quality}，应用对应缓冲策略`)

        // 应用新配置
        for (const [key, value] of Object.entries(config)) {
            if (typeof this.player[key] !== 'undefined') {
                this.player[key] = value
            }
        }
    }

    // 评估网络质量
    _evaluateNetworkQuality(bitrate, bufferHealth, stallCount) {
        // 如果比特率为0但有良好的缓冲，可能是暂停或缓冲中，不应判断为差网络
        if (bitrate === 0 && bufferHealth > 0.5) {
            return this._networkQuality; // 保持当前网络质量不变
        }
        // 基于经验值的简单评估逻辑
        if (bitrate > 2000000 && bufferHealth > 0.8 && stallCount === 0) {
            return NETWORK_QUALITY.EXCELLENT // 优质网络
        } else if (bitrate < 500000 || bufferHealth < 0.3 || stallCount > 2) {
            return NETWORK_QUALITY.POOR // 弱网环境
        } else {
            return NETWORK_QUALITY.NORMAL // 一般网络
        }
    }

    /**
     * 计算实时数据接收速率
     * @param {number} timeWindow - 计算时间窗口（毫秒），默认5秒
     * @returns {number} 比特率（bps）
     */
    _calculateRealTimeBitrate(timeWindow = 5000) {
        if (this._dataReceiveHistory.length < 2) {
            return 0; // 数据点不足，无法计算
        }

        const now = Date.now();
        const oldestValidTime = now - timeWindow;

        // 找到时间窗口内的最早数据点
        let startPoint = this._dataReceiveHistory[0];
        for (const point of this._dataReceiveHistory) {
            if (point.timestamp >= oldestValidTime) {
                startPoint = point;
                break;
            }
        }

        // 获取最新数据点
        const endPoint = this._dataReceiveHistory[this._dataReceiveHistory.length - 1];

        // 计算时间差（秒）和字节差
        const timeDiff = (endPoint.timestamp - startPoint.timestamp) / 1000;
        const bytesDiff = endPoint.bytes - startPoint.bytes;

        // 避免除以零或负值
        if (timeDiff <= 0 || bytesDiff < 0) {
            return 0;
        }

        // 计算比特率（bps）
        return (bytesDiff * 8) / timeDiff;
    }

    /**
     * 获取硬件加速信息
     * @returns {Object} 硬件加速信息
     */
    getHardwareAccelerationInfo() {
        return this._hwAccelInfo;
    }

    /**
     * 设置硬件加速状态
     * @param {Object} options - 配置选项
     * @param {boolean} options.enabled - 是否启用硬件加速
     * @param {boolean} options.allowSoftwareRendering - 是否允许软件渲染
     */
    setHardwareAcceleration(options = {}) {
        const { enabled = true, allowSoftwareRendering = false } = options;

        this._hwAccelEnabled = enabled;

        // 重新检测硬件加速
        this._hwAccelInfo = detectAndEnableHardwareAcceleration({
            forceHardwareAcceleration: this._hwAccelEnabled,
            allowSoftwareRendering: allowSoftwareRendering
        });

        // 更新配置
        if (this.config) {
            this.config.enableWorker = this._hwAccelInfo.enabled;

            // 根据硬件性能调整配置
            if (this._hwAccelInfo.performance === 'high') {
                // 高性能硬件
                this.config.lazyLoadMaxDuration = 60;
            } else if (this._hwAccelInfo.performance === 'software') {
                // 软件渲染
                this.config.lazyLoadMaxDuration = 20;
                this.config.autoCleanupMaxBackwardDuration = 30;
            }
        }

        // 发送硬件加速变更事件
        eventBus.emit(PLAYER_EVENTS.HW_ACCEL_CHANGED, {
            ...this._hwAccelInfo,
            allowSoftwareRendering
        });

        // 如果播放器实例存在，需要重新加载以应用新设置
        if (this.player) {
            const currentTime = this.video.currentTime;
            const wasPlaying = !this.video.paused;
            const url = this.config.url;

            // 重新加载
            this.load(url);

            // 恢复状态
            this.video.currentTime = currentTime;
            if (wasPlaying) {
                this.play();
            }
        }

        return this._hwAccelInfo;
    }
    /**
     * 检测并配置硬件加速
     * @private
    */
    _detectHardwareAcceleration() {
        // 执行硬件加速检测
        this._hwAccelInfo = detectAndEnableHardwareAcceleration({
            forceHardwareAcceleration: this._hwAccelEnabled,
            allowSoftwareRendering: false // 默认不允许软件渲染
        });

        // 更新配置
        if (this.config) {
            // 根据检测结果修改配置
            this.config.enableWorker = this._hwAccelInfo.enabled;

            // 根据硬件性能调整配置
            if (this._hwAccelInfo.performance === 'high') {
                // 高性能硬件
                this.config.lazyLoadMaxDuration = 60;
            } else if (this._hwAccelInfo.performance === 'medium') {
                // 中等性能
                this.config.lazyLoadMaxDuration = 30;
            } else if (this._hwAccelInfo.performance === 'software') {
                // 软件渲染
                this.config.lazyLoadMaxDuration = 20;
                this.config.autoCleanupMaxBackwardDuration = 30;
            }
        }

        // 发送硬件加速信息事件
        eventBus.emit(PLAYER_EVENTS.HW_ACCEL_INFO, this._hwAccelInfo);

        return this._hwAccelInfo;
    }

    /** 销毁适配器和 mpegts 实例 */
    destroy() {
        // 清除质量监控定时器
        if (this._qualityCheckTimer) {
            clearInterval(this._qualityCheckTimer);
            this._qualityCheckTimer = null;
        }
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