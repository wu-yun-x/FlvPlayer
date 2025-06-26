<!--
 * @Author: st004362
 * @Date: 2025-06-19 18:30:30
 * @LastEditors: ST/St004362
 * @LastEditTime: 2025-06-19 18:30:30
 * @Description: 语言选择器组件
-->
<template>
  <div class="language-switcher">
    <select v-model="selectedLanguage" @change="changeLanguage">
      <option value="zh-CN">{{ t("ui.languages.zh-CN") }}</option>
      <option value="en-US">{{ t("ui.languages.en-US") }}</option>
      <option value="vi-VN">{{ t("ui.languages.vi-VN") }}</option>
    </select>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const i18n = useI18n();
const { t } = i18n;
const selectedLanguage = ref(i18n.locale.value);

// 当语言选择改变时
const changeLanguage = () => {
  i18n.locale.value = selectedLanguage.value;
  // 保存用户语言选择到本地存储
  localStorage.setItem("user-language", selectedLanguage.value);
};

onMounted(() => {
  // 从本地存储获取用户语言偏好
  const savedLanguage = localStorage.getItem("user-language");
  if (savedLanguage) {
    selectedLanguage.value = savedLanguage;
    i18n.locale.value = savedLanguage;
  }
});
</script>

<style scoped>
.language-switcher {
  display: inline-block;
  margin-left: auto;
}

select {
  background-color: #2a2a2a;
  color: #fff;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
}

select:hover {
  background-color: #3a3a3a;
}

select:focus {
  border-color: #1890ff;
}
</style>
