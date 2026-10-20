# 深海较量：项目事实与维护约定

- 面向用户使用简体中文。游戏是原创离线 Canvas H5，小红书 Builder Hub 小工具与浏览器共用逻辑；不是鸿蒙原生应用或小红书小程序。
- 当前产品事实以 docs/06_十波扩展与体验增强.md、docs/07_存档勋章与首版补充.md 为准；后五波难度和三弹位最新以 docs/plans/2026-10-12-supplies-and-three-mines.md、src/config/game-balance.json 及 src/config/waves.json 为准；初始 PRD/TDD 保留研究规划背景。上传规则证据及缺项见 docs/08_小红书上传与推广调研.md、docs/release/上传规则取得记录.md；实测边界见 docs/09_手机兼容性验证.md。
- 数值集中 src/config。核心 Simulation 固定60Hz、可确定性回放，表现层不能改变碰撞/得分。存档恢复必须保留随机数、实体和连爆关系；练习局不能覆盖正式存档或纪录。
- 正式包必须经典IIFE/ES2017/Chrome61语法，无运行时依赖、外部URL、网络、剪贴板或站外导航。用户提供的作者URL仅开发预览/文档，正式包通过常量消除。
- 平台原生存储9.46+、评论草稿9.49+均需版本与方法检查；分享/评论由用户明确点击，不伪称已发布。已取得用户提供的官方 minitool-zip-builder 1.7.0 下载口令；用户于2026-10-12明确确认官方审核已通过，当前正式版本为1.0.0，事实与冻结内容见 docs/release/v1.0.0.md 和 v1.0.0-manifest.json。审核与静态校验均不能替代三类手机验收，不得宣称全机型支持。
- 验证：npm test；npm run package；node scripts/verify-package.mjs。浏览器脚本用开发构建诊断接口，结束恢复正式构建。按改动范围验证，不重复无关测试。
- 文档、截图及发布正文在 docs/promotion。构造的战斗场景和示例分数必须标注演示。release、dist为重建产物；node_modules、浏览器会话、凭据不入库。
- GitHub公开仓库 zhuxian518/deep-sea-hunt（2026-10-20核对；未改变授权）；main稳定集成，正式标签v1.0.0固定且不改指，候选标签保留历史。按 docs/release/RELEASING.md 升级；源码在Git、产物在GitHub Release归档。提供Actions模板，未授权workflow scope时不要改动账号授权。
