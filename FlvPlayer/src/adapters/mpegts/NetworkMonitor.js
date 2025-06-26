/*
 * @Author: st004362
 * @Date: 2025-06-13 11:24:06
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-13 12:15:31
 * @Description: 网络监控模块，负责监控网络质量和数据接收速率
 */

import eventBus from '../../events/EventBus';
import { PLAYER_EVENTS, NETWORK_QUALITY } from '../../constants';

class NetworkMonitor {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {HTMLVideoElement} options.video - 视频元素
     * @param {Object} options.player - mpegts.js播放器实例
     */
    constructor(options) {
        this.video = options.video;
        this.player = options.player;
        this.isConnected = false;

        // 网络质量监控相关
        this.networkQuality = NETWORK_QUALITY.NORMAL; // 默认为一般网络
        this._qualityCheckInterval = options.qualityCheckInterval || 5000; // 每5秒检查一次
        this._stallCount = 0; // 卡顿次数
        this._lastCheckTime = 0; // 上次检查时间
        this._bitrateHistory = []; // 比特率历史记录
        this._qualityCheckTimer = null; // 质量检查定时器

        // 数据接收历史记录
        this._dataReceiveHistory = [];
        this._latestStats = {};

        // 初始化
        this._init();
    }

    /**
     * 初始化网络监控
     */
    _init() {
        // 启动网络质量监控
        this._startQualityMonitoring();
    }

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
        this.video.addEventListener('waiting', this._onWaiting = () => {
            this._stallCount++;
        });

        // 监听播放事件
        this.video.addEventListener('playing', this._onPlaying = () => {
            // 播放恢复后重置卡顿计数
            this._stallCount = 0;
        });
    }

    /**
     * 检查网络质量
     */
    _checkNetworkQuality() {
        if (!this.player || !this.isConnected) return;

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

        // 计算实时比特率
        const realTimeBitrate = this._calculateRealTimeBitrate();

        // 评估网络质量
        const newQuality = this._evaluateNetworkQuality(
            totalBitrate,
            bufferHealth,
            this._stallCount
        );

        // 如果网络质量发生变化
        if (newQuality !== this.networkQuality) {
            this.networkQuality = newQuality;

            // 发送网络质量变化事件
            eventBus.emit(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE, {
                quality: newQuality,
                bitrate: totalBitrate,
                realTimeBitrate: realTimeBitrate,
                bufferHealth: bufferHealth,
                stallCount: this._stallCount
            });
        }

        // 更新检查时间
        this._lastCheckTime = now;
    }

    /**
     * 计算缓冲健康度(0-1)
     * @returns {number} 缓冲健康度
     */
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

    /**
     * 评估网络质量
     * @param {number} bitrate - 比特率
     * @param {number} bufferHealth - 缓冲健康度
     * @param {number} stallCount - 卡顿次数
     * @returns {string} 网络质量
     */
    _evaluateNetworkQuality(bitrate, bufferHealth, stallCount) {
        // 如果比特率为0但有良好的缓冲，可能是暂停或缓冲中，不应判断为差网络
        if (bitrate === 0 && bufferHealth > 0.5) {
            return this.networkQuality; // 保持当前网络质量不变
        }
        // 基于经验值的简单评估逻辑
        if (bitrate > 2000000 && bufferHealth > 0.8 && stallCount === 0) {
            return NETWORK_QUALITY.EXCELLENT; // 优质网络
        } else if (bitrate < 500000 || bufferHealth < 0.3 || stallCount > 2) {
            return NETWORK_QUALITY.POOR; // 弱网环境
        } else {
            return NETWORK_QUALITY.NORMAL; // 一般网络
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
     * 更新数据接收历史
     * @param {Object} info - 统计信息
     */
    updateDataReceiveHistory(info) {
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
            this._dataReceiveHistory = this._dataReceiveHistory.filter(
                item => item.timestamp >= cutoffTime
            );
        }
    }

    /**
     * 设置连接状态
     * @param {boolean} connected - 是否已连接
     */
    setConnected(connected) {
        this.isConnected = connected;
    }

    /**
     * 获取当前网络质量
     * @returns {string} 网络质量
     */
    getNetworkQuality() {
        return this.networkQuality;
    }

    /**
     * 获取最新的数据接收统计信息
     * @returns {Object} 统计信息
     */
    getLatestStats() {
        return this._latestStats;
    }

    /**
     * 重置监控状态
     */
    reset() {
        this.networkQuality = NETWORK_QUALITY.NORMAL;
        this._stallCount = 0;
        this._bitrateHistory = [];
        this._dataReceiveHistory = [];
        this._latestStats = {};
    }

    /**
     * 销毁监控
     */
    destroy() {
        if (this._qualityCheckTimer) {
            clearInterval(this._qualityCheckTimer);
            this._qualityCheckTimer = null;
        }

        // 移除事件监听
        if (this.video) {
            this.video.removeEventListener('waiting', this._onWaiting);
            this.video.removeEventListener('playing', this._onPlaying);
        }
    }
}

export default NetworkMonitor