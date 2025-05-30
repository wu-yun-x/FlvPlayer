/*
 * Player.js
 * 播放器核心类，负责视频元素管理、协议适配、生命周期和事件分发
 *
 * @author: st004362
 * @date: 2025-05-31
 */
import AdapterFactory from '../adapters/AdapterFactory';
import { ADAPTER_TYPES, PLAYER_EVENTS } from '../constants';
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
     * @param {Object} config - 播放器配置
     */
    constructor(config) {
        this.config = config; // 播放器配置
        this.stateMachine = new StateMachine(); // 状态机
        // 创建video元素
        this.video = document.createElement('video');
        this.video.className = 'flv-player-video';
        this.video.controls = !!config.controls;
        this.video.style.width = '100%';
        this.video.style.height = '100%';
        if (config.muted) this.video.muted = true;
        if (config.volume != null) this.video.volume = config.volume;
        // 挂载到容器
        if (typeof config.container === 'string') {
            document.querySelector(config.container).appendChild(this.video);
        } else if (config.container instanceof HTMLElement) {
            config.container.appendChild(this.video);
        }
        // 适配器类型（仅mpegts）
        const type = config.adapter || ADAPTER_TYPES.MPEGTS;
        this.adapter = AdapterFactory.create(type, this.video, config);
        // 绑定video事件
        this._bindVideoEvents();
        // 加载初始url
        this.adapter.load(config.url);
    }

    /**
     * 绑定video元素的原生事件到全局事件总线
     * @private
     */
    _bindVideoEvents() {
        this.video.addEventListener('play', () => eventBus.emit(PLAYER_EVENTS.PLAY));
        this.video.addEventListener('pause', () => eventBus.emit(PLAYER_EVENTS.PAUSE));
        this.video.addEventListener('ended', () => eventBus.emit(PLAYER_EVENTS.ENDED));
        this.video.addEventListener('timeupdate', () => eventBus.emit(PLAYER_EVENTS.TIME_UPDATE, this.video.currentTime));
        this.video.addEventListener('progress', () => eventBus.emit(PLAYER_EVENTS.PROGRESS));
    }

    /**
     * 播放
     * @returns {Promise|undefined}
     */
    play() { return this.adapter.play(); }
    /** 暂停 */
    pause() { return this.adapter.pause(); }
    /**
     * 销毁播放器，移除video和adapter
     */
    destroy() {
        this.adapter.destroy();
        if (this.video && this.video.parentNode) this.video.parentNode.removeChild(this.video);
        eventBus.emit(PLAYER_EVENTS.DESTROY);
    }
    /**
     * 事件监听
     * @param {string} event
     * @param {Function} handler
     */
    on(event, handler) { eventBus.on(event, handler); }
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
        if (this.adapter && typeof this.adapter.load === 'function') {
            this.adapter.load(url);
        }
    }
}

export default Player; 