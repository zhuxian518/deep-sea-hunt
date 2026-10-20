# 当前架构导航 · v1.0.0

本页对应仓库实际模块，补充[原始技术设计](../WinDepth_Technical_Design.md)的历史背景。规则和参数以`src/config`及[最新三弹位/补给方案](plans/2026-10-12-supplies-and-three-mines.md)为准，不能用旧设计覆盖现状。

## 模块与数据流

| 模块 | 实际入口 | 职责 |
| --- | --- | --- |
| 启动与页面 | `src/main.js`、`src/app/AppController.js` | 启动、首页/教程/游玩/暂停/结算、生命周期、HUD及存档协调 |
| 模拟 | `src/core/Simulation.js`、`Clock.js`、`Random.js` | 固定60Hz、种子、实体推进与事件；时钟处理过载和暂停 |
| 规则 | `src/systems/Collision.js`、`Scoring.js`、`Progress.js` | 碰撞/连爆、得分、成长与勋章 |
| 配置 | `src/config/game-balance.json`、`waves.json`、`author.json` | 世界、三弹位、波次/艇型/补给和作者信息 |
| 表现 | `src/render/CanvasRenderer.js`、`geometry.js`、`src/css/main.css` | 海景、舰船/潜艇/武器、粒子、页面与触屏布局 |
| 输入 | `src/input/InputAdapter.js` | 键盘、多指、长按、失焦与取消处理 |
| 声音 | `src/audio/AudioMixer.js`、`MusicScore.js` | 原创合成音效/配乐、手势解锁和暂停 |
| 平台 | `src/platform/StorageAdapter.js`、`ShareAdapter.js`、`FeedbackAdapter.js` | 原生/浏览器存储、主动分享/相册和反馈草稿 |

输入由AppController交给模拟；模拟推进规则并产生结果/事件，Canvas读取状态，声音消费事件。渲染帧率、粒子和美术不能改变碰撞或计分。数值修改集中配置，不在绘制代码中另写难度。

## 当前产品不变量

- 十波、五类潜艇；水中同时最多三颗水雷，命中或离场才释放弹位。
- 后五波综合考虑攻击、密度、连爆和补给，不能只增加敌人数判断难度。
- 核心相同版本/配置/种子/输入支持确定性回放；保存恢复需保留随机数、实体与连爆关系。
- 练习入口从后段波次开始，不覆盖正式checkpoint、最高分、正式累计统计或勋章；完成后仍以practice标记写入最近60局历史，历史页区分显示。
- 暂停/后台/操作取消需清理输入、重置时间基线；不因后台时间继续伤害或突然快进。

实际行为与历史目标的区别见[文档索引](README.md)和实施记录；不把策略机器人结果称为真人通过率。

## 存储和平台

`StorageAdapter`使用`depthchain-profile-v1`、schemaVersion 1，在同一档案保存纪录、设置、成长、历史及checkpoint。9.46+优先原生Storage，较低版本/浏览器走异常保护的本地存储；原生读取失败进入不可写状态，避免覆盖旧数据。原生首次读为空时尝试迁移浏览器旧档案。保存按队列串行执行，调用设超时并给玩家反馈；没有跨设备云同步。

分享、保存图片及评论草稿由玩家主动点击，调用前检查版本和方法。草稿路由成功不等于已发布评论。正文/图像和平台能力的具体降级以适配代码为准；普通浏览器不验证真实SDK。

## 构建与证据

源码为ES模块；`scripts/build.mjs`用esbuild输出经典IIFE，ES2017/Chrome61目标。开发构建`--dev`包含`window.depthchain`诊断入口，正式构建通过常量消除。正式包四个资源：`index.html`、`app.js`、`style.css`、`icon.svg`；HTML/CSS显式统一CRLF，以冻结清单核对跨系统字节。

`npm run dev`构建开发预览；`npm run preview:lan`生成局域网正式预览。两者共享`dist/`，切换后重新构建。`npm run package`生成游戏/文档/推广附件；`scripts/verify-package.mjs`比较冻结内容清单。详见[开发指南](../CONTRIBUTING.md)及[发布与回退](release/RELEASING.md)。

当前官方审核来源为所有者2026-10-12确认；旧测试结果见[1.0.0发布记录](release/v1.0.0.md)。本次只补文档与公开状态说明，没有重跑游戏、重新认证平台或改变冻结标签/附件；真实设备覆盖见[兼容性记录](09_手机兼容性验证.md)。
