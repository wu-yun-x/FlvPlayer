/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-16 11:37:42
 * @Description: mpegts.js 协议适配器，负责与 mpegts.js 实例交互，提供统一的播放器适配接口
 */

import mpegts from 'mpegts.js';
import eventBus from '../events/EventBus';
import NetworkMonitor from './mpegts/NetworkMonitor';
import LatencyController from './mpegts/LatencyController';
import ConnectionManager from './mpegts/ConnectionManager';
import HardwareAccelerator from './mpegts/HardwareAccelerator';
import { PLAYER_EVENTS } from '../constants';

class MpegtsAdapter {
    constructor(video, options) {
        this.video = video;
        this.config = options.mpegtsConfig || {};
        this.mediaDataSource = options.mediaDataSource || {};

        // 创建模块实例
        this.connectionManager = new ConnectionManager({
            connectionTimeout: options.connectionTimeout,
            dataTimeout: options.dataTimeout,
            maxErrorRetries: options.maxErrorRetries,
            retryInterval: options.retryInterval,
            maxRetryInterval: options.maxRetryInterval,
            onRetry: this._createPlayer.bind(this),
            onConnect: null,
            onDestroy: this.destroy.bind(this)
        });

        this.hardwareAccelerator = new HardwareAccelerator({
            config: this.config,
            enabled: options.enableHardwareAcceleration !== false
        });

        // 初始化
        this._init();
    }

    _init() {
        if (mpegts.getFeatureList().mseLivePlayback) {
            this._createPlayer();
        }
    }

    _createPlayer() {
        // 开始连接
        this.connectionManager.connect();

        // 确保mediaDataSource存在
        if (!this.mediaDataSource) {
            this.mediaDataSource = {};
        }

        // 创建播放器实例
        this.player = mpegts.createPlayer(this.mediaDataSource, this.config);

        // 绑定事件
        this._bindEvents();

        // 附加媒体元素
        this.player.attachMediaElement(this.video);

        // 创建其他模块
        this.networkMonitor = new NetworkMonitor({
            video: this.video,
            player: this.player,
            qualityCheckInterval: 5000
        });

        this.latencyController = new LatencyController({
            video: this.video,
            player: this.player,
            latencyMonitorEnabled: true
        });

        // 加载
        this.player.load();
    }

    _bindEvents() {
        // 错误事件处理
        this.player.on(mpegts.Events.ERROR, (error) => {
            this.connectionManager.handleError(error);
        });

        // 统计信息事件
        this.player.on(mpegts.Events.STATISTICS_INFO, (info) => {
            // 更新网络监控数据
            this.networkMonitor.updateDataReceiveHistory(info);

            // 设置连接和数据接收状态
            if (info && typeof info.totalBytes === 'number') {
                this.connectionManager.setConnected(true);
                if (info.totalBytes > 0) {
                    this.connectionManager.setDataReceived(true);
                }
            }

            // 转发统计信息
            eventBus.emit(PLAYER_EVENTS.STATS_UPDATE, {
                statisticsInfo: info,
                isConnected: this.connectionManager.isConnected(),
                hasReceivedData: this.connectionManager.hasReceivedData(),
                connectionTime: Date.now() - this.connectionManager._connectionStartTime
            });
        });

        // 媒体信息事件
        this.player.on(mpegts.Events.MEDIA_INFO, (info) => {
            this.connectionManager.setConnected(true);
            this.connectionManager.setDataReceived(true);
            this.networkMonitor.setConnected(true);
            eventBus.emit(PLAYER_EVENTS.MEDIA_INFO, info);
        });
    }

    // 公共方法

    load(url) {
        if (this.player) {
            this.player.unload();
            this.player.detachMediaElement();
            this.player.destroy();
        }

        // 确保config和mediaDataSource存在
        if (!this.config) {
            this.config = {};
        }

        if (!this.mediaDataSource) {
            this.mediaDataSource = {};
        }

        // 更新媒体源URL
        this.mediaDataSource.url = url;

        this.connectionManager.reset();
        this._init();
    }

    play() {
        return this.video.play();
    }

    pause() { this.video.pause(); }

    getHardwareAccelerationInfo() {
        return this.hardwareAccelerator.getHardwareAccelerationInfo();
    }

    setHardwareAcceleration(options) {
        return this.hardwareAccelerator.setHardwareAcceleration(options);
    }

    destroy() {
        if (this.networkMonitor) {
            this.networkMonitor.destroy();
        }

        if (this.latencyController) {
            this.latencyController.destroy();
        }

        if (this.connectionManager) {
            this.connectionManager.destroy();
        }

        if (this.player) {
            this.player.unload();
            this.player.detachMediaElement();
            this.player.destroy();
            this.player = null;
        }
    }
}

export default MpegtsAdapter;