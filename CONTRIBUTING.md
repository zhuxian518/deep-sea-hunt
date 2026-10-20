# 开发与维护指南

本项目现为公开仓库，但没有授予开源许可；查阅、提出问题与获得代码/素材复用授权是不同事项。开始前阅读 [AGENTS.md](AGENTS.md)、[README](README.md) 、[架构导航](docs/ARCHITECTURE.md) 和 [文档索引](docs/README.md)。

## 环境与日常操作

- Node.js 22+、npm、Git；用 `npm ci` 按 `package-lock.json` 安装依赖。
- `npm run dev`：本地开发预览，端口4173，包含仅开发构建提供的诊断接口。
- `npm run preview:lan`：局域网正式预览，端口4174，手机与电脑需在同一网络。
- `npm test`：Node 单元测试；`npm run package`：正式构建、离线规则检查和打包。
- `node scripts/verify-package.mjs`：ZIP资源、别名、推广图和冻结版本清单检查。

开发和正式预览共用 `dist/`，切换场景要重新构建。不要提交 `node_modules/`、`dist/`、`release/`、浏览器会话、凭据或临时截图。

## 从哪里修改

| 改动 | 入口 | 需要注意 |
| --- | --- | --- |
| 难度、速度、攻击、补给 | `src/config/game-balance.json`、`waves.json` | 综合考虑艇型、攻击压力、数量、密度、道具和连爆，不能只看数量 |
| 碰撞与连爆 | `src/core/Simulation.js`、`src/systems/Collision.js` | 固定步长、相同输入与种子得到相同结果 |
| 得分 | `src/systems/Scoring.js` | 完成波次才结算效率奖励，练习局保持隔离 |
| 存档 | `src/core/Checkpoint.js`、`src/platform/StorageAdapter.js` | 保留随机数、实体、连爆关系，兼容旧存档并容忍失效 |
| 画面与动效 | `src/render/CanvasRenderer.js` | 渲染只读模拟状态；碰撞半径与表现一致；对象数量有界 |
| 音乐与音效 | `src/audio/` | 用户手势解锁、生命周期暂停、静音与失败降级 |
| 触控与布局 | `src/input/`、`src/css/main.css` | 多指、长按无选中、按钮命中区、横竖屏、安全区与旧WebView |
| 页面与生命周期 | `src/app/AppController.js` | 后台暂停、恢复准备状态，不突增模拟时间 |
| 分享与反馈 | `src/platform/` | 检查SDK、版本与方法；用户点击后调用，不将打开草稿说成已发布 |

## 核心约束

1. 正式包纯离线，无后端、外部资源、联网、剪贴板或站外导航；作者链接只用于开发预览与文档。
2. 源码可用 ES 模块，交付必须编译成经典 IIFE、ES2017 / Chrome61 兼容语法，不携带诊断对象。
3. Storage 9.46+、评论草稿9.49+需版本和能力检测；失败时可降级，不破坏游戏。
4. 练习局不覆盖正式checkpoint、最佳成绩、正式累计统计或勋章；完成练习可带practice标记进入历史。
5. 修改存档结构先设计迁移，不直接清除玩家记录；游戏版本号与存档 schema 不是同一个概念。
6. 原始PRD/TDD是规划背景，当前产品事实以文档索引指定的实施记录与实际配置为准。

## 分支与提交

从 `main` 创建 `codex/简短功能名` 分支。提交说明使用 `feat:`、`fix:`、`balance:`、`docs:` 或 `chore:` 等前缀，说明结果和原因。

合入前说明改了什么、为什么、怎样验证、是否影响存档与正式包。使用仓库 PR 模板；版本范围变了就同步改描述，不把已经放弃的方案当最终实现。

## 测试选择

与改动范围相称地验证，不为纯文案或文档反复跑游戏场景。涉及正式游戏变更，至少执行 `npm test`、`npm run package` 和 ZIP 验证；补充对应浏览器或设备检查。

浏览器检查示例（先启动开发预览）：

```sh
npx --yes --package @playwright/cli playwright-cli -s=depthchain open http://127.0.0.1:4173 --browser chrome
npx --yes --package @playwright/cli playwright-cli -s=depthchain run-code --filename=tests/browser-smoke.cjs
```

浏览器场景通过开发诊断接口构造；它们不能代替小红书容器和物理设备。结束后恢复正式构建。数值探针用于比较策略，不将模拟存活率包装成人类通关率。

## 升级交付

更新 [CHANGELOG](CHANGELOG.md) 中的 Unreleased，按 [发布流程](docs/release/RELEASING.md) 更新版本、验证、记录内容清单和附件。已发布标签不改指，已发布附件不以不同内容悄悄覆盖。

本地自动检查可执行；GitHub Actions 仍是 `docs/release/validate-workflow.example.yml` 模板，当前没有启用CI。不要为启用模板擅自扩大账号授权。
