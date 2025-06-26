# WebSocket-FLV 连接超时测试环境

这是一个用于测试WebSocket-FLV连接超时功能的服务端环境。通过此环境，你可以模拟各种网络情况，包括连接超时、网络延迟等，以测试前端播放器的连接超时处理能力。

## 功能特点

- 基于Node.js和node-media-server构建的流媒体服务器
- 支持RTMP和WebSocket-FLV协议
- 提供API接口用于动态调整服务器行为
- 可模拟连接超时情况
- 可设置超时延迟时间
- 包含测试客户端页面
- 包含测试推流脚本

## 系统要求

- Node.js 14.0+
- FFmpeg（用于测试推流）

## 安装步骤

1. 克隆或下载此仓库
2. 安装依赖：

```bash
npm install
```

## 使用方法

### 启动服务器

```bash
npm start
```

服务器将在以下端口启动：
- RTMP服务: rtmp://localhost:1935
- HTTP/WebSocket-FLV服务: http://localhost:8000
- API服务: http://localhost:8001

### 测试推流

运行测试推流脚本，生成测试视频流：

```bash
node test-stream.js
```

这将使用FFmpeg生成一个测试视频流并推送到RTMP服务器。

### 使用测试客户端

1. 在浏览器中打开 `test-client.html` 文件
2. 在客户端界面上，你可以：
   - 设置服务器的超时模拟参数
   - 设置客户端的连接超时时间
   - 连接到流并测试超时功能

## 测试连接超时功能

### 服务器端配置

通过测试客户端的服务器设置面板，你可以：

1. 启用/禁用连接超时模拟
2. 设置超时延迟时间（毫秒）
3. 启用/禁用网络延迟模拟
4. 设置网络延迟时间（毫秒）

### 客户端设置

在测试客户端的客户端设置面板中，你可以：

1. 设置流地址
2. 设置客户端连接超时时间（毫秒）

### 测试步骤

1. 启动服务器：`npm start`
2. 启动测试推流：`node test-stream.js`
3. 打开测试客户端页面 `test-client.html`
4. 设置服务器超时模拟（例如：启用超时模拟，设置延迟为5000毫秒）
5. 设置客户端连接超时（例如：3000毫秒）
6. 点击"连接"按钮
7. 观察结果：
   - 如果客户端超时时间小于服务器延迟，应该会触发客户端超时
   - 如果客户端超时时间大于服务器延迟，应该会显示服务器拒绝连接

## API接口

### 获取当前测试配置

```
GET http://localhost:8001/api/test-config
```

### 更新测试配置

```
POST http://localhost:8001/api/test-config
Content-Type: application/json

{
  "simulateTimeout": true,
  "timeoutDelay": 5000,
  "simulateSlowNetwork": false,
  "networkDelay": 1000
}
```

## 服务器配置说明

服务器配置位于 `app.js` 文件中，主要包含以下部分：

- RTMP服务配置
- HTTP服务配置
- FLV服务配置
- 录制配置
- 测试配置

## 注意事项

- 确保FFmpeg已正确安装并添加到系统PATH中
- 测试客户端需要在支持WebSocket和MSE的现代浏览器中运行
- 如果遇到跨域问题，请确认CORS设置正确

## 常见问题

### 无法连接到流

- 检查服务器是否正在运行
- 检查测试推流脚本是否正在运行
- 检查流地址是否正确

### 无法模拟超时

- 检查API服务是否正常运行
- 检查测试配置是否正确应用

## 许可证

ISC 