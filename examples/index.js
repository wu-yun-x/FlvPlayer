// 导入FlvPlayer
import { Player, PlayerUI, PLAYER_STATES, PLAY_MODES, UI_COMPONENT_TYPES } from '../src/index.js';

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
const showThumbnailsCheckbox = document.getElementById('showThumbnails');
const bufferSizeInput = document.getElementById('bufferSize');
const seekToLiveCheckbox = document.getElementById('seekToLive');



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
    const showThumbnails = !isLive && showThumbnailsCheckbox.checked;
    const bufferSize = !isLive ? parseFloat(bufferSizeInput.value) : 1;



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
            thumbnails: showThumbnails ? {
                url: 'https://example.com/thumbnails.jpg', // 缩略图URL，实际项目中需替换
                width: 160,
                height: 90,
                count: 100,
                columns: 10
            } : null
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
            enableWorker: true,
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
            lazyLoadRecoverDuration: 30
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
    // 更新统计信息
    function updateStatsInfo() {
        const statsInfo = player.getStatisticsInfo();
        statsInfoEl.textContent = statsInfo ? JSON.stringify(statsInfo, null, 2) : '未获取到统计信息';
    }

    // 设置音量
    player.setVolume(volumeSlider.value / 100);

    logEvent('播放器创建成功', { url, isLive, mode: currentMode });
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
