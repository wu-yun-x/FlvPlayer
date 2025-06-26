<!--
 * @Author: st004362
 * @Date: 2025-06-20 17:00:53
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-20 17:37:19
 * @Description: 
-->
# 多屏播放器组件优化

## 代码优化概述

本次重构对多屏播放器(MultiScreenPlayer)组件进行了代码结构优化，主要通过提取公共逻辑，建立清晰的责任边界，使代码更加模块化，更易于维护和扩展。

## 主要改进

1. **逻辑分离与组件化**:
   - 使用hooks将播放器设置管理、播放器实例管理等功能分离
   - 将布局计算相关的工具函数提取到独立模块

2. **自定义指令优化**:
   - 创建`v-clean-player`自定义指令，为DOM元素卸载前自动清理视频资源提供声明式解决方案
   - 减少内存泄漏和残留资源问题

3. **代码组织优化**:
   - `usePlayerSettings.js`: 管理播放器设置的加载、保存和应用
   - `usePlayerManager.js`: 处理播放器实例的创建、销毁和视频元素清理
   - `layoutUtils.js`: 提供布局计算相关的纯函数工具

4. **功能改进**:
   - 优化了视频元素清理逻辑，解决播放器实例堆积和内存泄漏问题
   - 改进了错误处理和资源释放机制

## 文件结构

```
vue-play/src/
├── components/
│   ├── MultiScreenPlayer.vue (主组件)
│   └── SplitScreen.vue (分屏布局组件)
├── hooks/
│   ├── usePlayerManager.js (播放器管理hook)
│   ├── usePlayerSettings.js (播放器设置hook)
│   ├── useFullscreen.js (全屏管理hook)
│   └── useScreenshot.js (截图功能hook)
├── utils/
│   └── layoutUtils.js (布局计算工具)
└── directives/
    └── v-clean-player.js (视频清理指令)
```

## 收益

1. **代码可读性**: 通过功能模块化和责任分离，提高了代码可读性和可维护性
2. **复用性**: 抽取的hooks和工具函数可在其他组件中复用 
3. **资源管理**: 更严格的资源释放机制，减少内存泄漏风险
4. **可扩展性**: 更容易添加新功能或修改现有功能，不影响其他部分

## 使用方式

多屏播放器组件可以这样使用:

```vue
<MultiScreenPlayer />
```

组件保留了原有的全部功能，同时在内部实现上更加优化和健壮。 