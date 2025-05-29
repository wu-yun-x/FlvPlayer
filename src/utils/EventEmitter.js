/*
 * @Author: st004362
 * @Date: 2025-05-28 15:33:40
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-28 16:58:51
 * @Description: 实现事件发射和订阅系统
 */

class EventEmitter {
    constructor() {
        this._events = {};
    }

    on(event, listener) {
        // 实现事件注册
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(listener);
        return this;
    }

    off(event, listener) {
        // 实现事件取消
        if (!this._events[event]) return this;

        if (!listener) {
            // 如果没有提供具体监听器，则删除该事件的所有监听器
            delete this._events[event];
            return this;
        }

        // 找到并删除特定的监听器
        const index = this._events[event].indexOf(listener);
        if (index !== -1) {
            this._events[event].splice(index, 1);
            // 如果该事件没有监听器了，则删除该事件
            if (this._events[event].length === 0) {
                delete this._events[event];
            }
        }
        return this;
    }

    once(event, listener) {
        // 实现一次性事件
        const onceWrapper = (...args) => {
            // 先移除监听器，再调用原始监听器
            this.off(event, onceWrapper);
            listener.apply(this, args);
        };

        // 保存原始监听器的引用，方便后续可能的移除操作
        onceWrapper.originalListener = listener;

        return this.on(event, onceWrapper);
    }

    emit(event, ...args) {
        // 实现事件触发
        if (!this._events[event]) return false;

        // 复制一份监听器数组，防止在触发过程中监听器列表被修改导致问题
        const listeners = [...this._events[event]];
        listeners.forEach(listener => {
            try {
                listener.apply(this, args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });

        return true;
    }
}

export default EventEmitter;