/*
 * @Author: st004362
 * @Date: 2025-05-28 16:09:27
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 18:15:32
 * @Description: 配置示例页面
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

export default defineConfig({
    root: resolve(rootDir, 'examples'),
    server: {
        open: true,
        // 启用热更新
        hmr: true
    },
    resolve: {
        alias: {
            // 直接使用源码，而不是打包后的库
            '@': resolve(rootDir, 'src'),
            // 将导入的库路径映射到源码
            '../dist/flv-player.es.js': resolve(rootDir, 'src/index.js')
        }
    },
    build: {
        outDir: resolve(rootDir, 'dist-examples'),
        sourcemap: true,
        minify: false
    },
    // 启用源码映射
    css: {
        devSourcemap: true
    },
    // 启用详细的日志
    logLevel: 'info'
});