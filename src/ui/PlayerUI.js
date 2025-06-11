/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-11 11:51:06
 * @Description: 点播（录播）播放器UI组件，结构化分区，黑底白字半透明风格
 * 所有UI元素均有className，便于自定义样式和维护
 */
import { PLAYER_EVENTS } from '../constants';

/**
 * PlayerUI 负责渲染和管理播放器的用户界面（UI）
 * - 结构分为左中右三块，便于扩展
 * - 通过className实现样式隔离
 * - 事件绑定与解绑规范，防止内存泄漏
 */
class PlayerUI {
    /**
     * 构造函数，初始化UI
     * @param {Player} player - 播放器实例
     */
    constructor(player) {
        this.player = player; // 播放器实例
        this.video = player.videoElement; // video元素
        this.config = player.config; // 播放器配置
        this._init();

        // 监听状态变更
        this.player.on('state_change', (newState) => {
            this._onPlayerStateChange(newState);
        });
    }

    /**
     * 初始化UI结构和事件
     * @private
     */
    _init() {
        // 创建UI容器，插入到video后面
        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'flv-player-ui-container';
        this.video.parentNode.insertBefore(this.uiContainer, this.video.nextSibling);

        // 创建控制栏
        this._createControlBar();
        // 绑定播放器和UI事件
        this._bindPlayerEvents();
        this._bindUIEvents();
        // 初始化UI状态
        this._updatePlayPause();
        this._updateProgress();
        this._updateVolume();
    }

    /**
     * 创建控制栏结构（左中右分区）
     * @private
     */
    _createControlBar() {
        // 控制栏主容器
        this.controlBar = document.createElement('div');
        this.controlBar.className = 'flv-player-controlbar';
        this.uiContainer.appendChild(this.controlBar);

        // 左侧区域：播放/暂停、时间
        this.leftControls = document.createElement('div');
        this.leftControls.className = 'flv-player-left';
        this.controlBar.appendChild(this.leftControls);
        // 播放/暂停按钮
        this.playBtn = document.createElement('button');
        this.playBtn.className = 'flv-player-play';
        this.playBtn.title = '播放/暂停';
        this.leftControls.appendChild(this.playBtn);
        // 时间显示
        this.time = document.createElement('span');
        this.time.className = 'flv-player-time';
        this.leftControls.appendChild(this.time);

        // 中间区域：进度条
        this.centerControls = document.createElement('div');
        this.centerControls.className = 'flv-player-center';
        this.controlBar.appendChild(this.centerControls);
        // 进度条
        this.progress = document.createElement('input');
        this.progress.type = 'range';
        this.progress.className = 'flv-player-progress';
        this.progress.min = 0;
        this.progress.max = 100;
        this.progress.value = 0;
        this.centerControls.appendChild(this.progress);

        // 右侧区域：倍速、音量、全屏
        this.rightControls = document.createElement('div');
        this.rightControls.className = 'flv-player-right';
        this.controlBar.appendChild(this.rightControls);
        // 倍速选择
        this.speed = document.createElement('select');
        this.speed.className = 'flv-player-speed';
        [0.5, 1, 1.5, 2].forEach(rate => {
            const opt = document.createElement('option');
            opt.value = rate;
            opt.textContent = `${rate}x`;
            if (rate === 1) opt.selected = true;
            this.speed.appendChild(opt);
        });
        this.rightControls.appendChild(this.speed);
        // 音量滑块
        this.volume = document.createElement('input');
        this.volume.type = 'range';
        this.volume.className = 'flv-player-volume';
        this.volume.min = 0;
        this.volume.max = 100;
        this.volume.value = 100;
        this.rightControls.appendChild(this.volume);
        // 全屏按钮
        this.fullscreenBtn = document.createElement('button');
        this.fullscreenBtn.className = 'flv-player-fullscreen';
        this.fullscreenBtn.title = '全屏';
        this.fullscreenBtn.textContent = '⛶';
        this.rightControls.appendChild(this.fullscreenBtn);
    }

