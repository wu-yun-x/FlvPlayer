/*
 * @Author: st004362
 * @Date: 2025-05-28 19:15:00
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-28 19:15:00
 * @Description: 启动示例页面的脚本
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 检查dist目录是否存在，如果不存在则先构建
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    console.log('正在构建库...');
    const buildProcess = spawn('pnpm', ['build'], {
        stdio: 'inherit',
        shell: true
    });

    buildProcess.on('close', (code) => {
        if (code === 0) {
            console.log('构建成功，正在启动示例页面...');
            startExample();
        } else {
            console.error('构建失败，请检查错误信息');
        }
    });
} else {
    startExample();
}

function startExample() {
    const exampleProcess = spawn('pnpm', ['serve-examples'], {
        stdio: 'inherit',
        shell: true
    });

    exampleProcess.on('close', (code) => {
        if (code !== 0) {
            console.error('示例页面启动失败，退出码:', code);
        }
    });
} 