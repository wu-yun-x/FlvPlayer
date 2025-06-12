/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-12 14:32:37
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
        this.stateMachine = new StateMachine(); // 状态机
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
                '[FlvPlayer] options.container 必须是一个 CSS 选择器字符串或 HTMLElement 实例，' +
                `但实际得到的是：${Object.prototype.toString.call(options.container)}`
            );
        }
        // 适配器类型（仅mpegts）
        const type = options.adapter || ADAPTER_TYPES.MPEGTS;
        this.adapter = AdapterFactory.create(type, this.video, options);
        // 绑定video事件
        this._bindVideoEvents();
        // 加载初始url
        this.adapter.load(options.mediaDataSource.url);
        // 绑定网络质量变化事件
        eventBus.on(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE, this._onNetworkQualityChange.bind(this));
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
        this.video.addEventListener('canplay', () => {
            if (this.stateMachine.getState() !== PLAYER_STATES.PLAYING) {
                this.stateMachine.setState(PLAYER_STATES.READY);
                eventBus.emit(PLAYER_EVENTS.READY);
            }
        });
    }

    /**
     * 播放
     * @returns {Promise|undefined}
     */
    play() {
        this.stateMachine.setState(PLAYER_STATES.PLAYING);
        return this.adapter.play();
    }
    /** 暂停 */
    pause() {
        this.stateMachine.setState(PLAYER_STATES.PAUSED);
        return this.adapter.pause();
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
        this.stateMachine.setState(PLAYER_STATES.LOADING);
        if (this.adapter && typeof this.adapter.load === 'function') {
            this.adapter.load(url);
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
        console.log(data, '网络质量变化处理')
        // 更新状态
        this.networkQuality = data.quality;

        // 记录日志
        console.log(`[Player] 网络质量变化: ${data.quality}, 比特率: ${Math.round(data.bitrate / 1000)}kbps`);

        // 触发UI更新
        eventBus.emit(PLAYER_EVENTS.UI_UPDATE, {
            type: 'networkQuality',
            data: {
                quality: data.quality,
                bitrate: Math.round(data.bitrate / 1000) + ' kbps',
                bufferHealth: Math.round(data.bufferHealth * 100) + '%'
            }
        });

        console.log(`[Player] 网络质量变化: ${data.quality}, 比特率: ${Math.round(data.bitrate / 1000)}kbps`);
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