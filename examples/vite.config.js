/*
 * @Author: st004362
 * @Date: 2025-05-28 16:09:27
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-11 14:52:17
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
        hmr: true,
        // 新增调试配置
        sourcemap: true,
        debug: true
    },
    resolve: {
        alias: {
            '@': resolve(rootDir, 'src'),
            // 直接映射到源码目录
            'flv-player': resolve(rootDir, 'src/index.js'),
        }
    },
    build: {
        outDir: resolve(rootDir, 'dist-examples'),
        sourcemap: 'inline', // 生成内联sourcemap
        minify: false,
        // 新增调试构建配置
        rollupOptions: {
            treeshake: false // 关闭代码摇树优化
        }
    },
    // 启用详细的日志
    logLevel: 'debug',
});