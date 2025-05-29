/*
 * @Author: st004362
 * @Date: 2025-05-28 16:09:27
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-28 16:09:37
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
        open: true
    },
    resolve: {
        alias: {
            '@': resolve(rootDir, 'src')
        }
    },
    build: {
        outDir: resolve(rootDir, 'dist-examples')
    }
});