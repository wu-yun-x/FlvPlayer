// 导入FlvPlayer
import { Player, PlayerUI, PLAYER_STATES, PLAY_MODES, UI_COMPONENT_TYPES, PLAYER_EVENTS } from '../src/index.js';

let player = null;
let ui = null;
let currentMode = 'live';
const liveUrlInput = document.getElementById('live-url');
const vodUrlInput = document.getElementById('vod-url');
const loadBtn = document.getElementById('loadBtn');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const destroyBtn = document.getElementById('destroyBtn');
const volumeSlider = document.getElementById('volume');
const statsInfoEl = document.getElementById('statsInfo');
const eventLogEl = document.getElementById('eventLog');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const latencyDisplay = document.getElementById('latencyDisplay');
// 模式切换相关元素
const modeTabs = document.querySelectorAll('.mode-tab');
const modeContents = document.querySelectorAll('.mode-content');

// 视频源选择
const videoSources = document.querySelectorAll('.video-source');

// 高级选项
const lowLatencyCheckbox = document.getElementById('lowLatency');
const autoReconnectCheckbox = document.getElementById('autoReconnect');
const debugCheckbox = document.getElementById('debug');
const maxRetriesInput = document.getElementById('maxRetries');
const retryIntervalInput = document.getElementById('retryInterval');
const maxRetryIntervalInput = document.getElementById('maxRetryInterval');
const autoplayCheckbox = document.getElementById('autoplay');
const bufferSizeInput = document.getElementById('bufferSize');
const seekToLiveCheckbox = document.getElementById('seekToLive');
const networkQualitybox = document.getElementById('network-quality');
// 初始化硬件加速UI和事件处理
const hwAccelToggle = document.getElementById('hw-accel-toggle');
const swRenderToggle = document.getElementById('sw-render-toggle');
const hwAccelInfoEl = document.getElementById('hwAccelInfo');

// 添加硬件加速设置变更事件
hwAccelToggle.addEventListener('change', (e) => {
    if (player) {
        player.setHardwareAcceleration({
            enabled: e.target.checked,
            allowSoftwareRendering: swRenderToggle.checked
        });
    }
});

swRenderToggle.addEventListener('change', (e) => {
    if (player && hwAccelToggle.checked) {
        if (e.target.checked) {
            logEvent('信息', '已允许使用软件渲染(SwiftShader)。这可能会导致控制台显示警告，但对播放器功能没有影响。');
        }

        player.setHardwareAcceleration({
            enabled: true,
            allowSoftwareRendering: e.target.checked
        });
    }
});

// 更新状态显示
function updateStatus(state) {
    switch (state) {
        case PLAYER_STATES.READY:
        case PLAYER_STATES.PLAYING:
            statusIndicator.className = 'status-indicator status-connected';
            statusText.textContent = '已连接';
            break;
        case PLAYER_STATES.LOADING:
            statusIndicator.className = 'status-indicator status-connecting';
            statusText.textContent = '连接中...';
            break;
        case PLAYER_STATES.ERROR:
            statusIndicator.className = 'status-indicator status-disconnected';
            statusText.textContent = '连接错误';
            break;
        default:
            statusIndicator.className = 'status-indicator status-disconnected';
            statusText.textContent = '未连接';
    }
}

// 添加事件日志
function logEvent(event, data) {
    const time = new Date().toLocaleTimeString();
    const logItem = `[${time}] ${event}: ${data ? JSON.stringify(data, null, 2) : ''}`;
    eventLogEl.textContent = logItem + '\n' + eventLogEl.textContent;
}