    /**
     * 绑定UI控件事件
     * @private
     */
    _bindUIEvents() {
        // 播放/暂停
        this.playBtn.onclick = () => {
            if (this.video.paused) this.player.play();
            else this.player.pause();
        };
        // 进度条拖动
        this.progress.oninput = e => {
            const percent = e.target.value / 100;
            const duration = this.video.duration;
            if (!isNaN(duration)) this.video.currentTime = percent * duration;
        };
        // 倍速切换
        this.speed.onchange = e => {
            this.video.playbackRate = parseFloat(e.target.value);
        };
        // 音量调节
        this.volume.oninput = e => {
            const volume = e.target.value / 100;
            this.player.setVolume(volume);
        };
        // 全屏切换
        this.fullscreenBtn.onclick = () => {
            const el = this.player.videoElement.parentNode;
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            else if (el.msRequestFullscreen) el.msRequestFullscreen();
        };
    }

    /**
     * 绑定video元素的事件，驱动UI状态
     * @private
     */
    _bindPlayerEvents() {
        // 事件处理函数缓存，便于解绑
        this._onPlay = () => this._updatePlayPause();
        this._onPause = () => this._updatePlayPause();
        this._onTimeUpdate = () => this._updateProgress();
        this._onEnded = () => this._updatePlayPause();
        this._onVolumeChange = () => this._updateVolume();
        this._onDurationChange = () => this._updateProgress();

        this.video.addEventListener('play', this._onPlay);
        this.video.addEventListener('pause', this._onPause);
        this.video.addEventListener('timeupdate', this._onTimeUpdate);
        this.video.addEventListener('ended', this._onEnded);
        this.video.addEventListener('volumechange', this._onVolumeChange);
        this.video.addEventListener('durationchange', this._onDurationChange);
    }

    /**
     * 更新播放/暂停按钮UI
     * @private
     */
    _updatePlayPause() {
        this.playBtn.textContent = this.video.paused ? '▶️' : '⏸️';
    }

    /**
     * 更新进度条和时间显示
     * @private
     */
    _updateProgress() {
        const cur = this.video.currentTime || 0;
        const dur = this.video.duration || 0;
        this.progress.value = dur ? (cur / dur * 100) : 0;
        this.time.textContent = `${this._format(cur)} / ${this._format(dur)}`;
    }

    /**
     * 更新音量滑块
     * @private
     */
    _updateVolume() {
        this.volume.value = Math.round((this.video.volume || 1) * 100);
    }

    /**
     * 秒数转mm:ss格式
     * @param {number} sec
     * @returns {string}
     * @private
     */
    _format(sec) {
        sec = Math.floor(sec);
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    /**
     * 根据状态更新UI
     * @param {string} newState
     * @private
     */
    _onPlayerStateChange(newState) {
        switch (newState) {
            case 'loading':
                this._showLoading();
                break;
            case 'playing':
                this._hideLoading();
                this._hideError();
                break;
            case 'paused':
                this._hideLoading();
                this._hideError();
                break;
            case 'ended':
                this._hideLoading();
                this._hideError();
                break;
            case 'error':
                this._showError();
                break;
            case 'destroyed':
                this._hideLoading();
                this._hideError();
                break;
            default:
                this._hideLoading();
                this._hideError();
                break;
        }
    }

    /**
     * 展示loading动画
     * @private
     */
    _showLoading() {
        // 展示loading动画
    }
    /**
     * 隐藏loading动画
     * @private
     */
    _hideLoading() {
        // 隐藏loading动画
    }
    /**
     * 展示错误提示
     * @private
     */
    _showError() {
        // 展示错误提示
    }
    /**
     * 隐藏错误提示
     * @private
     */
    _hideError() {
        // 隐藏错误提示
    }

    /**
     * 销毁UI，解绑所有事件，移除DOM
     */
    destroy() {
        // 解绑video事件
        this.video.removeEventListener('play', this._onPlay);
        this.video.removeEventListener('pause', this._onPause);
        this.video.removeEventListener('timeupdate', this._onTimeUpdate);
        this.video.removeEventListener('ended', this._onEnded);
        this.video.removeEventListener('volumechange', this._onVolumeChange);
        this.video.removeEventListener('durationchange', this._onDurationChange);
        // 移除UI容器
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
    }
}

export default PlayerUI; 