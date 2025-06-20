/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-20 11:57:33
 * @Description: 播放器核心类，负责视频元素管理、协议适配、生命周期和事件分发
 */
import AdapterFactory from '../adapters/AdapterFactory';
import { ADAPTER_TYPES, PLAYER_EVENTS, DEFAULT_CONFIG, PLAYER_STATES } from '../constants';
import eventBus from '../events/EventBus';
import StateMachine from './StateMachine';

/**
 * Player 播放器核心类
 * - 管理 video 元素
 * - 适配不同协议（仅mpegts）
 * - 生命周期和事件分发
 */
class Player {
    /**
     * 构造函数，初始化播放器
     * @param {Object} options - 播放器配置
     */
    constructor(options) {
        this.options = Object.assign({}, DEFAULT_CONFIG, options); // 播放器配置 合并默认配置
        this.stateMachine = new StateMachine(PLAYER_STATES.INITIALIZED); // 状态机
        // 创建video元素
        this.video = document.createElement('video');
        this.video.className = 'flv-player-video';
        this.video.controls = !!this.options.controls;
        this.video.style.width = '100%';
        this.video.style.height = '100%';
        if (options.muted) this.video.muted = true;
        if (options.volume != null) this.video.volume = options.volume;
        // 挂载到容器
        if (typeof options.container === 'string') {
            document.querySelector(options.container).appendChild(this.video);
        } else if (options.container instanceof HTMLElement) {
            options.container.appendChild(this.video);
        } else {
            throw new Error(
                '[FlvPlayer] options.container must be a CSS selector string or HTMLElement instance, ' +
                `but got: ${Object.prototype.toString.call(options.container)}`
            );
        }
        // 适配器类型（仅mpegts）
        const type = options.adapter || ADAPTER_TYPES.MPEGTS;
        this.adapter = AdapterFactory.create(type, this.video, options);
        // 绑定video事件
        this._bindVideoEvents();
        // 设置为IDLE状态
        this.stateMachine.setState(PLAYER_STATES.IDLE);

        // 加载初始url
        if (options.mediaDataSource && options.mediaDataSource.url) {
            console.log('Loading initial url', options.mediaDataSource.url);
            this.load(options.mediaDataSource.url);
        }

        // 绑定网络质量变化事件
        eventBus.on(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE, this._onNetworkQualityChange.bind(this));
    }

    /**
     * 绑定video元素的原生事件到全局事件总线
     * @private
     */
    _bindVideoEvents() {
        this.video.addEventListener('play', () => {
            eventBus.emit(PLAYER_EVENTS.PLAY);
            if (this.stateMachine.getState() !== PLAYER_STATES.PLAYING) {
                this.stateMachine.setState(PLAYER_STATES.PLAYING);
            }
        });

        this.video.addEventListener('pause', () => {
            eventBus.emit(PLAYER_EVENTS.PAUSE);
            if (this.stateMachine.getState() === PLAYER_STATES.PLAYING) {
                this.stateMachine.setState(PLAYER_STATES.PAUSED);
            }
        });

        this.video.addEventListener('ended', () => {
            eventBus.emit(PLAYER_EVENTS.ENDED);
            this.stateMachine.setState(PLAYER_STATES.ENDED);
        });

        this.video.addEventListener('timeupdate', () => {
            eventBus.emit(PLAYER_EVENTS.TIME_UPDATE, this.video.currentTime);
        });

        this.video.addEventListener('progress', () => {
            eventBus.emit(PLAYER_EVENTS.PROGRESS);
        });

        this.video.addEventListener('canplay', () => {
            // 可以播放时设置为就绪状态
            if (this.stateMachine.getState() === PLAYER_STATES.LOADING) {
                this.stateMachine.setState(PLAYER_STATES.READY);
                eventBus.emit(PLAYER_EVENTS.READY);
            }
        });

        this.video.addEventListener('waiting', () => {
            // 缓冲时设置为缓冲状态
            if (this.stateMachine.getState() === PLAYER_STATES.PLAYING) {
                this.stateMachine.setState(PLAYER_STATES.BUFFERING);
                eventBus.emit(PLAYER_EVENTS.BUFFERING);
            }
        });

        this.video.addEventListener('error', () => {
            this.stateMachine.setState(PLAYER_STATES.ERROR);
            eventBus.emit(PLAYER_EVENTS.ERROR, { source: 'video', code: this.video.error?.code, message: 'Video element error' });
        });
    }

    /**
     * 播放
     * @returns {Promise|undefined}
     */
    play() {
        try {
            // 只有在READY、PAUSED或BUFFERING状态可以播放
            const currentState = this.stateMachine.getState();
            if (currentState !== PLAYER_STATES.READY &&
                currentState !== PLAYER_STATES.PAUSED &&
                currentState !== PLAYER_STATES.BUFFERING) {
                console.warn(`[Player] Cannot start playing from ${currentState} state, should be in READY, PAUSED or BUFFERING state`);
            }

            // 播放视频
            const playPromise = this.video.play();

            // 可能返回Promise或undefined（取决于浏览器）
            return playPromise;
        } catch (error) {
            console.error('[Player] Play error:', error);
            // 设置为错误状态
            this.stateMachine.setState(PLAYER_STATES.ERROR);
            eventBus.emit(PLAYER_EVENTS.ERROR, { source: 'player', message: error.message });
            return Promise.reject(error);
        }
    }

