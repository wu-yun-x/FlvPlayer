/*
 * @Author: st004362
 * @Date: 2025-05-30 18:26:22
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-20 17:20:12
 * @Description: 
 */
const NodeMediaServer = require('node-media-server');
const express = require('express');
const WebSocket = require('ws');

const config = {
    rtmp: { port: 1935, chunk_size: 60000, gop_cache: true, ping: 60, ping_timeout: 30 },
    http: { port: 8000, allow_origin: '*', mediaroot: './media' },
    flv: { port: 8000, allow_origin: '*' }
};

// 可动态切换的压缩开关
let enableCompression = false; // 默认禁用压缩

const nms = new NodeMediaServer(config);

// 劫持 upgrade 事件，自己创建 ws 实例
let httpServer = null;
const originalCreateHttpServer = NodeMediaServer.prototype.createHttpServer;
NodeMediaServer.prototype.createHttpServer = function () {
    const result = originalCreateHttpServer.apply(this, arguments);
    httpServer = this.httpServer;
    const oldHandlers = httpServer.listeners('upgrade');
    httpServer.removeAllListeners('upgrade');
    httpServer.on('upgrade', (req, socket, head) => {
        if (req.url.endsWith('.flv')) {
            // 用 ws 库自己创建 WebSocket 连接，设置压缩参数
            const wsServer = new WebSocket.Server({ noServer: true, perMessageDeflate: enableCompression });
            wsServer.handleUpgrade(req, socket, head, (ws) => {
                // 交给 NodeMediaServer 原有的处理逻辑
                for (const handler of oldHandlers) {
                    handler.call(httpServer, req, ws._socket, head);
                }
            });
            return;
        }
        for (const handler of oldHandlers) {
            handler.call(httpServer, req, socket, head);
        }
    });
    return result;
};

nms.run();

// 提供API切换压缩开关
const app = express();
app.use(express.json());

app.get('/compression', (req, res) => {
    res.json({ enableCompression });
});
app.post('/compression', (req, res) => {
    if (typeof req.body.enableCompression === 'boolean') {
        enableCompression = req.body.enableCompression;
    }
    res.json({ enableCompression });
});

app.listen(8002, () => {
    console.log('压缩开关API:');
    console.log('GET  http://localhost:8002/compression');
    console.log('POST http://localhost:8002/compression  {\"enableCompression\":true/false}');
});

console.log('流媒体服务器已启动');
console.log('RTMP推流地址: rtmp://localhost:1935/live/xxx');
console.log('WS-FLV播放地址: ws://localhost:8000/live/xxx.flv');