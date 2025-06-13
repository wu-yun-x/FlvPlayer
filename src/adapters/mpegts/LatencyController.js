/*
 * @Author: st004362
 * @Date: 2025-06-13 11:24:11
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-13 11:57:52
 * @Description: 延迟控制模块，负责监控和控制直播延迟
 */
import eventBus from '../../events/EventBus';
import { PLAYER_EVENTS, LATENCY_THRESHOLDS } from '../../constants';

class LatencyController {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {HTMLVideoElement} options.video - 视频元素
     * @param {Object} options.player - mpegts.js播放器实例
     * @param {Object} options.thresholds - 延迟阈值配置
     */
    constructor(options) {
        this.video = options.video;
        this.player = options.player;

        // 延迟监控相关
        this._latencyMonitorEnabled = options.latencyMonitorEnabled !== false;
        this._latencyThresholds = {
            warning: options.thresholds?.warning || LATENCY_THRESHOLDS.WARNING,
            critical: options.thresholds?.critical || LATENCY_THRESHOLDS.CRITICAL,
            emergency: options.thresholds?.emergency || LATENCY_THRESHOLDS.EMERGENCY
        };
        this._currentLatencyLevel = 'normal';
        this._latencyCheckInterval = options.latencyCheckInterval || 1000; // 1秒检查一次
        this._latencyCheckTimer = null;

        // 初始化
        if (this._latencyMonitorEnabled) {
            this._startLatencyMonitoring();
        }
    }

    /**
     * 启动延迟监控
     */
    _startLatencyMonitoring() {
        // 清除现有定时器
        if (this._latencyCheckTimer) {
            clearInterval(this._latencyCheckTimer);
        }

        // 设置新的检查间隔
        this._latencyCheckTimer = setInterval(() => {
            this._checkLatency();
        }, this._latencyCheckInterval);
    }

    /**
    * 检查延迟状态
    */
    _checkLatency() {
        if (!this.player || !this.video) return;

        // 计算当前延迟
        const currentLatency = this._calculateCurrentLatency();
        // 根据延迟判断级别
        let latencyLevel = 'normal';

        if (currentLatency >= this._latencyThresholds.emergency) {
            latencyLevel = 'emergency';
        } else if (currentLatency >= this._latencyThresholds.critical) {
            latencyLevel = 'critical';
        } else if (currentLatency >= this._latencyThresholds.warning) {
            latencyLevel = 'warning';
        }

        // 如果延迟级别发生变化，发送事件
        if (latencyLevel !== this._currentLatencyLevel) {
            this._currentLatencyLevel = latencyLevel;

            // 触发对应事件
            switch (latencyLevel) {
                case 'warning':
                    eventBus.emit(PLAYER_EVENTS.LATENCY_WARNING, { latency: currentLatency });
                    break;
                case 'critical':
                    eventBus.emit(PLAYER_EVENTS.LATENCY_CRITICAL, { latency: currentLatency });
                    // 在严重延迟时应用中等延迟控制
                    this._applyLatencyControl('medium');
                    break;
                case 'emergency':
                    eventBus.emit(PLAYER_EVENTS.LATENCY_EMERGENCY, { latency: currentLatency });
                    // 在紧急延迟时应用激进延迟控制
                    this._applyLatencyControl('aggressive');
                    break;
                case 'normal':
                    eventBus.emit(PLAYER_EVENTS.LATENCY_NORMAL, { latency: currentLatency });
                    // 恢复正常延迟控制
                    this._applyLatencyControl('normal');
                    break;
            }
        }
    }

    /**
     * 计算当前延迟
     * @returns {number} 延迟秒数
     */
    _calculateCurrentLatency() {
        // 对于直播流，可以通过比较缓冲区末尾和当前播放位置来估算延迟
        if (!this.video || !this.video.buffered || this.video.buffered.length === 0) {
            return 0;
        }

        const currentTime = this.video.currentTime;
        const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);

        // 如果有 mpegts.js 提供的时间戳信息，可以更准确地计算
        if (this.player && this.player.mediaInfo && this.player.mediaInfo.metadata) {
            const metadata = this.player.mediaInfo.metadata;
            if (metadata.hasOwnProperty('serverTimestamp')) {
                // 如果服务器提供了时间戳，可以计算更准确的延迟
                const serverTime = metadata.serverTimestamp / 1000; // 转换为秒
                const clientTime = Date.now() / 1000;
                return clientTime - serverTime;
            }
        }

