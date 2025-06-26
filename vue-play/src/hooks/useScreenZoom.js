import { ref, computed } from 'vue';

export function useScreenZoom() {
    // 追踪当前放大的屏幕索引
    const zoomedScreenIndex = ref(null);
    // 追踪之前的布局
    const previousLayout = ref(null);

    // 计算当前是否有屏幕被放大
    const isScreenZoomed = computed(() => zoomedScreenIndex.value !== null);

    // 处理双击事件
    const handleScreenDoubleClick = (index, layout) => {
        // 如果已经在放大状态
        if (isScreenZoomed.value) {
            // 如果双击的是当前放大的屏幕，则缩小回原始布局
            zoomedScreenIndex.value = null;
            return previousLayout.value;
        } else {
            // 放大屏幕
            zoomedScreenIndex.value = index;
            // 保存当前布局以便后续恢复
            previousLayout.value = layout;
            return layout;
        }
    };

    // 检查是否需要应用缩放样式
    const getZoomClass = (index) => {
        if (zoomedScreenIndex.value === null) return '';
        return index === zoomedScreenIndex.value ? getZoomedClass(index) : 'screen-hidden';
    };

    // 根据索引获取放大样式类名
    const getZoomedClass = (index) => {
        // 特殊处理：如果是9屏模式的第一个屏幕(索引为0)
        if (index === 0) {
            return 'screen-zoomed screen-zoomed-first';
        }
        return 'screen-zoomed';
    };

    return {
        zoomedScreenIndex,
        isScreenZoomed,
        handleScreenDoubleClick,
        getZoomClass
    };
} 