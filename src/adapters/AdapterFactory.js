/*
 * AdapterFactory.js
 * 适配器工厂，按类型创建对应的协议适配器实例
 *
 * @author: st004362
 * @date: 2025-05-31
 */
import MpegtsAdapter from './MpegtsAdapter';
import { ADAPTER_TYPES } from '../constants';

/**
 * AdapterFactory 适配器工厂
 * - 目前仅支持 mpegts
 */
const AdapterFactory = {
    /**
     * 创建适配器实例
     * @param {string} type - 适配器类型
     * @param {HTMLVideoElement} video - video元素
     * @param {Object} config - 播放器配置
     * @returns {Object} 适配器实例
     */
    create(type, video, config) {
        switch (type) {
            case ADAPTER_TYPES.MPEGTS:
            default:
                return new MpegtsAdapter(video, config);
        }
    }
};

export default AdapterFactory;