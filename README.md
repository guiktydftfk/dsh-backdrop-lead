# DSH 自定义背景插件

为 DSH Desktop 的 Web 界面添加本地图片背景，并可调节遮罩透明度与模糊度。

- 插件 ID：`@local/dsh-backdrop-lead`
- 当前版本：**0.1.3**
- 平台：`web`（桌面端渲染层）

## 功能

| 功能 | 说明 |
|---|---|
| 本地图片背景 | 选择本地图片，自动压缩到最长边 1920、JPEG 质量 0.82 后存浏览器本地 |
| 遮罩透明度 | 0–100%，控制底色盖住图片的程度（数值越大越暗/越不透明） |
| 模糊度 | 0–24px，用 canvas 预渲染，滑块实时生效、无卡顿 |
| 明暗主题 | 跟随 DSH 主题，深色/浅色都可读 |
| 实时反馈 | 设置里改动立即反映到桌面（无需重启） |
| 自检报告 | 设置 → 背景 → 导出「自检报告」，一键拿到当前渲染状态，便于反馈问题 |

## 安装

本插件为本地包（非 npm 发布），安装方式是把目录链接进 DSH profile：

1. 把本目录放到一个固定位置，例如 `D:\plugins\dsh-backdrop-lead`
2. 编辑 profile 的 `package.json`（Windows 默认在 `%USERPROFILE%\.dsh-beta\profiles\desktop\package.json`）：
   - `dependencies` 加：`"@local/dsh-backdrop-lead": "link:D:/plugins/dsh-backdrop-lead"`
   - `dsh.bundles` 数组加：`"@local/dsh-backdrop-lead"`
3. **重启 DSH Desktop**（客户端包在启动时扫描，改完必须重启）

> 注意：`package.json` 必须保留 `exports` 里的 `"./package.json"` 一项，否则客户端模块扫描会跳过整个包。

## 使用

1. 打开 **设置 → 背景**
2. 点「选择图片」上传本地图片
3. 拖动「遮罩」和「模糊」滑块调整效果
4. 「移除」清空图片，「重置」恢复默认（遮罩 35%、模糊 0）

## 自检报告

设置 → 背景 → 展开诊断区 → 点 **「导出自检报告」**，会生成一段可复制的文本，包含：

- 插件 ID、图片大小、遮罩/模糊值、上次上传结果
- 背景层是否挂载、尺寸、z-index、实际背景值
- 被清理的表面数量（`measured` / `sidebar` / `strip` / `bars`）
- `html` / `body` / `#root` / 宿主的计算样式
- 覆盖大面积的元素清单（含类名、尺寸、坐标）

遇到显示异常时，先导出这份报告再反馈，定位最快。

## 版本回滚

见同目录 `ROLLBACK.md`（配合 `tools/backdrop-versions.cjs` 使用）：

```powershell
node tools\backdrop-versions.cjs list        # 查看快照
node tools\backdrop-versions.cjs rollback 1  # 回到上一版
```

快照最多保留 3 份；回滚前会自动把当前状态存为 `pre-rollback`，回滚本身也可撤销。

## 原理简述

- 图片以 `background-image` 画在应用外壳（宿主元素）和 `html`/`body` 上，保证任何容器被清透明后都能看到图画，且不可能被内容盖住
- 清理策略逐步演进：按类名 → 按面积测量 → 侧边栏定向 → 长条 → 贴底渐变条 → 侧边栏底部几何带
- 保护规则：对话框（`role="dialog"`/浮层祖先）、设置内容（`[data-slot="settings.section"]`）、交互行（`button`）一律不动
- 弹窗出现时会**自动还原**误清元素（自愈）

## 版本记录

| 版本 | 变更 |
|---|---|
| 0.1.3 | 侧边栏底部按几何清扫；伪元素 `::after` 一并清理；交互行保护 |
| 0.1.2 | 识别并清除贴底渐变条（输入框上方渐隐层） |
| 0.1.1 | 自检新增 `strip` 计数 |
| 0.1.0 | 基线：宿主+整视口绘制、测量式清理、侧边栏清扫、自检报告 |

## 许可协议

本项目支持 **CC BY-NC 4.0** 协议（Creative Commons Attribution-NonCommercial 4.0 International，署名—非商业性使用 4.0 国际）。

- 允许：复制、分发、修改，用于非商业用途
- 要求：署名（保留本项目名称与出处）
- 禁止：商业性使用

协议全文见 <https://creativecommons.org/licenses/by-nc/4.0/>


## 免责

本地个人使用插件，未经发布审核。修改 profile 前建议先备份 `package.json`。