        // 回退方案：使用缓冲区末尾和当前时间的差值作为延迟估计
        return bufferedEnd - currentTime;
    }

    /**
     * 应用延迟控制
     * @param {string} level - 控制级别：'normal', 'medium', 'aggressive'
     * 
     * 延迟控制策略说明：
     * - normal: 优先稳定性，最大延迟5秒，最小剩余1秒
     * - medium: 平衡延迟和稳定性，最大延迟3秒，最小剩余0.5秒
     * - aggressive: 最大限度减少延迟，最大延迟1秒，最小剩余0.2秒
     * 
     * 这些策略通过mpegts.js的内置功能实现，无需自定义丢帧逻辑
     */
    _applyLatencyControl(level) {
        if (!this.player) return;
        // 根据延迟级别应用不同的控制策略
        // 根据级别应用不同的延迟控制配置
        switch (level) {
            case 'aggressive':
                // 激进模式：最大限度减少延迟
                this.player.configureSync({
                    liveBufferLatencyChasing: true,
                    liveBufferLatencyMaxLatency: 1.0,  // 最大延迟1秒
                    liveBufferLatencyMinRemain: 0.2    // 最小剩余0.2秒
                });
                console.log('[LatencyController] 应用激进延迟控制策略');
                break;
            case 'medium':
                // 中等模式：平衡延迟和稳定性
                this.player.configureSync({
                    liveBufferLatencyChasing: true,
                    liveBufferLatencyMaxLatency: 3.0,  // 最大延迟3秒
                    liveBufferLatencyMinRemain: 0.5    // 最小剩余0.5秒
                });
                console.log('[LatencyController] 应用中等延迟控制策略');
                break;
            case 'normal':
            default:
                // 正常模式：优先稳定性
                this.player.configureSync({
                    liveBufferLatencyChasing: true,
                    liveBufferLatencyMaxLatency: 5.0,  // 最大延迟5秒
                    liveBufferLatencyMinRemain: 1.0    // 最小剩余1秒
                });
                console.log('[LatencyController] 应用正常延迟控制策略');
                break;
        }
    }

    /**
   * 获取当前延迟级别
   * @returns {string} 延迟级别
   */
    getCurrentLatencyLevel() {
        return this._currentLatencyLevel;
    }

    /**
    * 获取当前延迟时间
    * @returns {number} 延迟秒数
    */
    getCurrentLatency() {
        return this._calculateCurrentLatency();
    }

    /**
    * 停止延迟监控
    */
    stopMonitoring() {
        if (this._latencyCheckTimer) {
            clearInterval(this._latencyCheckTimer);
            this._latencyCheckTimer = null;
        }
    }

    /**
     * 手动应用延迟控制策略
     * @param {string} level - 控制级别：'normal', 'medium', 'aggressive'
     * @returns {boolean} 是否成功应用
     */
    applyLatencyControl(level) {
        if (['normal', 'medium', 'aggressive'].includes(level)) {
            this._applyLatencyControl(level);
            return true;
        }
        return false;
    }

    /**
     * 设置延迟阈值
     * @param {Object} thresholds - 阈值配置
     * @param {number} thresholds.warning - 警告阈值（秒）
     * @param {number} thresholds.critical - 严重阈值（秒）
     * @param {number} thresholds.emergency - 紧急阈值（秒）
     */
    setLatencyThresholds(thresholds) {
        if (thresholds) {
            if (typeof thresholds.warning === 'number') {
                this._latencyThresholds.warning = thresholds.warning;
            }
            if (typeof thresholds.critical === 'number') {
                this._latencyThresholds.critical = thresholds.critical;
            }
            if (typeof thresholds.emergency === 'number') {
                this._latencyThresholds.emergency = thresholds.emergency;
            }
        }
    }

    /**
     * 启用延迟监控
     */
    enable() {
        this._latencyMonitorEnabled = true;
        this._startLatencyMonitoring();
    }

    /**
     * 禁用延迟监控
     */
    disable() {
        this._latencyMonitorEnabled = false;
        this.stopMonitoring();
    }

    /**
     * 销毁延迟控制器
     */
    destroy() {
        this.stopMonitoring();
    }
}

export default LatencyController;