// 更新硬件加速UI
function updateHWAccelUI() {
    if (!player) return;

    const hwInfo = player.getHardwareAccelerationInfo();
    if (hwInfo) {
        hwAccelToggle.checked = hwInfo.enabled;
        swRenderToggle.checked = hwInfo.isSoftwareRendering;

        // 显示硬件加速信息，格式化以便于阅读
        const infoToShow = {
            "支持状态": hwInfo.supported ? "支持" : "不支持",
            "当前状态": hwInfo.enabled ? "已启用" : "已禁用",
            "渲染方式": hwInfo.isSoftwareRendering ? "软件渲染 (SwiftShader)" : "硬件渲染",
            "性能级别": hwInfo.performance,
            "渲染器": hwInfo.type
        };

        hwAccelInfoEl.textContent = JSON.stringify(infoToShow, null, 2);

        // 如果是软件渲染，显示明确的警告并提供建议
        if (hwInfo.isSoftwareRendering && hwInfo.enabled) {
            // 添加视觉警告样式
            hwAccelInfoEl.classList.add('software-rendering-warning');

            // 记录警告日志
            logEvent('注意', '当前使用软件渲染(SwiftShader)。这可能影响性能，但对于不支持硬件加速的系统是正常的。');

            // 如果性能不佳，建议禁用
            if (player && player.video && player.video.videoWidth > 720) {
                logEvent('建议', '对于高分辨率视频，如果遇到卡顿，可以尝试禁用硬件加速');
            }
        } else {
            hwAccelInfoEl.classList.remove('software-rendering-warning');
        }
    } else {
        hwAccelInfoEl.textContent = '未获取到硬件加速信息';
    }
}


let bitrateChart = null;
const bitrateLabels = Array(20).fill('');
const bitrateData = Array(20).fill(0);

