/*
 * @Author: st004362
 * @Date: 2025-06-18 16:26:42
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-19 11:18:38
 * @Description: 抓拍hook
 */
import { ref } from 'vue';

export function useNativeScreenshot() {
    const isCapturing = ref(false);
    const lastCapturedImage = ref(null);

    // html2canvas polyfill - 简化版
    const domToCanvas = async (element) => {
        // 创建canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const rect = element.getBoundingClientRect();

        // 设置canvas大小
        canvas.width = rect.width;
        canvas.height = rect.height;

        // 绘制背景
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // 查找所有视频元素
        const videos = element.querySelectorAll('video');

        // 绘制找到的视频帧
        if (videos.length > 0) {
            // 有视频元素则绘制视频
            for (const video of videos) {
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    const videoRect = video.getBoundingClientRect();
                    const x = videoRect.left - rect.left;
                    const y = videoRect.top - rect.top;

                    try {
                        context.drawImage(
                            video,
                            x, y,
                            videoRect.width, videoRect.height
                        );
                    } catch (e) {
                        console.warn('绘制视频失败:', e);
                    }
                }
            }

            return canvas;
        } else {
            // 没有视频，尝试使用其它方法

            // 方法1：尝试获取背景图像
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                const computedStyle = window.getComputedStyle(element);

                // 获取背景图像URL
                const bgImage = computedStyle.backgroundImage;
                if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
                    const url = bgImage.slice(5, -2).replace(/["']/g, '');

                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve; // 失败也继续
                        img.src = url;
                    });

                    if (img.width > 0) {
                        context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    }
                }
            } catch (e) {
                console.warn('绘制背景图失败:', e);
            }

            return canvas;
        }
    };

    // 专门针对视频元素的截图
    const captureVideoFrame = (videoElement) => {
        if (!videoElement || videoElement.tagName !== 'VIDEO') {
            console.error('提供的元素不是视频元素');
            return null;
        }

        try {
            const canvas = document.createElement('canvas');

            // 使用视频的实际尺寸
            if (videoElement.videoWidth && videoElement.videoHeight) {
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
            } else {
                // 回退到元素尺寸
                const rect = videoElement.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            const imageDataUrl = canvas.toDataURL('image/png');
            lastCapturedImage.value = imageDataUrl;
            return imageDataUrl;
        } catch (error) {
            console.error('视频帧捕获失败:', error);
            return null;
        }
    };

    // 新增：查找元素内的所有视频并截图
    const captureElementVideos = async (element) => {
        const videos = element.querySelectorAll('video');
        if (!videos || videos.length === 0) {
            return null;
        }

        // 如果只有一个视频，直接截取它
        if (videos.length === 1) {
            return captureVideoFrame(videos[0]);
        }

        // 创建大画布来合成多个视频
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const rect = element.getBoundingClientRect();

        canvas.width = rect.width;
        canvas.height = rect.height;

        // 绘制黑色背景
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制每个视频到对应位置
        let hasValidFrame = false;
        for (const video of videos) {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                const videoRect = video.getBoundingClientRect();
                const x = videoRect.left - rect.left;
                const y = videoRect.top - rect.top;

                try {
                    context.drawImage(
                        video,
                        x, y,
                        videoRect.width, videoRect.height
                    );
                    hasValidFrame = true;
                } catch (e) {
                    console.warn('绘制视频失败:', e);
                }
            }
        }

        if (hasValidFrame) {
            const imageDataUrl = canvas.toDataURL('image/png');
            lastCapturedImage.value = imageDataUrl;
            return imageDataUrl;
        }

        return null;
    };

    // 截图函数 - 主函数
    const captureElement = async (element, options = {}) => {
        if (!element) {
            console.error('未提供要截图的元素');
            return null;
        }
        const { onlyVisible = false } = options;

        isCapturing.value = true;

        try {
            if (onlyVisible) {
                console.log('仅抓拍可见元素');
                // 查找可见的视频元素（不带screen-hidden类的父元素）
                const visibleVideos = Array.from(element.querySelectorAll('video'))
                    .filter(video => {
                        const screenElement = video.closest('.screen');
                        if (!screenElement) return false;
                        // 检查是否有隐藏类
                        const hasHiddenClass = screenElement.classList.contains('screen-hidden');

                        // 检查透明度
                        const opacity = window.getComputedStyle(screenElement).opacity;
                        const isTransparent = opacity === '0';

                        // 检查元素是否在DOM中可见
                        const rect = screenElement.getBoundingClientRect();
                        const hasSize = rect.width > 0 && rect.height > 0;

                        // 元素可见 = 没有隐藏类 且 不透明 且 有尺寸
                        return !hasHiddenClass && !isTransparent && hasSize;
                    });
                console.log('找到可见视频:', visibleVideos.length);
                // 检查是否有放大的屏幕
                const zoomedScreen = element.querySelector('.screen-zoomed');
                if (zoomedScreen) {
                    console.log('检测到放大的屏幕，仅抓拍该屏幕');
                    // 找到放大屏幕中的视频
                    const zoomedVideo = zoomedScreen.querySelector('video');
                    if (zoomedVideo) {
                        return captureVideoFrame(zoomedVideo);
                    }
                } else if (visibleVideos.length === 1) {
                    // 只有一个可见视频，直接抓拍它
                    return captureVideoFrame(visibleVideos[0]);
                } else if (visibleVideos.length > 1) {
                    // 多个可见视频需要合成一张图
                    console.log('多个可见视频，合成一张图');
                    // 这里可以实现多视频合成逻辑
                }

            }
            // 下面是原来的截图逻辑
            console.log('使用默认抓拍逻辑');
            // 首先尝试找到视频元素并截图
            const videoResult = await captureElementVideos(element);
            if (videoResult) {
                return videoResult;
            }

            // 如果没有视频，使用DOM截图方法
            const canvas = await domToCanvas(element);
            const imageDataUrl = canvas.toDataURL('image/png');
            lastCapturedImage.value = imageDataUrl;
            return imageDataUrl;
        } catch (error) {
            console.error('截图失败:', error);
            return null;
        } finally {
            isCapturing.value = false;
        }
    };

    // 下载截图
    const downloadScreenshot = (imageDataUrl, fileName = `截图_${new Date().toISOString().replace(/[:.]/g, '-')}`) => {
        if (!imageDataUrl) {
            console.error('没有可用的截图');
            return false;
        }

        try {
            const link = document.createElement('a');
            link.href = imageDataUrl;
            console.log('截图数据长度：', imageDataUrl.length);
            link.download = `${fileName}.png`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return true;
        } catch (error) {
            console.error('下载截图失败:', error);
            return false;
        }
    };

    // 捕获并下载
    const captureAndDownload = async (element, fileName, options = {}) => {
        let imageDataUrl;

        console.log('element', element);
        console.log('准备抓拍，选项:', options);
        if (element.tagName === 'VIDEO') {
            imageDataUrl = captureVideoFrame(element);
        } else {
            imageDataUrl = await captureElement(element, options);
        }

        if (imageDataUrl) {
            return downloadScreenshot(imageDataUrl, fileName);
        }
        return false;
    };

    return {
        isCapturing,
        lastCapturedImage,
        captureElement,
        captureVideoFrame,
        downloadScreenshot,
        captureAndDownload
    };
}