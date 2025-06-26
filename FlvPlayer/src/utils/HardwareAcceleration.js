/**
 * 检测并启用硬件加速
 * @param {Object} options - 配置选项
 * @returns {Object} 硬件加速信息
 */
export function detectAndEnableHardwareAcceleration(options = {}) {
    // 默认配置
    const config = {
        forceHardwareAcceleration: false, // 是否强制启用硬件加速
        allowSoftwareRendering: false,    // 是否允许软件渲染
        ...options
    };

    // 硬件加速信息
    const hwAccelInfo = {
        supported: false,           // 是否支持硬件加速
        enabled: false,             // 是否已启用
        type: 'none',               // 硬件加速类型
        performance: 'unknown',     // 性能评级
        isSoftwareRendering: false  // 是否为软件渲染
    };

    // 检测硬件加速
    try {
        const canvas = document.createElement('canvas');

        // 设置上下文属性，避免软件回退警告
        const contextAttributes = {
            failIfMajorPerformanceCaveat: !config.allowSoftwareRendering
        };

        // 尝试获取 WebGL 上下文
        const gl = canvas.getContext('webgl', contextAttributes) ||
            canvas.getContext('experimental-webgl', contextAttributes);

        if (!gl) {
            return hwAccelInfo; // 无法获取 WebGL 上下文
        }

        // 尝试获取渲染器信息
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

            hwAccelInfo.type = renderer;

            // 检测是否为软件渲染
            const isSoftwareRenderer =
                renderer.indexOf('SwiftShader') >= 0 ||
                renderer.indexOf('llvmpipe') >= 0 ||
                renderer.indexOf('software') >= 0 ||
                renderer.indexOf('Software') >= 0;

            hwAccelInfo.isSoftwareRendering = isSoftwareRenderer;

            // 如果是软件渲染并且不允许，则返回不支持
            if (isSoftwareRenderer && !config.allowSoftwareRendering) {
                hwAccelInfo.performance = 'software';
                return hwAccelInfo;
            }

            // 判断性能级别
            if (isSoftwareRenderer) {
                hwAccelInfo.performance = 'software';
            } else if (
                renderer.indexOf('Intel') >= 0 ||
                renderer.indexOf('HD Graphics') >= 0
            ) {
                hwAccelInfo.performance = 'medium';
            } else if (
                renderer.indexOf('NVIDIA') >= 0 ||
                renderer.indexOf('AMD') >= 0 ||
                renderer.indexOf('Radeon') >= 0
            ) {
                hwAccelInfo.performance = 'high';
            }

            // 检测 MSE 和编解码器支持
            const mseSupported = window.MediaSource &&
                typeof window.MediaSource.isTypeSupported === 'function';

            const h264Supported = mseSupported &&
                window.MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"');

            hwAccelInfo.supported = h264Supported;
            hwAccelInfo.enabled = config.forceHardwareAcceleration || hwAccelInfo.supported;

            return hwAccelInfo;
        }

        // 无法获取渲染器信息
        hwAccelInfo.supported = true; // 假设支持
        hwAccelInfo.enabled = config.forceHardwareAcceleration || hwAccelInfo.supported;
        return hwAccelInfo;

    } catch (e) {
        console.error('Hardware acceleration detection error:', e);
        return hwAccelInfo;
    }
}