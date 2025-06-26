/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-11 11:49:50
 * @Description: 适配器工厂，按类型创建对应的协议适配器实例
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
     * @param {Object} options - 播放器配置
     * @returns {Object} 适配器实例
     */
    create(type, video, options) {
        switch (type) {
            case ADAPTER_TYPES.MPEGTS:
            default:
                return new MpegtsAdapter(video, options);
        }
    }
};

export default AdapterFactory;