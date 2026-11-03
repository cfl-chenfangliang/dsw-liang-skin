# dsw-liang-skin
<img width="2878" height="1310" alt="image" src="https://github.com/user-attachments/assets/f07cc080-3cd7-4122-9cc6-3a3aac727de3" />
<img width="2866" height="1314" alt="image" src="https://github.com/user-attachments/assets/e24abfde-4804-44e3-a62c-609ae5989720" />

[插件名称]
基于 kingOfSoySauce/dsh-liang-skin 的油猴（Tampermonkey / Violentmonkey）移植版本。

作用于网页版的Deepseek: https://chat.deepseek.com/

[一句话描述：例如“将‘滑动变祖’的 0–30 推理强度滑块与视觉联动体验，带到浏览器端的 DeepSeek Harness 页面。”]

简介
[插件名称] 是一个运行在浏览器中的用户脚本（userscript），通过油猴扩展加载。改编自开源项目 kingOfSoySauce/dsh-liang-skin（中文名“滑动变祖”），将原项目中基于 DeepSeek Harness 插件体系的“推理强度滑杆 + 人物/背景/界面同步配色”交互，重新实现为不依赖 DSH 插件安装流程的油猴脚本形式。


上游项目：

名称：kingOfSoySauce/dsh-liang-skin（“滑动变祖”）
仓库：https://github.com/kingOfSoySauce/dsh-liang-skin


油猴原生兼容：通过 @match 声明目标页面，依赖油猴扩展运行，不要求安装 DSH 插件体系。

安装
前置条件：

安装 Tampermonkey 或兼容的油猴扩展（Violentmonkey、Greasemonkey 等）。

打开目标页面 https://chat.deepseek.com/
