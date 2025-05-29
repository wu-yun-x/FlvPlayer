/*
 * @Author: st004362
 * @Date: 2025-05-28 15:33:08
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 17:28:16
 * @Description: 进度条组件
 */

import { PLAYER_EVENTS, PLAYER_STATES, PLAY_MODES } from '../constants';

/**
 * 进度条组件
 */
class ProgressBar {
    /**
     * 创建进度条组件
     * @param {Object} player - 播放器实例
     * @param {HTMLElement} container - 容器元素
     */
    constructor(player, container) {
        this.player = player;
        this.container = container;
        this.isVod = player.options.playMode === PLAY_MODES.VOD || !player.options.isLive;

        // 创建DOM元素
        this._createElements();

        // 绑定事件
        this._bindEvents();

        // 初始化进度
        this._updateProgress(0);
        this._updateBuffered(0);
    }

    /**
     * 创建DOM元素
     * @private
     */
    _createElements() {
        // 进度条容器
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'flv-player-progress-container';

        // 缓冲进度条
        this.bufferedBar = document.createElement('div');
        this.bufferedBar.className = 'flv-player-buffered-bar';

        // 播放进度条
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'flv-player-progress-bar';

        // 进度点
        this.progressDot = document.createElement('div');
        this.progressDot.className = 'flv-player-progress-dot';

        // 时间提示
        this.timeTooltip = document.createElement('div');
        this.timeTooltip.className = 'flv-player-time-tooltip';

        // 组装DOM
        this.progressBar.appendChild(this.progressDot);
        this.progressContainer.appendChild(this.bufferedBar);
        this.progressContainer.appendChild(this.progressBar);
        this.progressContainer.appendChild(this.timeTooltip);

        // 添加到容器
        this.container.appendChild(this.progressContainer);

        // 如果不是点播模式，添加提示类
        if (!this.isVod) {
            this.progressContainer.classList.add('live-mode');
        }
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 仅在点播模式下绑定拖拽事件
        if (this.isVod) {
            // 鼠标按下
            this.progressContainer.addEventListener('mousedown', this._onMouseDown.bind(this));

            // 鼠标移动（显示时间提示）
            this.progressContainer.addEventListener('mousemove', this._onMouseMove.bind(this));

            // 鼠标离开
            this.progressContainer.addEventListener('mouseleave', () => {
                this.timeTooltip.style.display = 'none';
            });
        }

        // 监听播放器事件
        this.player.on(PLAYER_EVENTS.TIME_UPDATE, this._onTimeUpdate.bind(this));
        this.player.on(PLAYER_EVENTS.PROGRESS, this._onProgress.bind(this));

        // 监听播放器状态变化
        this.player.on(PLAYER_EVENTS.STATE_CHANGE, (data) => {
            if (data.state === PLAYER_STATES.ENDED) {
                this._updateProgress(1); // 播放结束时进度为100%
            }
        });
    }

    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} event - 鼠标事件
     * @private
     */
    _onMouseDown(event) {
        // 如果不是点播模式，不处理拖拽
        if (!this.isVod) return;

        // 计算新的播放位置
        const percent = this._getEventPercent(event);
        this._updateProgress(percent);

        // 获取总时长
        const duration = this.player.videoElement.duration;
        if (!isNaN(duration) && isFinite(duration)) {
            // 跳转到新位置
            this.player.seek(duration * percent);
        }

        // 阻止冒泡和默认行为
        event.stopPropagation();
        event.preventDefault();

        // 绑定鼠标移动和抬起事件
        const onMouseMove = (e) => {
            const newPercent = this._getEventPercent(e);
            this._updateProgress(newPercent);

            // 显示时间提示
            this._showTimeTooltip(e, newPercent);
        };

        const onMouseUp = (e) => {
            // 计算最终位置
            const finalPercent = this._getEventPercent(e);

            // 获取总时长
            const duration = this.player.videoElement.duration;
            if (!isNaN(duration) && isFinite(duration)) {
                // 跳转到新位置
                this.player.seek(duration * finalPercent);
            }

            // 移除事件监听
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        // 添加全局事件监听
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标事件
     * @private
     */
    _onMouseMove(event) {
        // 如果不是点播模式，不显示时间提示
        if (!this.isVod) return;

        // 计算百分比
        const percent = this._getEventPercent(event);

        // 显示时间提示
        this._showTimeTooltip(event, percent);
    }

    /**
     * 显示时间提示
     * @param {MouseEvent} event - 鼠标事件
     * @param {number} percent - 百分比
     * @private
     */
    _showTimeTooltip(event, percent) {
        // 获取总时长
        const duration = this.player.videoElement.duration;
        if (isNaN(duration) || !isFinite(duration)) return;

        // 计算时间
        const time = duration * percent;

        // 格式化时间
        const formattedTime = this._formatTime(time);

        // 设置提示内容
        this.timeTooltip.textContent = formattedTime;

        // 计算提示位置
        const rect = this.progressContainer.getBoundingClientRect();
        const tooltipWidth = this.timeTooltip.offsetWidth;
        const left = event.clientX - rect.left;

        // 确保提示不超出边界
        let tooltipLeft = left - tooltipWidth / 2;
        tooltipLeft = Math.max(0, Math.min(tooltipLeft, rect.width - tooltipWidth));

        // 设置提示位置
        this.timeTooltip.style.left = `${tooltipLeft}px`;
        this.timeTooltip.style.display = 'block';
    }

    /**
     * 处理时间更新事件
     * @param {Object} data - 事件数据
     * @private
     */
    _onTimeUpdate(data) {
        // 如果不是点播模式，不更新进度
        if (!this.isVod) return;

        // 获取当前时间和总时长
        const currentTime = this.player.videoElement.currentTime;
        const duration = this.player.videoElement.duration;

        // 计算进度百分比
        if (!isNaN(currentTime) && !isNaN(duration) && duration > 0) {
            const percent = currentTime / duration;
            this._updateProgress(percent);
        }
    }

    /**
     * 处理缓冲进度事件
     * @param {Object} data - 事件数据
     * @private
     */
    _onProgress(data) {
        // 如果不是点播模式，不更新缓冲
        if (!this.isVod) return;

        // 获取视频元素
        const video = this.player.videoElement;

        // 获取缓冲范围
        if (video.buffered && video.buffered.length > 0 && video.duration > 0) {
            // 使用最后一个缓冲范围的结束时间
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const percent = bufferedEnd / video.duration;
            this._updateBuffered(percent);
        }
    }

    /**
     * 更新播放进度
     * @param {number} percent - 进度百分比（0-1）
     * @private
     */
    _updateProgress(percent) {
        // 限制百分比范围
        percent = Math.max(0, Math.min(1, percent));

        // 设置进度条宽度
        this.progressBar.style.width = `${percent * 100}%`;
    }

    /**
     * 更新缓冲进度
     * @param {number} percent - 缓冲百分比（0-1）
     * @private
     */
    _updateBuffered(percent) {
        // 限制百分比范围
        percent = Math.max(0, Math.min(1, percent));

        // 设置缓冲条宽度
        this.bufferedBar.style.width = `${percent * 100}%`;
    }

    /**
     * 获取鼠标事件对应的百分比位置
     * @param {MouseEvent} event - 鼠标事件
     * @returns {number} 百分比（0-1）
     * @private
     */
    _getEventPercent(event) {
        const rect = this.progressContainer.getBoundingClientRect();
        const position = event.clientX - rect.left;
        return Math.max(0, Math.min(1, position / rect.width));
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
        if (this.progressContainer && this.progressContainer.parentNode) {
            this.progressContainer.parentNode.removeChild(this.progressContainer);
        }

        // 移除事件监听
        this.player.off(PLAYER_EVENTS.TIME_UPDATE, this._onTimeUpdate);
        this.player.off(PLAYER_EVENTS.PROGRESS, this._onProgress);
    }
}

export default ProgressBar;
