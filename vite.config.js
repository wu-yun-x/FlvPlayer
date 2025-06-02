/*
 * @Author: st004362
 * @Date: 2025-05-28 15:56:05
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-30 11:53:03
 * @Description: vite配置文件
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: 'FlvPlayer',
            fileName: (format) => `flv-player.${format}.js`
        },
        rollupOptions: {
            // 确保外部化处理那些你不想打包进库的依赖
            external: ['mpegts.js'],
            output: {
                // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
                globals: {
                    'mpegts.js': 'mpegts'
                }
            }
        },
        // 生成 sourcemap
        sourcemap: true,
        // 清空输出目录
        emptyOutDir: false,
        // 最小化混淆，方便调试
        minify: false
    },
    // 启用源码映射
    css: {
        devSourcemap: true
    },
    test: {
        environment: 'jsdom',       // 使用浏览器环境模拟
        setupFiles: './test/setup.js', // 测试初始化文件
        coverage: {
            provider: 'istanbul',   // 使用行业标准覆盖率工具
            include: ['src/ui/*.js'] // 仅统计UI组件覆盖率
        }
    },
    server: {
        port: 3000,
        strictPort: true,
        proxy: {
            '/live': 'http://localhost:8000'
        }
    }
});