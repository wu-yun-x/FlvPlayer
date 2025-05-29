/*
 * @Author: st004362
 * @Date: 2025-05-28 15:30:15
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 19:15:25
 * @Description: 定义播放器接口和共享功能
 */

import EventEmitter from '../utils/EventEmitter';
import { PLAYER_STATES, PLAYER_EVENTS, ERROR_TYPES, DEFAULT_CONFIG } from '../constants';
import PlayerUI from '../ui/PlayerUI';

class BasePlayer extends EventEmitter {
    constructor(options = {}) {
        super()
        this.options = this._mergeOptions(options)
        this.state = PLAYER_STATES.IDLE
        this.container = null
        this.videoElement = null
        this.errorCount = 0
        this.maxErrorRetries = this.options.maxErrorRetries || DEFAULT_CONFIG.maxErrorRetries
        this.retryTimer = null
        this._init()
    }

    _mergeOptions(options) {
        // 合并默认选项和用户选项
        const defaultOptions = {
            ...DEFAULT_CONFIG,
            ...options
        }
        return { ...defaultOptions }
    }

    _init() {
        // 初始化逻辑
        this._initContainer()
        this._initVideoElement()
        this._bindEvents()

        // 初始化UI组件
        this._initUI()

        this.setState(PLAYER_STATES.INITIALIZED)
        this.emit(PLAYER_EVENTS.INITIALIZED, this)

        if (this.options.url) {
            this.load(this.options.url)
        }
    }

    _initContainer() {
        // 初始化容器
        const { container } = this.options
        if (typeof container === 'string') {
            this.container = document.querySelector(container)
        } else if (container instanceof HTMLElement) {
            this.container = container
        } else {
            throw new Error('Container must be a CSS selector string or HTMLElement')
        }

        if (!this.container) {
            throw new Error('Container element not found')
        }
    }

    _initVideoElement() {
        // 初始化视频元素
        this.videoElement = document.createElement('video')
        this.videoElement.className = 'flv-player-video'

        // 设置视频属性
        if (this.options.controls) {
            this.videoElement.controls = true
        }

        this.videoElement.muted = !!this.options.muted
        this.videoElement.volume = this.options.volume
        this.videoElement.style.width = '100%'
        this.videoElement.style.height = '100%'

        // 禁用右键菜单
        this.videoElement.oncontextmenu = () => false;

        // 对于直播流，禁用浏览器默认的缓冲行为
        if (this.options.isLive) {
            // 尽量减少缓冲
            this.videoElement.preload = 'none';
        }

        // 添加到容器
        this.container.appendChild(this.videoElement)
    }

    /**
     * 初始化UI组件
     * @private
     */
    _initUI() {
        // 如果启用了UI
        if (this.options.ui && this.options.ui.enabled !== false) {
            try {
                // 创建UI实例
                this.ui = new PlayerUI(this, {
                    ...this.options.ui,
                    playMode: this.options.playMode
                });

                if (this.options.debug) {
                    this._log('UI组件初始化成功');
                }
            } catch (error) {
                this._log(`UI组件初始化失败: ${error.message}`, 'error');
            }
        }
    }

    _bindEvents() {
        // 绑定视频元素事件
        const events = [
            'play', 'pause', 'ended', 'timeupdate', 'seeking',
            'seeked', 'volumechange', 'waiting', 'playing', 'canplay'
        ]

        events.forEach(eventName => {
            this.videoElement.addEventListener(eventName, (e) => {
                this.emit(eventName, e)
                this._log(`Video event: ${eventName}`)
            })
        })

        // 错误处理
        this.videoElement.addEventListener('error', this._handleError.bind(this))
    }

    setState(state) {
        // 状态管理
        const prevState = this.state
        this.state = state
        this.emit(PLAYER_EVENTS.STATE_CHANGE, { prevState, currentState: state })
        this._log(`State changed from ${prevState} to ${state}`)
    }

    getState() {
        return this.state
    }

    load(url) {
        // 加载视频URL的基本实现
        this.options.url = url
        this.setState(PLAYER_STATES.LOADING)
        this.emit(PLAYER_EVENTS.LOADING, { url })
        this._log(`Loading URL: ${url}`)
        // 具体加载逻辑由子类实现
    }

    // 抽象方法需要子类实现
    play() {
        throw new Error('Method not implemented')
    }

