/**
 * 播放器管理Hook
 * 提供播放器的初始化、销毁和视频元素清理功能
 */
import { ref, reactive } from 'vue';
import Player from "flv-player";
import { ADAPTER_TYPES, PLAYER_EVENTS } from "flv-player";

export function usePlayerManager() {
    // 播放器相关状态
    const players = reactive([]);
    const playerStates = reactive([]);
    const playerReady = ref(false);
    const loading = ref(false);
    const statusMessage = ref("就绪");

    /**
     * 清理容器内的视频元素
     * @param {HTMLElement} container - 要清理的容器元素
     */
    const cleanupContainer = (container) => {
        if (!container) return;

        // 查找所有视频元素
        const videos = container.querySelectorAll('video');

        if (videos.length > 0) {
            console.log(`清理容器: 发现 ${videos.length} 个视频元素`);
        }

        // 逐个清理视频元素
        videos.forEach(video => {
            try {
                // 停止播放
                video.pause();

                // 移除事件监听器的安全方法是创建一个克隆
                const clonedVideo = video.cloneNode(false);

                // 移除源
                video.removeAttribute('src');
                video.load();

                // 从DOM中移除
                if (video.parentNode) {
                    video.parentNode.removeChild(video);
                }
            } catch (e) {
                console.warn('清理视频元素失败:', e);
            }
        });
    };

    /**
     * 初始化单个播放器
     * @param {number} index - 播放器索引
     * @param {HTMLElement} container - 播放器容器
     * @param {string} streamUrl - 流地址
     * @param {Object} settings - 播放器设置
     * @param {boolean} isLive - 是否为直播
     * @returns {Object|null} 播放器实例或null
     */
    const initSinglePlayer = async (index, container, streamUrl, settings, isLive = true) => {
        if (!container) {
            console.error(`播放器 ${index + 1} 容器不存在`);
            return null;
        }

        // 清理容器内现有的视频元素
        cleanupContainer(container);

        // 设置初始状态
        if (playerStates[index] !== undefined) {
            playerStates[index] = "initializing";
        }

        console.log(`初始化屏幕 ${index + 1} 的播放器，使用流: ${streamUrl}`);

        try {
            // 创建播放器配置
            const playerConfig = {
                container,
                controls: false,
                muted: true,
                adapter: ADAPTER_TYPES.MPEGTS,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                // 根据设置配置超时和重试
                connectionTimeout: 10000,
                maxErrorRetries: settings.maxRetryCount,
                autoReconnect: settings.autoReconnect,
                // 根据是否为主屏启用硬件加速
                enableHardwareAcceleration: index === 0 && settings.hardwareAcceleration,
                softwareAcceleration: settings.softwareFallback,
                mediaDataSource: {
                    type: streamUrl.toLowerCase().endsWith('.mp4') ? "mp4" : "flv",
                    url: streamUrl,
                    isLive,
                },
                // UI配置 - 禁用内置UI
                ui: {
                    enabled: false
                },
                // mpegts配置优化
                mpegtsConfig: {
                    // 为多分屏场景优化资源使用
                    enableWorker: index === 0,
                    // 减少缓冲区大小
                    stashInitialSize: 128,
                    // 启用自动清理源缓冲区
                    autoCleanupSourceBuffer: true,
                    // 低延迟设置
                    liveBufferLatencyChasing: settings.lowLatencyMode,
                    liveBufferLatencyMaxLatency: settings.lowLatencyMode ? 1.0 : 2.0,
                    liveBufferLatencyMinRemain: settings.lowLatencyMode ? 0.1 : 0.5,
                    // 调试模式
                    debug: settings.debugMode,
                },
            };

            // 创建播放器实例
            const player = new Player(playerConfig);

            // 监听播放器事件
            setupPlayerEvents(player, index);

            return player;
        } catch (error) {
            console.error(`初始化播放器 ${index + 1} 失败:`, error);
            if (playerStates[index] !== undefined) {
                playerStates[index] = "error";
            }
            return null;
        }
    };

    /**
     * 设置播放器事件监听
     * @param {Object} player - 播放器实例
     * @param {number} index - 播放器索引
     */
    const setupPlayerEvents = (player, index) => {
        player.on(PLAYER_EVENTS.READY, () => {
            console.log(`播放器 ${index + 1} 已就绪`);
            playerStates[index] = "ready";
            playerReady.value = true;

            // 确保视频元素适应容器
            const videoElement = player.videoElement;
            if (videoElement) {
                videoElement.style.width = "100%";
                videoElement.style.height = "100%";
                videoElement.style.objectFit = "contain";
                videoElement.style.maxWidth = "100%";
                videoElement.style.maxHeight = "100%";
            }
        });

        player.on(PLAYER_EVENTS.ERROR, (error) => {
            console.error(`播放器 ${index + 1} 发生错误:`, error);
            playerStates[index] = "error";
        });

        player.on(PLAYER_EVENTS.STATE_CHANGE, (state) => {
            playerStates[index] = state;
            console.log(`播放器 ${index + 1} 状态变更: ${state}`);
        });
    };

    /**
     * 销毁播放器
     * @param {Object} player - 播放器实例
     * @param {HTMLElement} container - 播放器容器
     */
    const destroyPlayer = (player, container) => {
        if (!player) return;

        try {
            // 销毁播放器实例
            if (typeof player.destroy === 'function') {
                player.destroy();
            }

            // 清理容器
            if (container) {
                cleanupContainer(container);
            }
        } catch (error) {
            console.error(`销毁播放器失败:`, error);
        }
    };

    /**
     * 销毁所有播放器
     * @param {Array} playersList - 播放器实例列表
     * @param {Array} containers - 播放器容器列表
     */
    const destroyAllPlayers = (playersList, containers) => {
        if (!playersList || playersList.length === 0) return;

        playersList.forEach((player, index) => {
            if (player) {
                console.log(`销毁播放器 ${index + 1}`);
                destroyPlayer(player, containers[index]);
            }
        });

        // 清空播放器数组
        playersList.length = 0;
        playerStates.length = 0;
        playerReady.value = false;
    };

    /**
     * 播放视频流
     * @param {Object} player - 播放器实例
     * @returns {Promise} 播放操作的Promise
     */
    const playStream = (player) => {
        if (!player) return Promise.reject(new Error('播放器不存在'));

        try {
            // 确保不直接调用Promise方法
            const playPromise = player.play();

            // 只有当返回值是Promise时才对其进行处理
            if (playPromise && typeof playPromise.then === 'function') {
                return playPromise;
            } else {
                return Promise.resolve();
            }
        } catch (error) {
            return Promise.reject(error);
        }
    };

    return {
        players,
        playerStates,
        playerReady,
        loading,
        statusMessage,
        cleanupContainer,
        initSinglePlayer,
        setupPlayerEvents,
        destroyPlayer,
        destroyAllPlayers,
        playStream
    };
} 