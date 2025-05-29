/*
 * @Author: st004362
 * @Date: 2025-05-28 15:56:05
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-28 15:56:16
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
        emptyOutDir: true
    }
});