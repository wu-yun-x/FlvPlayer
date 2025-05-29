/*
 * @Author: st004362
 * @Date: 2025-05-28 15:33:08
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-28 15:33:13
 * @Description: 控制面板组件
 */

import { PLAYER_EVENTS, PLAYER_STATES, UI_COMPONENT_TYPES } from '../constants';

/**
 * 控制面板组件
 */
class ControlPanel {
    /**
     * 创建控制面板组件
     * @param {Object} player - 播放器实例
     * @param {HTMLElement} container - 容器元素
     */
    constructor(player, container) {
        this.player = player;
        this.container = container;
        this.options = player.options;

        // 创建DOM元素
        this._createElements();

        // 绑定事件
        this._bindEvents();
    }

    /**
     * 创建DOM元素
     * @private
     */
    _createElements() {
        // 控制面板容器
        this.panelContainer = document.createElement('div');
        this.panelContainer.className = 'flv-player-control-panel';

        // 左侧控制区
        this.leftControls = document.createElement('div');
        this.leftControls.className = 'flv-player-left-controls';

        // 中间控制区
        this.centerControls = document.createElement('div');
        this.centerControls.className = 'flv-player-center-controls';

        // 右侧控制区
        this.rightControls = document.createElement('div');
        this.rightControls.className = 'flv-player-right-controls';

        // 创建组件
        this._createComponents();

        // 组装DOM
        this.panelContainer.appendChild(this.leftControls);
        this.panelContainer.appendChild(this.centerControls);
        this.panelContainer.appendChild(this.rightControls);

        // 添加到容器
        this.container.appendChild(this.panelContainer);
    }

    /**
     * 创建各个控制组件
     * @private
     */
    _createComponents() {
        const components = this.options.ui && this.options.ui.components ? this.options.ui.components : [];

        // 播放/暂停按钮
        if (components.includes(UI_COMPONENT_TYPES.PLAY_PAUSE)) {
            this._createPlayPauseButton();
        }

        // 时间显示
        if (components.includes(UI_COMPONENT_TYPES.TIME_DISPLAY)) {
            this._createTimeDisplay();
        }

        // 音量控制
        if (components.includes(UI_COMPONENT_TYPES.VOLUME)) {
            this._createVolumeControl();
        }

        // 全屏按钮
        if (components.includes(UI_COMPONENT_TYPES.FULLSCREEN)) {
            this._createFullscreenButton();
        }
    }

    /**
     * 创建播放/暂停按钮
     * @private
     */
    _createPlayPauseButton() {
        this.playPauseButton = document.createElement('button');
        this.playPauseButton.className = 'flv-player-play-pause';
        this.playPauseButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>';
        this.playPauseButton.title = '播放';
        this.leftControls.appendChild(this.playPauseButton);
    }

    /**
     * 创建时间显示
     * @private
     */
    _createTimeDisplay() {
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.className = 'flv-player-time-display';

        // 当前时间
        this.currentTime = document.createElement('span');
        this.currentTime.className = 'flv-player-current-time';
        this.currentTime.textContent = '0:00';

        // 分隔符
        const separator = document.createElement('span');
        separator.textContent = ' / ';

        // 总时长
        this.duration = document.createElement('span');
        this.duration.className = 'flv-player-duration';
        this.duration.textContent = '0:00';

        // 组装
        this.timeDisplay.appendChild(this.currentTime);
        this.timeDisplay.appendChild(separator);
        this.timeDisplay.appendChild(this.duration);

        // 如果是直播模式，使用不同的显示
        if (this.options.isLive || this.options.playMode === 'live') {
            this.timeDisplay.innerHTML = '<span class="flv-player-live-indicator">直播</span>';
        }

        this.leftControls.appendChild(this.timeDisplay);
    }

    /**
     * 创建音量控制
     * @private
     */
    _createVolumeControl() {
        // 音量控制容器
        this.volumeControl = document.createElement('div');
        this.volumeControl.className = 'flv-player-volume-control';

        // 音量按钮
        this.volumeButton = document.createElement('button');
        this.volumeButton.className = 'flv-player-volume-button';
        this.volumeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
        this.volumeButton.title = '静音';

        // 音量滑块容器
        this.volumeSliderContainer = document.createElement('div');
        this.volumeSliderContainer.className = 'flv-player-volume-slider-container';

        // 音量滑块
        this.volumeSlider = document.createElement('input');
        this.volumeSlider.className = 'flv-player-volume-slider';
        this.volumeSlider.type = 'range';
        this.volumeSlider.min = '0';
        this.volumeSlider.max = '100';
        this.volumeSlider.value = this.options.volume * 100 || 100;

        // 组装
        this.volumeSliderContainer.appendChild(this.volumeSlider);
        this.volumeControl.appendChild(this.volumeButton);
        this.volumeControl.appendChild(this.volumeSliderContainer);

        this.rightControls.appendChild(this.volumeControl);
    }

