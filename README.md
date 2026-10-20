# 深海较量 · Deep Sea Hunt

<p align="center"><img src="docs/branding/深海较量-正式图标.png" width="140" alt="深海较量正式图标"></p>
<p align="center"><strong>驾驶舰船投下水雷，对抗敌方潜艇</strong><br>经典炸潜艇玩法 · 原创离线 Canvas H5 · 小红书小工具</p>
<p align="center"><a href="#快速开始">快速开始</a> · <a href="CHANGELOG.md">更新日志</a> · <a href="CONTRIBUTING.md">开发指南</a> · <a href="docs/release/v1.0.0.md">1.0.0 发布记录</a></p>

## 当前版本

**1.0.0 · 官方审核已通过。** 审核状态由项目所有者于 2026-10-12 确认。本仓库保存源码、锁定依赖、设计、测试、原创素材和发布文件；正式基线为 Git 标签 `v1.0.0`。

这是对经典炸潜艇玩法的原创实现。小红书小工具与普通浏览器共用一套逻辑，无后端、无账号系统、无运行时网络依赖。审核通过与全机型实测是两件事，已测范围见[兼容性记录](docs/09_手机兼容性验证.md)。公开挂载笔记地址尚未登记。

## 游戏画面

<p align="center"><img src="docs/previews/promo-02-combat.png" width="260" alt="后期战斗演示"> <img src="docs/previews/promo-03-chain.png" width="260" alt="连锁爆炸演示"></p>
<p align="center"><em>本作实际渲染画面；战斗组合、连爆场景和示例分数为演示。</em></p>

## 1.0.0 有什么

| 体验 | 内容 |
| --- | --- |
| 十波海战 | 五类潜艇；直线、追踪和多枚齐射鱼雷；双艇、三艇及不同紧密度的相遇场景 |
| 投弹与连爆 | 水中同时最多三颗水雷；命中或落出战场后释放弹位；后期连爆影响范围逐步收紧 |
| 计分 | 潜艇类型分、水深加分、连爆倍率，以及完成波次后的投弹效率奖励 |
| 限时补给 | 第六波起可能掉落水雷加速、强化水雷和单次护盾，受时限、冷却及每波数量限制 |
| 水下表现 | 水雷晃动、潜艇尾迹、鱼雷推进水流与气泡、爆炸和舰船受击效果 |
| 音乐与音效 | 原创合成配乐，独立开关；音乐默认关闭，需手动开启 |
| 进度与成长 | 手动/自动存档、继续游戏、最近60局成绩曲线、十枚勋章、结算成绩卡 |
| 手机操作 | 多指触控、长按投弹、禁止按钮文字选中、安全区和低特效选项 |

存档位于本机、当前小工具的存储环境内，不提供跨设备云同步。分享、保存图片和评论草稿由玩家主动点击，并按客户端能力降级。

## 快速开始

开发环境使用 **Node.js 22 或更新版本**及 npm。运行游戏只需要浏览器；构建工具不进入正式包。仓库当前公开可读；公开可见不改变项目原有授权边界。

```sh
git clone https://github.com/zhuxian518/deep-sea-hunt.git
cd deep-sea-hunt
npm ci
npm run dev
```

访问 `http://127.0.0.1:4173`。开发预览包含诊断入口，只用于本地调试。

| 操作 | 手机 / 平板 | 电脑 |
| --- | --- | --- |
| 移动 | 按住左右按钮 | 方向键或 A / D |
| 投弹 | 按住投弹按钮 | 空格 |
| 暂停 | 暂停按钮 | P / Esc |

后五波练习访问 `/?practice=6`，最后三波访问 `/?practice=8`。练习局不写入正式存档、最高分、历史或勋章。

### 在手机上预览

运行 `npm run preview:lan`，手机与电脑连接同一局域网，访问 `http://电脑的局域网IP:4174`；电脑和服务需保持运行。该命令生成正式构建，去掉诊断入口。仅本机预览可运行 `npm run build`，再打开 `dist/index.html`。

两种预览服务共享 `dist/`，不要一边跑开发构建一边验收正式包。完成调试后重新生成正式构建。

## 验证与发布文件

```sh
npm test
npm run package
node scripts/verify-package.mjs
node .codex/skills/minitool-zip-builder/scripts/audit_artifact.mjs dist
python .codex/skills/minitool-zip-builder/scripts/audit_artifact.py release/深海较量-v1.0.0.zip
```