function initBitrateChart() {
    const ctx = document.getElementById('bitrateChart').getContext('2d');
    bitrateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: bitrateLabels,
            datasets: [{
                label: '网络速率 (kbps)',
                data: bitrateData,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            animation: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 调用初始化
initBitrateChart();

// 初始化播放器
function initPlayer() {
    if (ui) {
        ui.destroy();
        ui = null;
    }
    if (player) {
        player.destroy();
    }

    const url = currentMode === 'live' ? liveUrlInput.value : vodUrlInput.value;
    const isLive = currentMode === 'live';
    const lowLatency = isLive && lowLatencyCheckbox.checked;
    const autoReconnect = isLive && autoReconnectCheckbox.checked;
    const liveBufferLatencyChasing = isLive && seekToLiveCheckbox.checked
    const debug = debugCheckbox.checked;
    const maxRetries = parseInt(maxRetriesInput.value);
    const retryInterval = parseInt(retryIntervalInput.value);
    const maxRetryInterval = parseInt(maxRetryIntervalInput.value);
    const autoplay = !isLive && autoplayCheckbox.checked;
    const bufferSize = !isLive ? parseFloat(bufferSizeInput.value) : 1;
    const enableHardwareAcceleration = hwAccelToggle.checked;
    const allowSoftwareRendering = swRenderToggle.checked;

    updateStatus(PLAYER_STATES.LOADING);
    player = new Player({
        mediaDataSource: {
            type: 'flv',
            url: url,
            isLive: isLive,
            withCredentials: false
        },
        container: '#player-container',
        controls: true,
        playMode: isLive ? PLAY_MODES.LIVE : PLAY_MODES.VOD,
        // 自动追帧 
        autoplay: autoplay,
        debug: debug,
        lowLatency: lowLatency,
        autoReconnect: autoReconnect,
        maxErrorRetries: maxRetries,
        retryInterval: retryInterval,
        maxRetryInterval: maxRetryInterval,
        // 缓冲区大小
        bufferSize: bufferSize,
        // 连接超时时间
        connectionTimeout: 3000,
        // 首个媒体数据包接收超时时间
        dataTimeout: 3000,
        // 硬件加速配置
        enableHardwareAcceleration: enableHardwareAcceleration,
        allowSoftwareRendering: allowSoftwareRendering,
        // UI配置
        ui: {
            enabled: true,
            components: [
                UI_COMPONENT_TYPES.PLAY_PAUSE,
                UI_COMPONENT_TYPES.PROGRESS,
                UI_COMPONENT_TYPES.TIME_DISPLAY,
                UI_COMPONENT_TYPES.VOLUME,
                UI_COMPONENT_TYPES.FULLSCREEN
            ],
            alwaysShowProgress: !isLive, // 点播模式下始终显示进度条
        },
        // 根据模式设置不同的配置
        mpegtsConfig: isLive ? {
            // 直播模式 - 低延迟优先
            enableStashBuffer: false,
            // 初始缓冲区大小
            stashInitialSize: 128,
            // 启用自动清理源缓冲区
            autoCleanupSourceBuffer: true,
            // 设置较小的向后缓冲时长
            autoCleanupMaxBackwardDuration: 3 * 60,
            // 设置较小的预加载时长
            autoCleanupMinBackwardDuration: 3 * 60,
            // 最大预加载时长
            lazyLoadMaxDuration: 3 * 60,
            // 启用实时延迟追赶
            forceKeyFrameOnDiscontinuity: true,
            // 最大可接受的缓冲延迟(秒)
            liveBufferLatencyMaxLatency: 1.5,
            // 最小需保持的缓冲延迟(秒)
            liveBufferLatencyMinRemain: 0.5,
            // 自动追帧
            liveBufferLatencyChasing: liveBufferLatencyChasing,
            // 启用seek
            seekType: 'range',
            // 启用worker
            enableWorker: enableHardwareAcceleration,
        } : {
            // 点播模式 - 流畅播放优先
            // 启用缓冲区
            enableStashBuffer: true,
            // 初始缓冲区大小
            stashInitialSize: 128,
            // 启用自动清理源缓冲区
            autoCleanupSourceBuffer: false,
            // 设置较小的向后缓冲时长
            autoCleanupMaxBackwardDuration: 30,
            // 设置较小的预加载时长
            autoCleanupMinBackwardDuration: 10,
            // 最大预加载时长
            lazyLoadMaxDuration: 3 * 60,
            // 预加载恢复时长
            lazyLoadRecoverDuration: 30,
            // 启用worker
            enableWorker: enableHardwareAcceleration
        }
    });

    // 仅点播模式下挂载UI
    if (currentMode === 'vod') {
        ui = new PlayerUI(player);
    }
    // 注册事件
    player.on('play', () => {
        logEvent('开始播放');
        updateStatus(PLAYER_STATES.PLAYING);
    });

    player.on('pause', () => {
        logEvent('暂停播放');
        updateStatus(PLAYER_STATES.PAUSED);
    });

    player.on('ended', () => {
        logEvent('播放结束');
        updateStatus(PLAYER_STATES.ENDED);
    });

    player.on('error', (error) => {
        logEvent('错误', error);
        updateStatus(PLAYER_STATES.ERROR);
    });

    player.on('stats_update', (data) => {
        updateStatsInfo();

        // 更新延迟显示 - 仅直播模式
        if (isLive && data.statisticsInfo) {
            const stats = data.statisticsInfo;
            if (stats.currentTime !== undefined && stats.videoBuffered !== undefined) {
                latencyDisplay.textContent = `当前延迟: ${stats.currentTime.toFixed(2)}s, 缓冲: ${stats.videoBuffered.toFixed(2)}s`;
            }
        } else {
            latencyDisplay.textContent = '';
        }
    });

    player.on('state_change', (data) => {
        logEvent('状态变化', data);
        updateStatus(data.state);
    });

    // UI更新事件
    player.on('ui_update', (data) => {
        console.log('ui_update', data)
        if (data.type === 'networkQuality') {
            let bitrateInfo = '';

            console.log('data.data', data.data)

            // 如果有实时比特率，优先显示
            if (data.data.realTimeBitrate && data.data.realTimeBitrate > 0) {
                bitrateInfo = `实时: ${Math.round(data.data.realTimeBitrate / 1000)}kbps`;
                if (data.data.staticBitrate > 0) {
                    bitrateInfo += ` (静态: ${Math.round(data.data.staticBitrate / 1000)}kbps)`;
                }
            } else if (data.data.bitrate) {
                bitrateInfo = data.data.bitrate;
            }

            networkQualitybox.textContent = `网络质量: ${data.data.quality}, 比特率: ${bitrateInfo}, 缓冲健康度: ${data.data.bufferHealth}`;

            // 根据网络质量设置不同的样式
            networkQualitybox.className = `network-quality ${data.data.quality}`;
        }
    });

    // 在 network_quality_change 事件中更新图表
    player.on(PLAYER_EVENTS.NETWORK_QUALITY_CHANGE, (data) => {
        // 现有代码...

        // 更新图表数据
        const bitrate = data.realTimeBitrate > 0 ? data.realTimeBitrate : data.bitrate;
        bitrateLabels.push(new Date().toLocaleTimeString());
        bitrateLabels.shift();
        bitrateData.push(Math.round(bitrate / 1000));
        bitrateData.shift();
        bitrateChart.update();
    });

    // 监听硬件加速事件
    player.on(PLAYER_EVENTS.HW_ACCEL_INFO, (info) => {
        logEvent('硬件加速信息', info);
        updateHWAccelUI();
    });

    player.on(PLAYER_EVENTS.HW_ACCEL_CHANGED, (info) => {
        logEvent('硬件加速设置已变更', info);
        updateHWAccelUI();
    });

    // 更新统计信息
    function updateStatsInfo() {
        const statsInfo = player.getStatisticsInfo();
        statsInfoEl.textContent = statsInfo ? JSON.stringify(statsInfo, null, 2) : '未获取到统计信息';
    }

    // 设置音量
    player.setVolume(volumeSlider.value / 100);

    logEvent('播放器创建成功', { url, isLive, mode: currentMode });

    // 初始化后更新硬件加速UI
    setTimeout(() => {
        updateHWAccelUI();
    }, 100);
}

// 加载按钮
loadBtn.addEventListener('click', () => {
    initPlayer();
    const url = currentMode === 'live' ? liveUrlInput.value : vodUrlInput.value;
    player.load(url);
});

// 播放按钮
playBtn.addEventListener('click', () => {
    if (player) {
        player.play();
    }
});

// 暂停按钮
pauseBtn.addEventListener('click', () => {
    if (player) {
        player.pause();
    }
});

// 销毁按钮
destroyBtn.addEventListener('click', () => {
    if (player) {
        player.destroy();
        player = null;
        statsInfoEl.textContent = '未加载';
        latencyDisplay.textContent = '';
        hwAccelInfoEl.textContent = '未加载';
        updateStatus(null);
        logEvent('播放器已销毁');
    }
});

// 音量滑块
volumeSlider.addEventListener('input', () => {
    if (player) {
        const volume = volumeSlider.value / 100;
        player.setVolume(volume);
        logEvent('音量变化', { volume });
    }
});

// 模式切换
modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // 更新标签状态
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 更新内容显示
        const mode = tab.dataset.mode;
        currentMode = mode;
        modeContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${mode}-content`) {
                content.classList.add('active');
            }
        });

        // 如果有播放器实例，销毁它
        if (player) {
            player.destroy();
            player = null;
            statsInfoEl.textContent = '未加载';
            latencyDisplay.textContent = '';
            hwAccelInfoEl.textContent = '未加载';
            updateStatus(null);
            logEvent('切换模式', { mode });
        }
    });
});

// 视频源选择
videoSources.forEach(source => {
    source.addEventListener('click', () => {
        // 更新选中状态
        videoSources.forEach(s => s.classList.remove('active'));
        source.classList.add('active');

        // 更新URL输入框
        vodUrlInput.value = source.dataset.url;

        // 如果在点播模式下，重新加载播放器
        if (currentMode === 'vod' && player) {
            initPlayer();
            player.load(vodUrlInput.value);

            // 调试日志
            if (debugCheckbox.checked) {
                console.log('[DEBUG] 加载点播视频:', vodUrlInput.value);
                console.log('[DEBUG] 播放器配置:', player.options);
            }
        }
    });
});