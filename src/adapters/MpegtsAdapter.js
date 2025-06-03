/*
 * MpegtsAdapter.js
 * mpegts.js 协议适配器，负责与 mpegts.js 实例交互，提供统一的播放器适配接口
 *
 * @author: st004362
 * @date: 2025-05-31
 */
import mpegts from 'mpegts.js';
import { PLAYER_EVENTS } from '../constants';
import eventBus from '../events/EventBus';

/**
 * MpegtsAdapter 负责管理 mpegts.js 实例，并与 Player 进行解耦
 * - 只暴露必要的播放器控制方法
 * - 事件转发到全局 eventBus
 */
class MpegtsAdapter {
    /**
     * 构造函数
     * @param {HTMLVideoElement} video - video元素
     * @param {Object} options - 播放器配置
     */
    constructor(video, options) {
        this.video = video;
        this.config = options.mpegtsConfig;
        this.mediaDataSource = options.mediaDataSource;
        this._init();
    }

    /**
     * 初始化 mpegts.js 实例
     * @private
     */
    _init() {
        if (mpegts.getFeatureList().mseLivePlayback) {
            this.player = mpegts.createPlayer(this.mediaDataSource, this.config);
            this.player.attachMediaElement(this.video);
            this.player.load();
            this._bindEvents();
        }
    }

    /**
     * 绑定 mpegts.js 事件到全局 eventBus
     * @private
     */
    _bindEvents() {
        this.player.on(mpegts.Events.ERROR, (e) => eventBus.emit(PLAYER_EVENTS.ERROR, e));
        this.player.on(mpegts.Events.STATISTICS_INFO, (info) => eventBus.emit(PLAYER_EVENTS.STATS_UPDATE, { statisticsInfo: info }));
        this.player.on(mpegts.Events.MEDIA_INFO, (info) => eventBus.emit(PLAYER_EVENTS.MEDIA_INFO, info));
    }

    /**
     * 加载新的视频源
     * @param {string} url
     */
    load(url) {
        if (this.player) {
            this.player.unload();
            this.player.detachMediaElement();
            this.player.destroy();
        }
        this.config.url = url;
        this._init();
    }

    /**
     * 播放
     */
    play() { this.video.play(); }
    /** 暂停 */
    pause() { this.video.pause(); }
    /** 销毁适配器和 mpegts 实例 */
    destroy() {
        if (this.player) {
            this.player.unload();
            this.player.detachMediaElement();
            this.player.destroy();
            this.player = null;
        }
    }
}

export default MpegtsAdapter;