    pause() {
        throw new Error('Method not implemented')
    }

    seek(time) {
        throw new Error('Method not implemented')
    }

    setVolume(volume) {
        if (volume < 0 || volume > 1) {
            throw new Error('Volume must be between 0 and 1')
        }
        this.videoElement.volume = volume
        this.options.volume = volume
        this.emit(PLAYER_EVENTS.VOLUME_CHANGE, { volume })
        this._log(`Volume set to ${volume}`)
    }

    mute() {
        this.videoElement.muted = true
        this.emit(PLAYER_EVENTS.MUTE, {})
        this._log('Player muted')
    }

    unmute() {
        this.videoElement.muted = false
        this.emit(PLAYER_EVENTS.UNMUTE, {})
        this._log('Player unmuted')
    }

    _clearRetryTimer() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    _handleError(error) {
        // 基本错误处理逻辑
        this.errorCount++
        this.setState(PLAYER_STATES.ERROR)

        const errorInfo = {
            type: ERROR_TYPES.UNKNOWN,
            message: 'An unknown error occurred',
            originalError: error,
            count: this.errorCount
        }

        if (error && error.target && error.target.error) {
            const mediaError = error.target.error
            errorInfo.code = mediaError.code
            errorInfo.message = mediaError.message

            switch (mediaError.code) {
                case 1:
                    errorInfo.type = ERROR_TYPES.MEDIA_ERROR
                    errorInfo.message = 'Media resource not found'
                    break
                case 2:
                    errorInfo.type = ERROR_TYPES.NETWORK_ERROR
                    errorInfo.message = 'Network error occurred during playback'
                    break
                case 3:
                    errorInfo.type = ERROR_TYPES.DECODE_ERROR
                    errorInfo.message = 'Media decoding error'
                    break
                case 4:
                    errorInfo.type = ERROR_TYPES.NOT_SUPPORTED
                    errorInfo.message = 'Media format not supported'
                    break
            }
        }

        this.emit(PLAYER_EVENTS.ERROR, errorInfo)
        this._log(`Error: ${errorInfo.message}`, 'error')

        // 自动重试
        if (this.options.autoReconnect !== false && this.errorCount <= this.maxErrorRetries && this.options.url) {
            // 清除之前的重试计时器
            this._clearRetryTimer();

            // 计算退避时间 (指数退避策略)
            const retryDelay = Math.min(
                this.options.retryInterval * Math.pow(1.5, this.errorCount - 1),
                10000 // 最大10秒
            );

            this._log(`Retrying playback (${this.errorCount}/${this.maxErrorRetries}) in ${retryDelay}ms...`);

            this.retryTimer = setTimeout(() => {
                if (this.state !== PLAYER_STATES.DESTROYED) {
                    this.load(this.options.url);
                }
            }, retryDelay);
        }
    }

    destroy() {
        // 通用销毁逻辑
        this.setState(PLAYER_STATES.DESTROYING)

        // 清除重试计时器
        this._clearRetryTimer();

        // 销毁UI组件
        if (this.ui) {
            try {
                this.ui.destroy();
                this.ui = null;
                if (this.options.debug) {
                    this._log('UI组件已销毁');
                }
            } catch (error) {
                this._log(`UI组件销毁失败: ${error.message}`, 'error');
            }
        }

        // 移除事件监听
        if (this.videoElement) {
            const events = [
                'play', 'pause', 'ended', 'timeupdate', 'seeking',
                'seeked', 'volumechange', 'waiting', 'playing', 'canplay', 'error'
            ]

            events.forEach(eventName => {
                this.videoElement.removeEventListener(eventName, () => { })
            })

            // 从DOM中移除视频元素
            if (this.videoElement.parentNode) {
                this.videoElement.parentNode.removeChild(this.videoElement)
            }

            this.videoElement = null
        }

        // 清除所有事件监听器
        this._events = {}

        this.setState(PLAYER_STATES.DESTROYED)
        this._log('Player destroyed')
    }

    _log(message, level = 'info') {
        if (!this.options.debug) return

        const prefix = '[FlvPlayer]'
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`)
                break
            case 'warn':
                console.warn(`${prefix} ${message}`)
                break
            case 'info':
            default:
                console.log(`${prefix} ${message}`)
        }
    }
}

export default BasePlayer;