    /**
     * 创建全屏按钮
     * @private
     */
    _createFullscreenButton() {
        this.fullscreenButton = document.createElement('button');
        this.fullscreenButton.className = 'flv-player-fullscreen';
        this.fullscreenButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>';
        this.fullscreenButton.title = '全屏';
        this.rightControls.appendChild(this.fullscreenButton);
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 播放/暂停按钮点击事件
        if (this.playPauseButton) {
            this.playPauseButton.addEventListener('click', this._onPlayPauseClick.bind(this));
        }

        // 音量控制事件
        if (this.volumeButton) {
            this.volumeButton.addEventListener('click', this._onVolumeButtonClick.bind(this));
        }

        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', this._onVolumeChange.bind(this));
        }

        // 全屏按钮点击事件
        if (this.fullscreenButton) {
            this.fullscreenButton.addEventListener('click', this._onFullscreenClick.bind(this));
        }

        // 监听播放器事件
        this.player.on(PLAYER_EVENTS.STATE_CHANGE, this._onPlayerStateChange.bind(this));
        this.player.on(PLAYER_EVENTS.TIME_UPDATE, this._onTimeUpdate.bind(this));
        this.player.on(PLAYER_EVENTS.VOLUME_CHANGE, this._onPlayerVolumeChange.bind(this));
        this.player.on(PLAYER_EVENTS.FULLSCREEN_CHANGE, this._onPlayerFullscreenChange.bind(this));
    }

    /**
     * 处理播放/暂停按钮点击
     * @private
     */
    _onPlayPauseClick() {
        if (this.player.state === PLAYER_STATES.PLAYING) {
            this.player.pause();
        } else {
            this.player.play();
        }
    }

    /**
     * 处理音量按钮点击
     * @private
     */
    _onVolumeButtonClick() {
        const video = this.player.videoElement;

        if (video.muted) {
            video.muted = false;
            this.player.setVolume(this.lastVolume || 1);
        } else {
            this.lastVolume = video.volume;
            video.muted = true;
            this.player.setVolume(0);
        }
    }

    /**
     * 处理音量变化
     * @private
     */
    _onVolumeChange() {
        const volume = parseInt(this.volumeSlider.value, 10) / 100;
        this.player.setVolume(volume);

        // 如果音量为0，设置为静音
        if (volume === 0) {
            this.player.videoElement.muted = true;
        } else {
            this.player.videoElement.muted = false;
        }
    }

    /**
     * 处理全屏按钮点击
     * @private
     */
    _onFullscreenClick() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.player.container.requestFullscreen();
        }
    }

    /**
     * 处理播放器状态变化
     * @param {Object} data - 状态数据
     * @private
     */
    _onPlayerStateChange(data) {
        if (!this.playPauseButton) return;

        // 更新播放/暂停按钮
        if (data.state === PLAYER_STATES.PLAYING) {
            this.playPauseButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>';
            this.playPauseButton.title = '暂停';
        } else {
            this.playPauseButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>';
            this.playPauseButton.title = '播放';
        }
    }

    /**
     * 处理时间更新
     * @param {Object} data - 时间数据
     * @private
     */
    _onTimeUpdate(data) {
        if (!this.currentTime || !this.duration) return;

        // 如果是直播模式，不更新时间
        if (this.options.isLive || this.options.playMode === 'live') return;

        const video = this.player.videoElement;

        // 更新当前时间
        const currentTime = this._formatTime(video.currentTime);
        this.currentTime.textContent = currentTime;

        // 更新总时长
        if (!isNaN(video.duration) && isFinite(video.duration)) {
            const duration = this._formatTime(video.duration);
            this.duration.textContent = duration;
        }
    }

    /**
     * 处理播放器音量变化
     * @param {Object} data - 音量数据
     * @private
     */
    _onPlayerVolumeChange(data) {
        if (!this.volumeSlider || !this.volumeButton) return;

        const volume = data.volume;

        // 更新音量滑块
        this.volumeSlider.value = volume * 100;

        // 更新音量按钮图标
        if (volume === 0 || this.player.videoElement.muted) {
            this.volumeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>';
        } else if (volume < 0.5) {
            this.volumeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"></path></svg>';
        } else {
            this.volumeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
        }
    }

    /**
     * 处理播放器全屏变化
     * @param {Object} data - 全屏数据
     * @private
     */
    _onPlayerFullscreenChange(data) {
        if (!this.fullscreenButton) return;

        // 更新全屏按钮图标
        if (document.fullscreenElement) {
            this.fullscreenButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path></svg>';
            this.fullscreenButton.title = '退出全屏';
        } else {
            this.fullscreenButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>';
            this.fullscreenButton.title = '全屏';
        }
    }

    /**
     * 格式化时间
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的时间字符串
     * @private
     */
    _formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        } else {
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 移除DOM元素
        if (this.panelContainer && this.panelContainer.parentNode) {
            this.panelContainer.parentNode.removeChild(this.panelContainer);
        }

        // 移除事件监听
        this.player.off(PLAYER_EVENTS.STATE_CHANGE, this._onPlayerStateChange);
        this.player.off(PLAYER_EVENTS.TIME_UPDATE, this._onTimeUpdate);
        this.player.off(PLAYER_EVENTS.VOLUME_CHANGE, this._onPlayerVolumeChange);
        this.player.off(PLAYER_EVENTS.FULLSCREEN_CHANGE, this._onPlayerFullscreenChange);
    }
}

export default ControlPanel;
