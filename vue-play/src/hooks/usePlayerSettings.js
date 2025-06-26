/**
 * 播放器高级设置管理Hook
 * 负责播放器设置的加载、保存和重置
 */
import { reactive } from 'vue';

const DEFAULT_SETTINGS = {
    lowLatencyMode: true, // 低延迟模式
    autoChasing: false, // 追帧模式
    autoReconnect: true, // 自动重连
    debugMode: false, // 调试模式
    maxRetryCount: 3, // 最大重试次数
    retryInterval: 2000, // 重试间隔(ms)
    maxRetryInterval: 5000, // 最大重试间隔(ms)
    hardwareAcceleration: true, // 启用硬件加速
    softwareFallback: true, // 允许软件渲染替代
};

export function usePlayerSettings(storageKey = 'multiScreenSettings') {
    // 创建响应式设置对象
    const settings = reactive({ ...DEFAULT_SETTINGS });

    /**
     * 加载已保存的设置
     */
    const loadSettings = () => {
        try {
            const savedSettings = localStorage.getItem(storageKey);
            if (savedSettings) {
                Object.assign(settings, JSON.parse(savedSettings));
            }
        } catch (error) {
            console.warn(`无法从本地存储加载设置 (${storageKey}):`, error);
        }
        return settings;
    };

    /**
     * 保存设置到本地存储
     */
    const saveSettings = () => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.warn(`无法保存设置到本地存储 (${storageKey}):`, error);
            return false;
        }
    };

    /**
     * 重置设置到默认值
     */
    const resetSettings = () => {
        Object.assign(settings, DEFAULT_SETTINGS);
        return settings;
    };

    /**
     * 应用设置到播放器
     * @param {Array} players - 播放器实例数组
     * @returns {string} 操作结果描述
     */
    const applySettingsToPlayers = (players) => {
        if (!players || players.length === 0) {
            return "没有可用的播放器，无法应用设置";
        }

        let successCount = 0;

        // 对每个播放器应用设置
        players.forEach((player, index) => {
            if (!player) return;

            try {
                // 应用低延迟模式
                if (settings.lowLatencyMode) {
                    player.setConfig({
                        liveBufferLatencyChasing: true,
                        liveBufferLatencyMaxLatency: 1.0,
                        liveBufferLatencyMinRemain: 0.1,
                    });
                } else {
                    player.setConfig({
                        liveBufferLatencyChasing: false,
                        liveBufferLatencyMaxLatency: 2.0,
                        liveBufferLatencyMinRemain: 0.5,
                    });
                }

                // 应用追帧设置
                if (settings.autoChasing && player.mpegts) {
                    player.mpegts.config.liveBufferLatencyChasing = true;
                }

                // 应用自动重连设置
                player.setAutoReconnect(
                    settings.autoReconnect,
                    settings.maxRetryCount,
                    settings.retryInterval
                );

                // 应用调试模式
                player.setDebug(settings.debugMode);

                // 硬件加速设置 - 主要应用于第一个播放器
                if (index === 0) {
                    player.setHardwareAcceleration(
                        settings.hardwareAcceleration,
                        settings.softwareFallback
                    );
                }

                successCount++;
            } catch (error) {
                console.error(`应用设置到播放器 ${index + 1} 失败:`, error);
            }
        });

        // 保存设置到本地存储
        saveSettings();

        return `设置已应用到 ${successCount}/${players.length} 个播放器`;
    };

    // 初始加载设置
    loadSettings();

    return {
        settings,
        loadSettings,
        saveSettings,
        resetSettings,
        applySettingsToPlayers,
    };
} 