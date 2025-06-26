/*
 * @Author: st004362
 * @Date: 2025-06-18 16:00:02
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-18 16:00:29
 * @Description: 全屏hook
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useFullscreen() {
    const isFullscreen = ref(false);

    // 检查浏览器支持的全屏方法
    const getFullscreenElement = () => {
        return (
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    };

    // 请求全屏
    const requestFullscreen = (element) => {
        if (element.requestFullscreen) {
            return element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            return element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            return element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            return element.msRequestFullscreen();
        }
        return Promise.reject('不支持全屏 API');
    };

    // 退出全屏
    const exitFullscreen = () => {
        if (document.exitFullscreen) {
            return document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            return document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            return document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            return document.msExitFullscreen();
        }
        return Promise.reject('不支持退出全屏 API');
    };

    // 切换全屏状态
    const toggleFullscreen = async (element) => {
        if (!element) {
            console.error('未提供要全屏的元素');
            return;
        }

        try {
            if (!getFullscreenElement()) {
                await requestFullscreen(element);
            } else {
                await exitFullscreen();
            }
        } catch (error) {
            console.error('全屏操作失败:', error);
        }
    };

    // 处理全屏状态变化事件
    const handleFullscreenChange = () => {
        isFullscreen.value = !!getFullscreenElement();
    };

    onMounted(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    });

    onBeforeUnmount(() => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    });

    return {
        isFullscreen,
        toggleFullscreen,
        requestFullscreen,
        exitFullscreen
    };
}