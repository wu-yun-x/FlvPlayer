/*
 * @Author: st004362
 * @Date: 2025-05-28 15:33:08
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 17:30:25
 * @Description: 组合和管理所有UI组件
 */

import { UI_COMPONENT_TYPES, PLAY_MODES } from '../constants';
import ControlPanel from './ControlPanel';
import ProgressBar from './ProgressBar';
import ThumbnailBar from './ThumbnailBar';

/**
 * 播放器UI管理类
 */
class PlayerUI {
    /**
     * 创建UI管理实例
     * @param {Object} player - 播放器实例
     * @param {Object} options - UI配置选项
     */
    constructor(player, options = {}) {
        this.player = player;
        this.container = player.container;
        this.options = options;
        this.components = {};

        // 播放模式
        this.playMode = options.playMode || PLAY_MODES.LIVE;

        // 确保点播模式下UI组件配置包含进度条
        if (this.playMode === PLAY_MODES.VOD && options.components) {
            if (!options.components.includes(UI_COMPONENT_TYPES.PROGRESS)) {
                options.components.push(UI_COMPONENT_TYPES.PROGRESS);
            }
        }

        // 创建UI容器
        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'flv-player-ui';
        this.container.appendChild(this.uiContainer);

        // 初始化UI组件
        this._initComponents();

        // 添加模式标识
        this._createModeIndicator();
    }

    /**
     * 初始化UI组件
     * @private
     */
    _initComponents() {
        // 根据配置和播放模式初始化组件
        const components = this.options.components || [
            UI_COMPONENT_TYPES.PLAY_PAUSE,
            UI_COMPONENT_TYPES.PROGRESS,
            UI_COMPONENT_TYPES.TIME_DISPLAY,
            UI_COMPONENT_TYPES.VOLUME,
            UI_COMPONENT_TYPES.FULLSCREEN
        ];

        // 控制面板
        if (components.includes(UI_COMPONENT_TYPES.PLAY_PAUSE) ||
            components.includes(UI_COMPONENT_TYPES.VOLUME) ||
            components.includes(UI_COMPONENT_TYPES.FULLSCREEN)) {
            this.components.controlPanel = new ControlPanel(this.player, this.uiContainer);
        }

        // 进度条 - 在点播模式下始终显示，无论配置如何
        if (this.playMode === PLAY_MODES.VOD || this.options.alwaysShowProgress) {
            this.components.progressBar = new ProgressBar(this.player, this.uiContainer);
        }

        // 缩略图 - 仅在点播模式显示
        if (this.playMode === PLAY_MODES.VOD &&
            components.includes(UI_COMPONENT_TYPES.THUMBNAIL) &&
            this.options.thumbnails) {
            this.components.thumbnailBar = new ThumbnailBar(this.player, this.uiContainer, this.options.thumbnails);
        }
    }

    /**
     * 创建模式指示器
     * @private
     */
    _createModeIndicator() {
        const indicator = document.createElement('div');
        indicator.className = `flv-player-mode-indicator ${this.playMode}`;

        const text = this.playMode === PLAY_MODES.LIVE ? '直播' : '点播';
        indicator.textContent = text;

        // 在直播模式下添加延迟显示
        if (this.playMode === PLAY_MODES.LIVE) {
            const latencyDisplay = document.createElement('span');
            latencyDisplay.className = 'flv-player-latency';
            indicator.appendChild(latencyDisplay);

            // 更新延迟信息
            this.player.on('statsUpdate', (data) => {
                if (data.statisticsInfo && data.statisticsInfo.currentTime !== undefined) {
                    latencyDisplay.textContent = ` (延迟: ${data.statisticsInfo.currentTime.toFixed(1)}s)`;
                }
            });
        }

        this.uiContainer.appendChild(indicator);
        this.modeIndicator = indicator;
    }

    /**
     * 更新播放模式
     * @param {string} mode - 播放模式
     */
    updatePlayMode(mode) {
        if (mode === this.playMode) return;

        this.playMode = mode;

        // 移除旧的UI组件
        Object.values(this.components).forEach(component => {
            if (component.destroy) component.destroy();
        });
        this.components = {};

        // 更新模式指示器
        if (this.modeIndicator) {
            this.modeIndicator.className = `flv-player-mode-indicator ${mode}`;
            this.modeIndicator.textContent = mode === PLAY_MODES.LIVE ? '直播' : '点播';
        }

        // 重新初始化组件
        this._initComponents();
    }

    /**
     * 销毁UI
     */
    destroy() {
        // 销毁所有组件
        Object.values(this.components).forEach(component => {
            if (component.destroy) component.destroy();
        });

        // 移除UI容器
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
    }
}

export default PlayerUI;
