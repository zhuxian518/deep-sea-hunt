# 深海猎杀

**瞄准潜艇，投弹连爆。** 致敬经典炸潜艇玩法的原创离线街机小游戏。

当前版本包含十波关卡、五类潜艇、直线/追踪/齐射鱼雷、水深加分、每波投弹效率奖励、第六波起的限时补给、连锁爆炸、三条生命、教程、暂停、结算、每波战报、本机纪录、自动/手动存档、最近60局成绩曲线、十枚勋章、作者反馈、成绩卡和独立音乐/音效开关。移动端左右按钮移动、按住中间投弹；电脑方向键 / A、D 移动，空格投弹，P / Esc 暂停。

前五波无道具。后期击沉有机会掉落上浮补给，开船接住后获得加速8秒、强化8秒或护盾6秒；暂停不消耗时限。同种重复领取刷新时长。原创背景音乐为76.8秒分段循环，后期增加节奏层次。音乐默认关闭，点击顶部“音乐关”开启，进入战斗后播放。

## 试玩

```sh
npm install
npm run dev
```

打开 <http://127.0.0.1:4173>。开发预览会生成 `dist/` 并暴露仅本地测试使用的诊断入口；正式构建会移除该入口。

也可执行 `npm run build` 后直接打开 `dist/index.html`。不需要后端、账户、联网资源或外部字体。

手机浏览器试玩：电脑运行 `npm run preview:lan`，手机与电脑连接同一个Wi-Fi，在手机浏览器访问 `http://电脑的局域网IP:4174`。此入口提供正式构建，不暴露开发诊断对象；试玩期间电脑与服务需保持运行。IP可在Windows网络设置中查看；若Windows询问是否允许Node.js通过防火墙，允许专用网络。浏览器试玩不等于小红书容器真机适配已通过。

后五波练习：地址后加 `?practice=6`，从第六波开始，不覆盖正式存档、纪录或勋章。正式局在暂停页可手动保存，或等待自动保存；同一设备重新打开后从首页继续。记录保存在本机，不跨设备同步。

## 检查与打包

```sh
npm test
npm run package
```

- `release/DepthChain-preview.zip`：纯离线游戏预览包，解压后直接打开根目录 `index.html`。
- `release/DepthChain-documents.zip`：PRD、技术设计、考据、实施补充、名称文案、素材登记与测试记录；保留 `docs/` 相对路径。
- `npm run validate`：检查入口、文件类型、外链/禁用能力、经典脚本、打包体积。

浏览器检查使用 Playwright CLI，启动开发预览后执行：

```sh
npx --yes --package @playwright/cli playwright-cli -s=depthchain open http://127.0.0.1:4173 --browser chrome
npx --yes --package @playwright/cli playwright-cli -s=depthchain run-code --filename=tests/browser-smoke.cjs
```

浏览器检查使用独立自动化浏览器，在开发入口中构造固定测试场景，不连接真实小红书账号。截图在 `output/playwright/`，关键预览副本在 `docs/previews/`。

## 文档

- [存档、勋章、反馈和音乐补充](docs/07_存档勋章与首版补充.md)
- [小红书规则与推广调研](docs/08_小红书上传与推广调研.md)
- [手机兼容性验证](docs/09_手机兼容性验证.md)
- [推广长文图文](docs/promotion/深海猎杀_长文图文.html)
- [小红书发布稿](docs/promotion/深海猎杀_小红书发布稿.md)
- [首版交付说明](docs/10_首版交付说明.md)

- [PRD](WinDepth_PRD.md)
- [技术设计](WinDepth_Technical_Design.md)
- [原作考据、证据和待核验清单](docs/03_原作考证_来源及待核验清单.md)
- [实施计划与设计补充](docs/04_实施计划与设计补充.md)
- [名称与界面文案](docs/05_名称与界面文案.md)
- [十波、计分、补给与体验增强](docs/06_十波扩展与体验增强.md)
- [素材来源登记](docs/assets-register.md)
- [测试报告](docs/test-reports/2026-10-12.md)
- [本轮增强测试报告](docs/test-reports/2026-10-12-enhancements.md)

## 交付边界

这是可试玩的十波扩展版，不是原作全部20关的高保真复制。运行数值为原创设计初值，当前增量以06/07号文档为准；历史精确规则仍待原版程序测量。全部画面、音乐与音效由本项目绘制/合成，没有使用原作图片、音乐或代码。

小红书原生存储、分享及保存按当前官方公开契约实现，浏览器替身测试通过不等于小红书实机通过。正式提交还需要上传页当时的完整改写口令，以及 iOS / Android 容器联调和体验验收。当前不作审核通过或设备帧率承诺。

## 工程结构

`src/core` 为纯逻辑固定60Hz模拟；`src/systems` 处理碰撞与计分；`src/render` 为只读渲染与有界表现对象；`src/input` 支持键盘和多指输入；`src/platform` 隔离存储与主动分享；`src/app` 管理页面和生命周期。`src/config` 集中保存原创数值和十波表。

## 升级管理

源码与文档维护于私有仓库 https://github.com/zhuxian518/deep-sea-hunt 。main 为稳定集成分支，变更建议开功能分支提交PR；本机脚本执行单测、构建和离线规则检查；docs/release/validate-workflow.example.yml 提供可启用的GitHub Actions模板。候选版本标签不代表平台审核通过。release目录为可重复构建产物，本机打包即可恢复，不提交node_modules或浏览器会话文件。
