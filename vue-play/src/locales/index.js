/*
 * @Author: st004362
 * @Date: 2025-06-19 18:20:30
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-19 19:39:20
 * @Description: 国际化支持入口文件
 */

import { createI18n } from 'vue-i18n';
import zh from './zh-CN.json';
import en from './en-US.json';
import vi from './vi-VN.json';

const messages = {
    'zh-CN': zh,
    'en-US': en,
    'vi-VN': vi
};

// 检测浏览器语言
const getBrowserLanguage = () => {
    const lang = navigator.language || navigator.userLanguage;
    // 简化匹配逻辑
    if (lang.startsWith('zh')) return 'zh-CN';
    if (lang.startsWith('vi')) return 'vi-VN';
    return 'en-US'; // 默认英文
};

const i18n = createI18n({
    legacy: false, // 使用组合式API
    locale: getBrowserLanguage(),
    fallbackLocale: 'en-US', // 回退语言
    messages
});

export default i18n; 