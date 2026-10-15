# dsh-skin-QWEN · 千问花语 QWEN Blossom

**中文** | [English README](README.en.md)

DeepSeek Harness Web GUI 的双主题古风皮肤。纯展示层客户端插件：`apply()` 只做 body 作用域属性、背景画布层与状态投影，不注入服务、不发出 Cordis 事件、不触达模型请求；卸载即精确还原。

- **Light 模式**：《Dreamy Blue QWEN Blossom Portrait》—— 淡蓝宣纸、花枝与汉服人物。
- **Dark 模式**：《Moonlit Pavilion Dreamscape》—— 月夜亭台、靛蓝金灯。
- 主题切换**跟随 DSH 原生暗色属性** `body[data-ds-dark-theme]`，两层画作纯 CSS 交叉淡化（200ms），无 JS 主题监听、不自造开关。

## 特性

- 双主题令牌体系：宣纸蓝（light）/ 靛夜金（dark）各一套 `--qwen-*` 设计令牌，并全量覆盖宿主 `--dsw-*` 令牌（带 `!important` 对抗内联压制）；正文对比度按 ≥4.5:1 选色（light `#23306b`、dark `#eef2ff`）。
- 古风边框：回纹角花（内联 SVG，靛外线 + 金内线 + 中心菱花）贴 composer 卡、终端卡与模态对话框四角；靛金双线框（`border` + `inset box-shadow`）统一面板与浮层。
- 面板衬底：侧栏 / 会话顶栏 / details 栏 / goal·todo·queue dock 卡半透明宣纸（light）或夜帷（dark）衬底，保证按钮与文字清晰；会话区全透明让画作透出。
- 会话活跃降透明：进入活跃会话（`[data-phase='active'] [data-chat-flow]` 投影为 `body[data-qwen-chat-active]`）时背景画作降至 55% 不透明度，阅读区更安静。
- 输入性能红线：mutation 投影观察器过滤 `[data-input-backdrop]` 幽灵文本节点（rc8 每按键重建），不拖慢输入。
- 层叠契约：皮肤不抬升浮层 z-index（宿主契约 menu 100 / modal 1000 / portal 1100）；设置弹窗打开期间释放侧栏层叠上下文；`prefers-reduced-motion` 下关闭背景过渡。

## 安装

本包为本地包（`@dsh-external/dsh-client-ui-skin-qwen-blossom`），用**绝对路径**安装到目标 profile（裸目录名会被当 npm 包名 404）：

```sh
dsh plugin --profile web add C:/Users/shxvx/.dsh/skin-src/dsh-skin-QWEN
```

与其他皮肤互斥：安装前先停用当前启用的皮肤（home 层 managed block 见 `~/.dsh/cordis.patch.yml`，或使用 dsh-deep-whale 的 `stage-mutual-exclusion.mjs` 脚本），安装后重启 DSH 服务器生效。皮肤清单：`skin.json`（id `qwen-blossom`，bodyAttr `data-dsh-qwen-blossom`，`wiring.id` 为 `ui-skin-qwen-blossom`，order 30，`dshCompatibility: 0.1.5rc1`）。

加载即生效、卸载即复原：effect 销毁器断开观察器、按留存原值精确还原 CSS 变量与 body 属性、移除背景层，热切换不留残。

## 开发与构建

```sh
cd skin-src/dsh-skin-QWEN
npm run embed-art   # 仅在 assets/*.webp 变更后执行：webp → base64 → src/client/art.ts
npm run build       # tsdown 构建 lib/ + 刷新 skin.build.json 指纹
npm test            # vitest（jsdom）：apply/dispose 生命周期 + 样式表契约/红线
```

> 注：`npm run build` 的指纹步骤调用同级目录的 `../dsh-deep-whale/scripts/write-skin-build.mjs`（需要本包旁有 [Small-tailqwq/dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) 克隆）。没有它时用 `npx tsdown` 只重建 `lib/`（`skin.build.json` 指纹保持旧值，发布变更前需用该脚本刷新）。

- `src/client/index.ts`：浏览器半边（背景层挂载、状态投影、MutationObserver）。
- `src/client/qwen-blossom.module.css`：全部皮肤样式（11 个分区，元素/属性选择器，无 `:global` 需求）。
- `src/index.ts`：node 半边空 apply。
- `tests/apply.spec.ts`：body 属性/backdrop/CSS 变量的装载与精确还原、激活循环幂等、活跃会话投影、幽灵文本过滤、观察器断开。
- `tests/css-contract.spec.ts`：light/dark 令牌块契约、纯 CSS 交叉淡化、宿主令牌 `!important` 覆盖，以及仓库红线（无 `#root`、z-index < 1000、无 body 级 `:has`、无 2^31 魔法数、无远程运行时资产）。
- 构建管道与目录骨架对齐 [Small-tailqwq/dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) 的 orca-link 参考架构（本地参考克隆，未复制其皮肤代码/素材）。

## 素材来源与许可

代码采用 **MIT**（Copyright (c) 2026 shxvx）；两幅背景画作（Light《Dreamy Blue QWEN Blossom Portrait》、Dark《Moonlit Pavilion Dreamscape》）为用户提供的 AI 生成图，**不在 MIT 范围内**，版权归相应权利人保留，内嵌于 `src/client/art.ts`、`lib/client.js`、`assets/`、`preview/` 的副本同受此约束。详见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。
