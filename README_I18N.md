# FlvPlayer 国际化支持

FlvPlayer 现已支持完整的国际化功能，允许您在不同语言环境下使用播放器，并且可以与您现有的 i18n 解决方案（如 vue-i18n）无缝集成。

## 特性

- 完整的多语言支持
- 参数插值和格式化
- 集成现有 i18n 库或使用内置翻译资源
- 语言动态切换和 UI 自动更新
- 开发模式下缺失翻译检测

## 使用方法

### 基本用法

最简单的用法是使用内置的翻译资源：

```javascript
import Player from 'flvplayer';

const player = new Player({
  container: '#player',
  // 其他配置...
  
  // 国际化配置
  i18n: {
    locale: 'zh-CN' // 使用中文
  }
});
```

### 动态切换语言

```javascript
// 切换到英文
player.setLocale('en-US');

// 获取当前语言
const currentLocale = player.getLocale();
```

### 与 Vue I18n 集成

```javascript
import { useI18n } from 'vue-i18n';
import Player from 'flvplayer';

// 在 Vue 组件中
const { t, locale } = useI18n();

const player = new Player({
  // 其他配置...
  i18n: {
    // 使用 Vue I18n 的翻译函数
    t: (key, params) => t(key, params),
    // 当前语言
    locale: locale.value,
    // 不需要合并默认资源（使用 Vue I18n 的翻译）
    merge: false
  }
});

// 双向同步语言变化
watch(() => locale.value, (newLocale) => {
  player.setLocale(newLocale);
});
```

## 高级配置选项

```javascript
{
  // 当前语言
  locale: 'en-US',
  
  // 回退语言（当当前语言没有对应翻译时使用）
  fallbackLocale: 'en-US',
  
  // 自定义翻译函数，如果提供则优先使用
  t: function(key, params) { /* 自定义翻译逻辑 */ },
  
  // 自定义翻译资源
  resources: {
    'zh-CN': { /* 中文翻译 */ },
    'en-US': { /* 英文翻译 */ }
  },
  
  // 是否合并默认翻译资源
  merge: true,
  
  // 是否自动更新UI
  autoUpdate: true,
  
  // 开发工具选项
  dev: {
    // 翻译缺失警告级别
    warnOnMissingKey: true,
    // 是否记录缺失的键
    recordMissingKeys: true
  }
}
```

## 添加自定义翻译

您可以添加自己的翻译资源：

```javascript
// 添加法语支持
player.addTranslationResources('fr-FR', {
  player: {
    controls: {
      play: 'Lecture',
      pause: 'Pause',
      // ... 其他翻译
    }
  }
});

// 切换到法语
player.setLocale('fr-FR');
```

## 使用翻译键名常量

为避免使用硬编码的翻译键名，我们提供了常量：

```javascript
import { CONTROLS, STATES, ERRORS } from 'flvplayer/i18n/keys';

// 例如在自定义UI中使用
const playButtonText = player.translate(CONTROLS.PLAY);
const errorMessage = player.translate(ERRORS.NETWORK_ERROR);
```

## 支持的语言

当前内置支持的语言：

- 英文 (en-US)
- 简体中文 (zh-CN)

欢迎贡献更多语言的翻译！

## 参数插值

支持多种参数插值格式：

```javascript
// 基本变量替换
player.translate('player.controls.volume', { level: 80 }); 
// => "音量: 80%"

// 数字格式化
player.translate('player.stats.viewers', { count: 1000 }); 
// => "1,000 viewers"

// 日期格式化
player.translate('player.uploadDate', { date: new Date() }); 
// => "上传于: 2023年6月20日"
``` 