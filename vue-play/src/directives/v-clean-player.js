/**
 * v-clean-player 指令
 * 用于在元素卸载前自动清理视频资源
 * 
 * 使用方式：<div v-clean-player></div>
 */

export const cleanPlayer = {
    beforeUnmount(el) {
        // 查找元素内的视频标签
        const videos = el.querySelectorAll('video');
        if (videos.length === 0) return;

        console.log(`[v-clean-player] 清理 ${videos.length} 个视频元素`);

        // 清理每个视频元素
        videos.forEach(video => {
            try {
                // 停止播放
                video.pause();

                // 停止加载
                video.removeAttribute('src');
                if (video.load) video.load();

                // 移除媒体源
                if (video.srcObject) {
                    const tracks = video.srcObject.getTracks();
                    if (tracks && tracks.length) {
                        tracks.forEach(track => track.stop());
                    }
                    video.srcObject = null;
                }

                // 移除事件监听器
                video.onloadeddata = null;
                video.onerror = null;
                video.oncanplaythrough = null;
                video.onpause = null;
                video.onplay = null;
            } catch (e) {
                console.warn('[v-clean-player] 清理视频元素时出错:', e);
            }
        });
    }
};

export default cleanPlayer; 