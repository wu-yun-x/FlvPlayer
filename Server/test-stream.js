/*
 * 测试推流脚本
 * 用于生成测试流，测试连接超时功能
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 检查是否安装了FFmpeg
function checkFFmpeg() {
    try {
        const result = spawn('ffmpeg', ['-version']);
        return new Promise((resolve) => {
            result.on('close', (code) => {
                resolve(code === 0);
            });
        });
    } catch (error) {
        return Promise.resolve(false);
    }
}

// 创建测试视频（彩条）并推流到RTMP服务器
function startStreaming() {
    console.log('开始推流测试视频到RTMP服务器...');

    // 使用FFmpeg生成测试视频并推流
    const ffmpeg = spawn('ffmpeg', [
        '-re',                          // 实时模式
        '-f', 'lavfi',                  // 使用libavfilter输入
        '-i', 'testsrc=size=640x480:rate=30', // 生成测试图案
        '-c:v', 'libx264',              // 视频编码器
        '-b:v', '800k',                 // 视频比特率
        '-f', 'flv',                    // 输出格式
        'rtmp://localhost:1935/live/stream' // RTMP地址
    ]);

    ffmpeg.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg stderr: ${data.toString()}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg进程退出，退出码 ${code}`);
    });

    console.log('FFmpeg已启动，按Ctrl+C停止推流');

    // 处理进程退出
    process.on('SIGINT', () => {
        console.log('正在停止FFmpeg...');
        ffmpeg.kill('SIGINT');
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    });
}

// 主函数
async function main() {
    console.log('测试推流工具启动...');

    // 检查FFmpeg是否安装
    const ffmpegInstalled = await checkFFmpeg();
    if (!ffmpegInstalled) {
        console.error('错误：未检测到FFmpeg。请先安装FFmpeg后再运行此脚本。');
        console.error('Windows: https://ffmpeg.org/download.html');
        console.error('Linux: sudo apt-get install ffmpeg');
        console.error('macOS: brew install ffmpeg');
        process.exit(1);
    }

    // 开始推流
    startStreaming();
}

main().catch(error => {
    console.error('发生错误:', error);
    process.exit(1);
}); 