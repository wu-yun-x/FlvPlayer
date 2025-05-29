/*
 * @Author: st004362
 * @Date: 2025-05-28 18:30:15
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 15:03:06
 * @Description: FLV播放器实现，继承BasePlayer并使用MpegtsAdapter
 */

import BasePlayer from './BasePlayer';
import MpegtsAdapter from '../adapters/MpegtsAdapter';
import mpegts from 'mpegts.js';
import {
    PLAYER_STATES,
    PLAYER_EVENTS,
    ERROR_TYPES,
    ADAPTER_TYPES,
    PLAY_MODES
} from '../constants';

class FlvPlayer extends BasePlayer {
    /**
     * FLV播放器构造函数
     * @param {Object} options - 播放器配置
     */
    constructor(options) {
        // 设置默认选项
        const defaultOptions = {
            lowLatency: true, // 默认启用低延迟模式
            autoReconnect: true, // 默认启用自动重连
            maxErrorRetries: 3, // 默认最大重试次数
            retryInterval: 2000 // 默认重试间隔
        };

        // 合并选项
        const mergedOptions = { ...defaultOptions, ...options };

        // 如果是直播模式，强制启用追帧功能
        if (mergedOptions.isLive || mergedOptions.playMode === 'live') {
            mergedOptions.liveBufferLatencyChasing = true;

            // 如果启用了低延迟模式，使用更激进的追帧设置
            if (mergedOptions.lowLatency) {
                mergedOptions.liveBufferLatencyMaxLatency = 0.5;
                mergedOptions.liveBufferLatencyMinRemain = 0.05;
            }
        }

        super(mergedOptions);

        // 初始化适配器
        this._initAdapter();
    }

    /**
     * 初始化适配器
     * @private
     */
    _initAdapter() {
        try {
            // 创建适配器实例
            this.adapter = new MpegtsAdapter(this.videoElement, this.options);

            // 初始化适配器
            this.adapter.init();

            // 绑定适配器事件
            this._bindAdapterEvents();

            this._log('Adapter initialized successfully');
        } catch (error) {
            this._handleError({
                type: ERROR_TYPES.INIT_ERROR,
                message: 'Failed to initialize adapter',
                originalError: error
            });
        }
    }

    /**
     * 绑定适配器事件
     * @private
     */
    _bindAdapterEvents() {
        // 错误事件
        this.adapter.on(PLAYER_EVENTS.ERROR, (error) => {
            this._handleError(error);
        });

        // 准备就绪事件
        this.adapter.on(PLAYER_EVENTS.READY, (data) => {
            this.setState(PLAYER_STATES.READY);
            this.emit(PLAYER_EVENTS.READY, data);
        });

        // 统计信息更新事件
        this.adapter.on(PLAYER_EVENTS.STATS_UPDATE, (data) => {
            this.emit(PLAYER_EVENTS.STATS_UPDATE, data);

            // 监控并报告延迟情况
            if (this.options.isLive && data.statisticsInfo && this.options.debug) {
                const stats = data.statisticsInfo;
                if (stats.currentSegmentIndex !== undefined && stats.decodedFrames !== undefined) {
                    this._log(`当前延迟: ${stats.currentTime !== undefined ? stats.currentTime.toFixed(2) : 'N/A'}s, 缓冲: ${stats.videoBuffered !== undefined ? stats.videoBuffered.toFixed(2) : 'N/A'}s`);
                }
            }
        });

        // 加载事件
        this.adapter.on(PLAYER_EVENTS.LOADING, (data) => {
            this.setState(PLAYER_STATES.LOADING);
            this.emit(PLAYER_EVENTS.LOADING, data);
        });

        // 元数据事件
        this.adapter.on('metadataArrived', (data) => {
            this.emit('metadataArrived', data);
        });
    }

    /**
     * 加载视频
     * @param {string} url - 视频URL
     * @returns {boolean} - 加载是否成功
     */
    load(url) {
        super.load(url);

        try {
            const result = this.adapter.load(url, this.options.isLive);

            if (result) {
                this._log(`Successfully loaded URL: ${url}`);

                // 如果配置了自动播放，则自动开始播放
                if (this.options.autoplay) {
                    this.play();
                }

                return true;
            } else {
                this._handleError({
                    type: ERROR_TYPES.LOAD_ERROR,
                    message: `Failed to load URL: ${url}`
                });
                return false;
            }
        } catch (error) {
            this._handleError({
                type: ERROR_TYPES.LOAD_ERROR,
                message: `Exception while loading URL: ${url}`,
                originalError: error
            });
            return false;
        }
    }

    /**
     * 播放视频
     */
    play() {
        if (this.state === PLAYER_STATES.PLAYING) {
            return;
        }

        try {
            const result = this.adapter.play();

            if (result) {
                this.setState(PLAYER_STATES.PLAYING);
                this.emit(PLAYER_EVENTS.PLAY);
                this._log('Started playback');
            }
        } catch (error) {
            this._handleError({
                type: ERROR_TYPES.MEDIA_ERROR,
                message: 'Failed to start playback',
                originalError: error
            });
        }
    }

    /**
     * 暂停视频
     */
    pause() {
        if (this.state === PLAYER_STATES.PAUSED) {
            return;
        }

        try {
            const result = this.adapter.pause();

            if (result) {
                this.setState(PLAYER_STATES.PAUSED);
                this.emit(PLAYER_EVENTS.PAUSE);
                this._log('Paused playback');
            }
        } catch (error) {
            this._handleError({
                type: ERROR_TYPES.MEDIA_ERROR,
                message: 'Failed to pause playback',
                originalError: error
            });
        }
    }

    /**
     * 跳转到指定时间
     * @param {number} time - 跳转时间（秒）
     */
    seek(time) {
        if (this.options.isLive) {
            this._log('Seek is not supported in live mode', 'warn');
            return;
        }

        try {
            const result = this.adapter.seek(time);

            if (result) {
                this.emit(PLAYER_EVENTS.SEEKING, { time });
                this._log(`Seeking to ${time} seconds`);
            }
        } catch (error) {
            this._handleError({
                type: ERROR_TYPES.MEDIA_ERROR,
                message: `Failed to seek to ${time} seconds`,
                originalError: error
            });
        }
    }

    /**
     * 设置音量
     * @param {number} volume - 音量（0-1）
     */
    setVolume(volume) {
        super.setVolume(volume);

        try {
            this.adapter.setVolume(volume);
        } catch (error) {
            this._log(`Error setting volume: ${error.message}`, 'warn');
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
        if (this.adapter) {
            try {
                this.adapter.destroy();
                this.adapter = null;
            } catch (error) {
                this._log(`Error destroying adapter: ${error.message}`, 'error');
            }
        }

        super.destroy();
    }

    /**
     * 检查浏览器是否支持
     * @returns {boolean} 是否支持
     */
    static isSupported() {
        return mpegts && mpegts.isSupported();
    }
}

export default FlvPlayer;