`npm run package` 构建、检查离线规则并生成下列文件。正式附件在[GitHub Releases](https://github.com/zhuxian518/deep-sea-hunt/releases/tag/v1.0.0)，可按附件用途下载。

| 文件 | 用途 |
| --- | --- |
| `release/深海较量-v1.0.0.zip` | 正式游戏包，仅包含四个运行资源 |
| `release/DepthChain-documents.zip` | 设计、开发、更新和验证文档 |
| `release/深海较量-v1.0.0-推广素材.zip` | 图标、截图和推广草稿，文案尚待定稿 |
| `release/SHA256SUMS.txt` | 本次生成的发布附件校验值 |
| `docs/branding/深海较量-正式图标.png` | 平台独立图标字段，另附于 Release |

`DepthChain-preview.zip`、`深海较量-v1.0.0-上传候选.zip` 为历史工具兼容别名，内容与正式游戏包相同，不重复上传为新版本。游戏 ZIP 根目录仅有 `index.html`、`app.js`、`style.css`、`icon.svg`。文档包、推广包不是游戏执行包。构建产物不提交源码分支，通过 Release 附件归档。

## 工程结构

```text
src/
  app/          页面、流程和生命周期
  core/         固定60Hz模拟、随机数、时钟与存档快照
  systems/      碰撞、计分、成长记录
  config/       波次、平衡参数与作者配置
  render/       Canvas绘制与表现效果
  input/        键盘、多指触控及兼容降级
  audio/        原创配乐与音效合成
  platform/     存储、分享及反馈适配
  css/          页面与跨端样式
tests/          单元测试、场景与浏览器验证脚本
scripts/        构建、预览、打包、检查和数值探针
docs/           设计、实施记录、测试、素材和发布文档
.github/        Issue与PR模板
.codex/skills/  官方小工具打包Skill及审计脚本
```

核心模拟可确定性回放；渲染不能改变碰撞、连爆或得分。数值修改集中在 `src/config`，存档恢复必须保留随机状态、实体和连爆关系。更多约定见[开发指南](CONTRIBUTING.md)与[项目维护规则](AGENTS.md)。

## 文档导航

| 文档 | 说明 |
| --- | --- |
| [更新日志](CHANGELOG.md) | 对玩家有影响的版本变更 |
| [开发指南](CONTRIBUTING.md) | 环境、修改入口、测试和分支约定 |
| [当前架构导航](docs/ARCHITECTURE.md) | 实际模块、模拟/渲染边界、存储和交付 |
| [发布流程](docs/release/RELEASING.md) | 版本冻结、验证、归档、升级与回退 |
| [1.0.0 发布记录](docs/release/v1.0.0.md) | 审核来源、正式范围和验证结果 |
| [版本内容清单](docs/release/v1.0.0-manifest.json) | 正式运行文件的SHA-256，用于比对冻结内容 |
| [文档索引](docs/README.md) | 当前事实、历史规划和参考资料的分层入口 |
| [十波与体验设计](docs/06_十波扩展与体验增强.md) / [存档与成长](docs/07_存档勋章与首版补充.md) | 产品设计 |
| [最新难度方案](docs/plans/2026-10-12-supplies-and-three-mines.md) | 三弹位、限时补给和连爆范围 |
| [手机兼容性](docs/09_手机兼容性验证.md) | 已测与待测环境 |
| [素材登记](docs/assets-register.md) / [安全说明](SECURITY.md) | 来源、权限与问题报告 |

## 维护与授权

[zhuxian518/deep-sea-hunt](https://github.com/zhuxian518/deep-sea-hunt) 当前为公开仓库，未授予开源许可；公开可见不等于可自由复制分发或商业复用。游戏画面、音乐、音效由本项目绘制或合成，未使用原作图片、音乐或代码；正式图标的生成来源见[品牌素材说明](docs/branding/README.md)。开发依赖及随附 Skill 遵循各自许可声明。

`main` 用于稳定集成，后续修改使用 `codex/` 功能分支。`v1.0.0` 固定，不随以后提交移动。GitHub Actions 配置以[模板](docs/release/validate-workflow.example.yml)保存，尚未启用，不显示虚假的CI通过徽章。
