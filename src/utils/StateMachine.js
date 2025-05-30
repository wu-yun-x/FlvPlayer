/*
 * StateMachine.js
 * 播放器状态机，负责管理和校验播放器的状态流转
 *
 * @author: st004362
 * @date: 2025-05-31
 */

import { PLAYER_STATES } from '../constants';

/**
 * StateMachine 播放器状态机
 * - 管理播放器所有状态及其合法流转
 * - 提供状态校验、切换、重置等方法
 */
class StateMachine {
    /**
     * 构造函数，初始化状态机
     * @param {string} initialState - 初始状态，默认IDLE
     */
    constructor(initialState = PLAYER_STATES.IDLE) {
        this.state = initialState; // 当前状态
        this.transitions = new Map(); // 状态流转表
        this._setupTransitions();
    }

    /**
     * 定义所有状态的合法流转关系
     * @private
     */
    _setupTransitions() {
        // 每个状态允许流转到的下一个状态
        this.transitions.set(PLAYER_STATES.IDLE, [
            PLAYER_STATES.INITIALIZED,
            PLAYER_STATES.ERROR
        ]);

        this.transitions.set(PLAYER_STATES.INITIALIZED, [
            PLAYER_STATES.LOADING,
            PLAYER_STATES.ERROR
        ]);

        this.transitions.set(PLAYER_STATES.LOADING, [
            PLAYER_STATES.READY,
            PLAYER_STATES.ERROR
        ]);

        this.transitions.set(PLAYER_STATES.READY, [
            PLAYER_STATES.PLAYING,
            PLAYER_STATES.PAUSED,
            PLAYER_STATES.ERROR
        ]);

        this.transitions.set(PLAYER_STATES.PLAYING, [
            PLAYER_STATES.PAUSED,
            PLAYER_STATES.ENDED,
            PLAYER_STATES.BUFFERING,
            PLAYER_STATES.ERROR
        ]);

        this.transitions.set(PLAYER_STATES.PAUSED, [
            PLAYER_STATES.PLAYING,
            PLAYER_STATES.ERROR
        ]);

        this.transitions.set(PLAYER_STATES.BUFFERING, [
            PLAYER_STATES.PLAYING,
            PLAYER_STATES.ERROR
        ]);

        this.transitions.set(PLAYER_STATES.ENDED, [
            PLAYER_STATES.READY,
            PLAYER_STATES.ERROR
        ]);

        this.transitions.set(PLAYER_STATES.ERROR, [
            PLAYER_STATES.IDLE,
            PLAYER_STATES.READY
        ]);

        this.transitions.set(PLAYER_STATES.DESTROYING, [
            PLAYER_STATES.DESTROYED
        ]);

        this.transitions.set(PLAYER_STATES.DESTROYED, []);
    }

    /**
     * 检查当前状态是否允许流转到toState
     * @param {string} toState - 目标状态
     * @returns {boolean}
     */
    canTransition(toState) {
        const allowedTransitions = this.transitions.get(this.state);
        return allowedTransitions && allowedTransitions.includes(toState);
    }

    /**
     * 执行状态流转
     * @param {string} toState - 目标状态
     * @returns {{previousState: string, currentState: string}}
     * @throws {Error} 如果流转不合法
     */
    transition(toState) {
        if (!this.canTransition(toState)) {
            throw new Error(`Invalid state transition from ${this.state} to ${toState}`);
        }

        const previousState = this.state;
        this.state = toState;

        return {
            previousState,
            currentState: this.state
        };
    }

    /**
     * 获取当前状态
     * @returns {string}
     */
    getState() {
        return this.state;
    }

    /**
     * 判断当前状态是否为指定状态
     * @param {string} state
     * @returns {boolean}
     */
    isState(state) {
        return this.state === state;
    }

    /**
     * 重置状态机到IDLE
     */
    reset() {
        this.state = PLAYER_STATES.IDLE;
    }
}

export default StateMachine;
