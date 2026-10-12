# 官方 Skill 校验摘要

校验日期：2026-10-12。当前名称：深海较量。

## 来源与执行边界

- 用户提供上传页：https://creator.xiaohongshu.com/new/red-app 。本次公开网页读取返回错误，未取得账号内字段完整限制，未登录、上传或发布。
- 用户指定下载：https://fe-static.xhscdn.com/minitool/20260923133933/minitool-zip-builder-1.7.0.skill 。已下载并校验 ZIP 路径后解压到 `.codex/skills/minitool-zip-builder/`。
- 原包 SHA256：`8BD0F4FDE976EC3E9784BEBC9FD8D16270769C129B39098698FC58572716C305`。
- 包元数据 `skill-package.json` 为 1.7.0，内部 SKILL.md 元数据为 1.6.0；未修改官方文件，按实际下载内容执行。
- 已检查包内 11 个文件；两个审计脚本只读取目录或 ZIP 元数据，没有网络、凭据读取、动态执行或系统修改。
- 本任务已获取现行在线文档 https://miniapp-sandbox.xiaohongshu.com/minitool/doc ，在线契约优先于本地 API 快照。

## 静态校验结果

- 官方 Node 审计：dist 4 个文件，0 警告；游戏 ZIP 体积检查通过，0 警告。
- 官方 Python 审计：ZIP 内 4 个文件，0 警告。
- 项目校验：98,182 字节解压资源，经典 IIFE、Chrome 61 / ES2017 构建；相对资源完整，无内联脚本、模块加载、联网、剪贴板或站外导航。
- 游戏 ZIP：32,959 字节，根目录仅 index.html、app.js、style.css、icon.svg；与 dist 逐字节一致，预览别名一致。
- 原生存储 9.46+、评论 9.49+ 版本及方法检查；无匹配能力时才使用有异常保护的降级路径。分享、保存和评论均由用户点击触发。
- CSS 补齐 grid-gap、focus、安全区宿主变量、软键盘视觉视口；Flex 间距采用 margin 回退，inset 有四边回退。不依赖 UA 判型。
- 静态包无大数据集、静态 Base64 或媒体文件。Canvas 2D，DPR 和粒子数量有限制，有低特效选项；WebGL 专项不适用。真实首屏、帧率和内存未实测。
- 高清图标独立交付，不塞入离线游戏包；音效和音乐为本地合成。

## 本轮产品修复与工程检查

- 名称、简介、成绩卡和推广图文改为用户确认版本，六张推广截图重新截取。
- iPad 音频：触摸/指针/键盘手势解锁、静音缓冲预热、interrupted 恢复、可用时启用 playback audioSession；可选 API 失败不会阻止 AudioContext 创建。
- 后五波交替密集编队和分散敌艇；密集组保持共同速度和相邻深度，按组人数延迟下批出场，保留敌艇总数与难度递进。
- 单元检查 74/74 通过，其中新增中断恢复与后五波自然编队单次命中三连炸回归。最终音频小改后对应 2 项再次通过。
- Windows 桌面 WebKit 模拟布局/触摸/存档等 11 项通过，但该环境没有 WebAudio 构造器，不能验证声音。
- Chromium 离线合成整段音乐非静音且无削波，峰值 0.04085，RMS 0.00476；不代表真机可听见。

以上浏览器检查仅用于本地工程诊断，不作为小工具容器验收依据。

## 待验证（不阻塞 ZIP 交付）

按官方 SKILL.md 第 11 步，需在创服平台模拟器完成全流程验证，再分别 Android、iOS 真机扫码验证同一 ZIP。Huawei/HarmonyOS 和 iPad 实机也待验证，尤其本次音频修复；Chrome 61 CSS 兼容性未实测。当前产物通过静态门禁，不代表平台审核通过或全机型支持。

## 交付文件

- `release/深海较量-v1.0.0-上传候选.zip`：仅此游戏包用于小工具 ZIP 字段。
- `docs/branding/深海较量-正式图标.png`：图标字段独立选择。
- `release/深海较量-v1.0.0-推广素材.zip`：推广文案、六张演示截图及图标。
- `release/DepthChain-documents.zip`：开发与交付文档。
