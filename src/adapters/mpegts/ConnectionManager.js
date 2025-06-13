/*
 * @Author: st004362
 * @Date: 2025-06-13 11:25:18
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-13 14:08:01
 * @Description: 连接管理模块，负责处理连接、重连和超时
 */

import eventBus from '../../events/EventBus';
import { PLAYER_EVENTS, ERROR_TYPES } from '../../constants';

class ConnectionManager {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {number} options.connectionTimeout - 连接超时时间(毫秒)
     * @param {number} options.dataTimeout - 数据接收超时时间(毫秒)
     * @param {number} options.maxErrorRetries - 最大重试次数
     * @param {number} options.retryInterval - 重试间隔(毫秒)
     * @param {number} options.maxRetryInterval - 最大重试间隔(毫秒)
     */
    constructor(options) {
        // 超时配置
        this.connectionTimeout = options.connectionTimeout;
        this.dataTimeout = options.dataTimeout;

        // 重连配置
        this.maxErrorRetries = options.maxErrorRetries;
        this.retryInterval = options.retryInterval;
        this.maxRetryInterval = options.maxRetryInterval;

        // 状态
        this._currentRetry = 0;
        this._retryTimer = null;
        this._connectionStartTime = null;
        this._isConnected = false;
        this._hasReceivedData = false;
        this._connectionTimeoutTimer = null;
        this._dataTimeoutTimer = null;

        // 回调函数
        this._onRetryCallback = options.onRetry;
    }

    /**
    * 开始连接
    */
    connect() {
        this._connectionStartTime = Date.now();

        // 清除之前的计时器
        this._clearAllTimers();

        // 设置连接超时计时器
        this._connectionTimeoutTimer = setTimeout(() => {
            if (!this._hasReceivedData) {
                this._handleTimeout('Connection timeout');
            }
        }, this.connectionTimeout);

        // 调用连接回调
        if (typeof this._onConnectCallback === 'function') {
            this._onConnectCallback();
        }
    }

    /**
     * 处理超时事件
     * @param {string} reason - 超时原因
     */
    _handleTimeout(reason) {
        console.warn(`[ConnectionManager] ${reason}`);
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
                console.warn('[ConnectionManager] 达到最大重试次数，停止重连');
                eventBus.emit(PLAYER_EVENTS.RECONNECT_FAILED);

                // 调用销毁回调
                if (typeof this._onDestroyCallback === 'function') {
                    this._onDestroyCallback();
                }
            }
        }
    }

    /**
     * 处理错误事件
     * @param {Object} error - 错误信息
     */
    handleError(error) {
        console.error('[ConnectionManager] 播放器错误:', error);
        this._clearAllTimers();

        // 检查是否需要重试
        if (this._currentRetry < this.maxErrorRetries) {
            this._scheduleRetry();
        } else {
            console.warn('[ConnectionManager] 达到最大重试次数，停止重连');
            eventBus.emit(PLAYER_EVENTS.RECONNECT_FAILED);

            // 调用销毁回调
            if (typeof this._onDestroyCallback === 'function') {
                this._onDestroyCallback();
            }
        }

        // 转发错误事件
        eventBus.emit(PLAYER_EVENTS.ERROR, error);
    }

    /**
     * 计算指数退避延迟时间
     * @returns {number} 延迟时间(毫秒)
     */
    _getRetryDelay() {
        // 使用指数退避算法：baseDelay * (2 ^ retryCount)
        const delay = this.retryInterval * Math.pow(2, this._currentRetry);
        // 添加一些随机性，避免多个客户端同时重连
        const jitter = Math.random() * 1000;
        // 确保不超过最大延迟时间
        return Math.floor(Math.min(delay + jitter, this.maxRetryInterval));
    }

    /**
     * 计划重连
     */
    _scheduleRetry() {
        const delay = this._getRetryDelay();
        console.log(`[ConnectionManager] 计划第 ${this._currentRetry + 1}/${this.maxErrorRetries} 次重连，延迟: ${delay}ms`);

        eventBus.emit(PLAYER_EVENTS.RECONNECTING, {
            attempt: this._currentRetry + 1,
            maxErrorRetries: this.maxErrorRetries,
            delay: delay
        });

        this._retryTimer = setTimeout(() => {
            this._currentRetry++;
            this._isConnected = false;
            this._hasReceivedData = false;

            // 调用重试回调
            if (typeof this._onRetryCallback === 'function') {
                this._onRetryCallback();
            }
        }, delay);
    }

    /**
     * 清除所有计时器
     */
    _clearAllTimers() {
        if (this._connectionTimeoutTimer) {
            clearTimeout(this._connectionTimeoutTimer);
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
     * 设置连接状态
     * @param {boolean} connected - 是否已连接
     */
    setConnected(connected) {
        this._isConnected = connected;

        if (connected) {
            console.log(`[ConnectionManager] 连接已建立，耗时: ${Date.now() - this._connectionStartTime}ms`);
        }
    }

    /**
     * 设置数据接收状态
     * @param {boolean} received - 是否已接收数据
     */
    setDataReceived(received) {
        if (received && !this._hasReceivedData) {
            this._hasReceivedData = true;
            this._currentRetry = 0; // 重置重试计数
            console.log(`[MpegtsAdapter] 收到首个媒体数据，总耗时: ${Date.now() - this._connectionStartTime}ms`);
        }
    }

    /**
    * 获取连接状态
    * @returns {boolean} 是否已连接
    */
    isConnected() {
        return this._isConnected;
    }

    /**
     * 获取数据接收状态
     * @returns {boolean} 是否已接收数据
     */
    hasReceivedData() {
        return this._hasReceivedData;
    }

    /**
     * 获取当前重试次数
     * @returns {number} 当前重试次数
     */
    getCurrentRetry() {
        return this._currentRetry;
    }

    /**
     * 重置连接管理器状态
     */
    reset() {
        this._clearAllTimers();
        this._currentRetry = 0;
        this._isConnected = false;
        this._hasReceivedData = false;
    }

    /**
     * 销毁连接管理器
     */
    destroy() {
        this._clearAllTimers();
    }
}

export default ConnectionManager;
