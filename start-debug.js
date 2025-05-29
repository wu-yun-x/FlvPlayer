/*
 * @Author: st004362
 * @Date: 2025-05-29 18:25:10
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-05-29 18:25:10
 * @Description: 启动调试服务器的脚本
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// 确定要运行的命令
const isWindows = os.platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('启动调试服务器...');

// 运行npm debug命令
const debugProcess = spawn(npmCmd, ['run', 'debug'], {
    stdio: 'inherit',
    shell: true
});

debugProcess.on('error', (error) => {
    console.error(`启动调试服务器失败: ${error.message}`);
    process.exit(1);
});

console.log('调试服务器已启动，请在浏览器中访问示例页面');
console.log('按Ctrl+C停止服务器'); 