    /** 暂停 */
    pause() {
        if (this.stateMachine.getState() === PLAYER_STATES.PLAYING ||
            this.stateMachine.getState() === PLAYER_STATES.BUFFERING) {
            this.video.pause();
            this.stateMachine.setState(PLAYER_STATES.PAUSED);
        }
    }

    /**
     * 事件监听
     * @param {string} event
     * @param {Function} handler
     */
    on(event, handler) { eventBus.on(event, handler); }
    /**
     * 一次性事件监听
     * @param {string} event
     * @param {Function} handler
     */
    once(event, handler) { eventBus.once(event, handler); }
    /**
     * 事件解绑
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) { eventBus.off(event, handler); }
    /**
     * 获取当前状态
     * @returns {string}            
     */
    get state() { return this.stateMachine.getState(); }
    /**
     * 获取video元素
     * @returns {HTMLVideoElement}
     */
    get videoElement() { return this.video; }

    /**
     * 设置音量
     * @param {number} volume 0~1
     */
    setVolume(volume) {
        if (this.video) {
            this.video.volume = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * 加载新的视频源
     * @param {string} url
     */
    load(url) {
        // 确保从有效状态转换到LOADING状态
        const currentState = this.stateMachine.getState();
        console.log(currentState, PLAYER_STATES, '[Player] Loading new video source')
        if (currentState === PLAYER_STATES.INITIALIZED ||
            currentState === PLAYER_STATES.IDLE ||
            currentState === PLAYER_STATES.ERROR ||
            currentState === PLAYER_STATES.ENDED) {
            this.stateMachine.setState(PLAYER_STATES.LOADING);
            if (this.adapter && typeof this.adapter.load === 'function') {
                this.adapter.load(url);
            }
        } else {
            console.warn(`[Player] Cannot load new URL from ${currentState} state, please reset the player first`);
        }
    }

    /**
     * 获取当前视频统计信息
     * @returns {Object|null}
     */
    getStatisticsInfo() {
        if (!this.video) return null;
        const buffered = this.video.buffered;
        return {
            currentTime: this.video.currentTime,
            duration: this.video.duration,
            buffered: buffered.length ? buffered.end(buffered.length - 1) : 0,
            volume: this.video.volume,
            paused: this.video.paused,
            readyState: this.video.readyState,
            networkState: this.video.networkState
        };
    }
    /**
     * 网络质量变化事件
     * @param {Object} quality 网络质量信息
     */
    // 网络质量变化处理
    _onNetworkQualityChange(data) {
        // 更新状态
        this.networkQuality = data.quality;

        // 记录日志
        console.log(`[Player] Network quality change: ${data.quality}, bitrate: ${Math.round(data.bitrate / 1000)}kbps`);

        // 触发UI更新
        eventBus.emit(PLAYER_EVENTS.UI_UPDATE, {
            type: 'networkQuality',
            data: {
                quality: data.quality,
                bitrate: Math.round(data.bitrate / 1000) + ' kbps',
                bufferHealth: Math.round(data.bufferHealth * 100) + '%'
            }
        });

        console.log(`[Player] Network quality change: ${data.quality}, bitrate: ${Math.round(data.bitrate / 1000)}kbps`);
    }
    /**
     * 获取硬件加速信息
     * @returns {Object|null} 硬件加速信息
     */
    getHardwareAccelerationInfo() {
        if (this.adapter && typeof this.adapter.getHardwareAccelerationInfo === 'function') {
            return this.adapter.getHardwareAccelerationInfo();
        }
        return null;
    }
    /**
     * 设置硬件加速状态
     * @param {Object} options - 配置选项
     * @param {boolean} options.enabled - 是否启用硬件加速
     * @param {boolean} options.allowSoftwareRendering - 是否允许软件渲染
     * @returns {Object|null} 硬件加速信息
     */
    setHardwareAcceleration(options = {}) {
        if (this.adapter && typeof this.adapter.setHardwareAcceleration === 'function') {
            return this.adapter.setHardwareAcceleration(options);
        }
        return null;
    }
    /** 销毁播放器，移除video和adapter */
    destroy() {
        // 解绑网络质量事件
        eventBus.off(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE, this._onNetworkQualityChange);
        this.stateMachine.setState(PLAYER_STATES.DESTROYING);
        this.adapter.destroy();
        if (this.video && this.video.parentNode) this.video.parentNode.removeChild(this.video);
        eventBus.emit(PLAYER_EVENTS.DESTROY);
    }
}

export default Player; 