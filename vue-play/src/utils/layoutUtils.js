/**
 * 布局和屏幕管理相关的工具函数
 */

/**
 * 获取指定布局的屏幕数量
 * @param {string} layout - 布局类型，例如 '1x1', '2x2', '3x3'
 * @returns {number} 屏幕数量
 */
export function getScreenCount(layout) {
    switch (layout) {
        case "1x1":
            return 1;
        case "2x2":
            return 4;
        case "3x3":
            return 6; // 注意这里返回6而不是9，根据当前业务逻辑修改
        default:
            return 4; // 默认2x2布局
    }
}

/**
 * 根据布局和屏幕索引获取屏幕的位置
 * @param {string} layout - 布局类型
 * @param {number} index - 屏幕索引
 * @returns {Object} 包含行列位置的对象 {row, col}
 */
export function getScreenPosition(layout, index) {
    switch (layout) {
        case "1x1":
            return { row: 0, col: 0 };
        case "2x2":
            return {
                row: Math.floor(index / 2),
                col: index % 2
            };
        case "3x3":
            return {
                row: Math.floor(index / 3),
                col: index % 3
            };
        default:
            return { row: 0, col: 0 };
    }
}

/**
 * 生成指定布局的屏幕数据
 * @param {string} layout - 布局类型
 * @returns {Array} 屏幕数据数组
 */
export function generateScreens(layout) {
    const count = getScreenCount(layout);
    return Array(count)
        .fill()
        .map((_, i) => ({
            id: i + 1,
            videoUrl: "",
            position: getScreenPosition(layout, i)
        }));
}

/**
 * 根据不同布局计算单个屏幕的样式
 * @param {string} layout - 布局类型
 * @param {number} index - 屏幕索引
 * @param {boolean} isZoomed - 是否处于放大状态
 * @returns {Object} CSS样式对象
 */
export function calculateScreenStyle(layout, index, isZoomed = false) {
    // 基础样式
    const baseStyle = {
        width: '100%',
        height: '100%'
    };

    // 根据布局和索引计算特殊样式
    if (isZoomed) {
        return {
            ...baseStyle,
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10
        };
    }

    // 根据布局应用不同的网格样式
    switch (layout) {
        case '1x1':
            return baseStyle;
        case '2x2':
            return baseStyle;
        case '3x3':
            // 3x3布局中第一个屏幕可能需要占据更大空间
            if (index === 0) {
                return {
                    ...baseStyle,
                    gridColumn: 'span 2',
                    gridRow: 'span 2'
                };
            }
            return baseStyle;
        default:
            return baseStyle;
    }
} 