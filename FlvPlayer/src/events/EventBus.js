/*
 * @Author: st004362
 * @Date: 2025-06-10 18:03:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-20 11:16:50
 * @Description: 简易事件总线，负责全局事件的订阅、分发和解绑
 */
class EventBus {
    constructor() {
        this.events = {};
    }
    /**
     * 订阅事件
     * @param {string} event
     * @param {Function} handler
     */
    on(event, handler) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(handler);
    }
    /**
     * 订阅一次性事件
     * @param {string} event
     * @param {Function} handler
     */
    once(event, handler) {
        const onceHandler = (data) => {
            this.off(event, onceHandler);
            handler(data);
        };
        this.on(event, onceHandler);
    }
    /**
     * 解绑事件
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(fn => fn !== handler);
    }
    /**
     * 触发事件
     * @param {string} event
     * @param {any} data
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(fn => fn(data));
    }
    removeAll() {
        this.events = {};
    }
}

export default new EventBus(); 