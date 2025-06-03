import { PLAYER_STATES } from '../constants';

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
        this.state = newState;
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