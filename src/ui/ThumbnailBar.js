/*
 * @Author: st004362
 * @Date: 2025-05-28 15:33:08
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-28 15:33:13
 * @Description: 缩略图预览组件
 */

import { PLAYER_EVENTS } from '../constants';

/**
 * 缩略图预览组件
 */
class ThumbnailBar {
    /**
     * 创建缩略图预览组件
     * @param {Object} player - 播放器实例
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 缩略图配置
     */
    constructor(player, container, options = {}) {
        this.player = player;
        this.container = container;
        this.options = options;

        // 缩略图配置
        this.thumbnailUrl = options.url || '';
        this.thumbnailWidth = options.width || 160;
        this.thumbnailHeight = options.height || 90;
        this.thumbnailCount = options.count || 100;
        this.thumbnailColumns = options.columns || 10;

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
        // 缩略图容器
        this.thumbnailContainer = document.createElement('div');
        this.thumbnailContainer.className = 'flv-player-thumbnail-container';

        // 缩略图
        this.thumbnail = document.createElement('div');
        this.thumbnail.className = 'flv-player-thumbnail';
        this.thumbnail.style.display = 'none';
        this.thumbnail.style.width = `${this.thumbnailWidth}px`;
        this.thumbnail.style.height = `${this.thumbnailHeight}px`;

        // 如果有缩略图URL，设置背景
        if (this.thumbnailUrl) {
            this.thumbnail.style.backgroundImage = `url(${this.thumbnailUrl})`;
        }

        // 添加到容器
        this.thumbnailContainer.appendChild(this.thumbnail);
        this.container.appendChild(this.thumbnailContainer);
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 获取进度条元素
        const progressContainer = this.container.querySelector('.flv-player-progress-container');
        if (!progressContainer) return;

        // 鼠标移动事件
        progressContainer.addEventListener('mousemove', this._onMouseMove.bind(this));

        // 鼠标离开事件
        progressContainer.addEventListener('mouseleave', () => {
            this.thumbnail.style.display = 'none';
        });
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标事件
     * @private
     */
    _onMouseMove(event) {
        // 如果没有缩略图URL，不显示
        if (!this.thumbnailUrl) return;

        // 获取进度条位置
        const progressRect = event.currentTarget.getBoundingClientRect();
        const position = event.clientX - progressRect.left;
        const percent = Math.max(0, Math.min(1, position / progressRect.width));

        // 获取视频时长
        const duration = this.player.videoElement.duration;
        if (isNaN(duration) || !isFinite(duration)) return;

        // 计算对应的时间点
        const time = duration * percent;

        // 显示缩略图
        this._showThumbnailAtTime(time, event);
    }

    /**
     * 在指定时间点显示缩略图
     * @param {number} time - 时间点（秒）
     * @param {MouseEvent} event - 鼠标事件
     * @private
     */
    _showThumbnailAtTime(time, event) {
        // 计算缩略图索引
        const duration = this.player.videoElement.duration;
        const index = Math.floor((time / duration) * this.thumbnailCount);

        // 计算缩略图位置
        const row = Math.floor(index / this.thumbnailColumns);
        const col = index % this.thumbnailColumns;

        // 设置缩略图背景位置
        this.thumbnail.style.backgroundPosition = `-${col * this.thumbnailWidth}px -${row * this.thumbnailHeight}px`;

        // 计算缩略图显示位置
        const progressRect = event.currentTarget.getBoundingClientRect();
        const left = event.clientX - progressRect.left;

        // 确保缩略图不超出边界
        let thumbnailLeft = left - this.thumbnailWidth / 2;
        thumbnailLeft = Math.max(0, Math.min(thumbnailLeft, progressRect.width - this.thumbnailWidth));

        // 设置缩略图位置
        this.thumbnail.style.left = `${thumbnailLeft}px`;
        this.thumbnail.style.bottom = '30px'; // 在进度条上方显示
        this.thumbnail.style.display = 'block';

        // 显示时间
        this._showTime(time);
    }

    /**
     * 显示时间
     * @param {number} time - 时间（秒）
     * @private
     */
    _showTime(time) {
        // 格式化时间
        const formattedTime = this._formatTime(time);

        // 如果没有时间显示元素，创建一个
        if (!this.timeDisplay) {
            this.timeDisplay = document.createElement('div');
            this.timeDisplay.className = 'flv-player-thumbnail-time';
            this.thumbnail.appendChild(this.timeDisplay);
        }

        // 设置时间文本
        this.timeDisplay.textContent = formattedTime;
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
        if (this.thumbnailContainer && this.thumbnailContainer.parentNode) {
            this.thumbnailContainer.parentNode.removeChild(this.thumbnailContainer);
        }
    }
}

export default ThumbnailBar;
