/*
 * @Author: st004362
 * @Date: 2025-06-13 11:25:08
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-16 13:57:00
 * @Description: 硬件加速模块，负责检测和配置硬件加速
 */
import eventBus from '../../events/EventBus';
import { PLAYER_EVENTS } from '../../constants';
import { detectAndEnableHardwareAcceleration } from '../../utils/HardwareAcceleration';
class HardwareAccelerator {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {Object} options.config - mpegts.js配置
     * @param {boolean} options.enabled - 是否启用硬件加速
     */
    constructor(options) {
        this.config = options.config;
        this._hwAccelEnabled = options.enabled !== false;
        this._hwAccelInfo = null;

        // 初始化
        this._detectHardwareAcceleration();
    }

    /**
     * 检测并配置硬件加速
     * @private
     */
    _detectHardwareAcceleration() {
        // 执行硬件加速检测
        this._hwAccelInfo = detectAndEnableHardwareAcceleration({
            forceHardwareAcceleration: this._hwAccelEnabled,
            allowSoftwareRendering: false // 默认不允许软件渲染
        });

        // 更新配置
        if (this.config) {
            // 根据检测结果修改配置
            this.config.enableWorker = this._hwAccelInfo.enabled;

            // 根据硬件性能调整配置
            if (this._hwAccelInfo.performance === 'high') {
                // 高性能硬件
                this.config.lazyLoadMaxDuration = 60;
            } else if (this._hwAccelInfo.performance === 'medium') {
                // 中等性能
                this.config.lazyLoadMaxDuration = 30;
            } else if (this._hwAccelInfo.performance === 'software') {
                // 软件渲染
                this.config.lazyLoadMaxDuration = 20;
                this.config.autoCleanupMaxBackwardDuration = 30;
            }
        }

        // 发送硬件加速信息事件
        eventBus.emit(PLAYER_EVENTS.HW_ACCEL_INFO, this._hwAccelInfo);

        return this._hwAccelInfo;
    }

    /**
     * 设置硬件加速状态
     * @param {Object} options - 配置选项
     * @param {boolean} options.enabled - 是否启用硬件加速
     * @param {boolean} options.allowSoftwareRendering - 是否允许软件渲染
     * @returns {Object} 硬件加速信息
     */
    setHardwareAcceleration(options = {}) {
        const { enabled = true, allowSoftwareRendering = false } = options;

        this._hwAccelEnabled = enabled;

        // 重新检测硬件加速
        this._hwAccelInfo = detectAndEnableHardwareAcceleration({
            forceHardwareAcceleration: this._hwAccelEnabled,
            allowSoftwareRendering: allowSoftwareRendering
        });

        // 更新配置
        if (this.config) {
            this.config.enableWorker = this._hwAccelInfo.enabled;

            // 根据硬件性能调整配置
            if (this._hwAccelInfo.performance === 'high') {
                // 高性能硬件
                this.config.lazyLoadMaxDuration = 60;
            } else if (this._hwAccelInfo.performance === 'software') {
                // 软件渲染
                this.config.lazyLoadMaxDuration = 20;
                this.config.autoCleanupMaxBackwardDuration = 30;
            }
        }

        // 发送硬件加速变更事件
        eventBus.emit(PLAYER_EVENTS.HW_ACCEL_CHANGED, {
            ...this._hwAccelInfo,
            allowSoftwareRendering
        });

        return this._hwAccelInfo;
    }

    /**
     * 获取硬件加速信息
     * @returns {Object} 硬件加速信息
     */
    getHardwareAccelerationInfo() {
        return this._hwAccelInfo;
    }
}

export default HardwareAccelerator;