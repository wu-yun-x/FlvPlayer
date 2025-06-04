/*
 * @Author: st004362
 * @Date: 2025-05-30 17:32:31
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-04 10:17:21
 * @Description: 状态机，负责管理播放器状态
 */
import { PLAYER_STATES } from '../constants';
import eventBus from '../events/EventBus';

/**
 * 状态流转表，防止非法状态切换
 */
const validTransitions = {
    [PLAYER_STATES.IDLE]: [PLAYER_STATES.LOADING, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.LOADING]: [PLAYER_STATES.READY, PLAYER_STATES.ERROR, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.READY]: [PLAYER_STATES.PLAYING, PLAYER_STATES.ERROR, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.PLAYING]: [PLAYER_STATES.PAUSED, PLAYER_STATES.ENDED, PLAYER_STATES.ERROR, PLAYER_STATES.BUFFERING, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.PAUSED]: [PLAYER_STATES.PLAYING, PLAYER_STATES.ENDED, PLAYER_STATES.ERROR, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.ENDED]: [PLAYER_STATES.PLAYING, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.ERROR]: [PLAYER_STATES.LOADING, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.BUFFERING]: [PLAYER_STATES.PLAYING, PLAYER_STATES.ERROR, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.DESTROYED]: [],
    [PLAYER_STATES.INITIALIZED]: [PLAYER_STATES.IDLE, PLAYER_STATES.DESTROYED],
    [PLAYER_STATES.DESTROYING]: [PLAYER_STATES.DESTROYED]
};

/**
 * StateMachine 状态机，负责管理播放器状态
 * - 状态机模式，状态变化时触发事件
 */
class StateMachine {
    /**
     * 构造函数，初始化状态机
     * @param {string} initialState - 初始状态
     */
    constructor(initialState = PLAYER_STATES.IDLE) {
        this.state = initialState;
    }

    /**
     * 设置状态
     * @param {string} newState - 新状态
     */
    setState(newState) {
        if (this.state === newState) return;
        if (!validTransitions[this.state]?.includes(newState)) {
            console.warn(`[StateMachine] Invalid state transition: ${this.state} -> ${newState}`);
            return;
        }
        this.state = newState;
        // 触发状态变更事件
        eventBus.emit(PLAYER_EVENTS.STATE_CHANGE, newState);
    }
    /**
     * 获取当前状态
     * @returns {string} 当前状态
     */
    getState() {
        return this.state;
    }
}

export default StateMachine;