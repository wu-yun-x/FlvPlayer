/*
 * @Author: st004362
 * @Date: 2025-05-28 18:35:15
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 17:50:58
 * @Description: FlvPlayer库入口文件
 */

import FlvPlayer from './core/FlvPlayer';
import {
    PLAYER_STATES,
    PLAYER_EVENTS,
    ERROR_TYPES,
    MEDIA_TYPES,
    CONNECTION_TYPES,
    PLAY_MODES,
    ADAPTER_TYPES,
    DEFAULT_CONFIG,
    UI_COMPONENT_TYPES
} from './constants';

// 导出版本信息
export const version = '1.0.0';

// 检查浏览器是否支持
export const isSupported = FlvPlayer.isSupported;

// 导出播放器类
export { FlvPlayer };

// 导出常量
export {
    PLAYER_STATES,
    PLAYER_EVENTS,
    ERROR_TYPES,
    MEDIA_TYPES,
    CONNECTION_TYPES,
    PLAY_MODES,
    ADAPTER_TYPES,
    UI_COMPONENT_TYPES
};

// 导出默认配置
export { DEFAULT_CONFIG };

// 默认导出FlvPlayer类
export default FlvPlayer;
