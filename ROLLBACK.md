# 背景插件版本回滚

插件目录 `plugins/backdrop-lead/` 被 profile 直接链接，改坏了会在下次启动时生效。
用 `tools/backdrop-versions.cjs` 保留最近的版本，随时回滚。

## 保留策略

- 快照存放在 `plugins/.versions/backdrop-lead/<版本号>-<时间>-<标签>/`
- **最多保留 3 份**（更旧的自动删除）
- 每份都包含 `package.json`、`cordis.patch.yml`、`index.js`、`client.js` 与 `meta.json`（含校验摘要）

## 版本号规则

**每次迭代 +0.01**（按十进制读：`0.1.0` 是 0.10）：

```
0.1.0 → 0.1.1 → 0.1.2 → … → 0.1.9 → 0.2.0 → … → 0.9.9 → 1.0.0
```

用一条命令同时完成「加版本号 + 存快照」：

```powershell
node tools\backdrop-versions.cjs bump            # 0.1.0 → 0.1.1，并自动快照
node tools\backdrop-versions.cjs bump --dry-run  # 只看下一个版本号，不写文件
```

## 常用命令

```powershell
# 改动前：先存一份当前可用的状态
node tools\backdrop-versions.cjs snapshot before-xxx

# 查看有哪些版本（最新的排第一）
node tools\backdrop-versions.cjs list

# 回滚到第 2 新的版本（或直接给标签/目录名）
node tools\backdrop-versions.cjs rollback 2

# 手动裁剪，只留最新 2 份
node tools\backdrop-versions.cjs prune 2
```

回滚前会把**当前状态**自动存成 `pre-rollback-<时间>`，所以回滚本身也能撤销。
回滚或快照后需要**重启 DSH Desktop**（或刷新页面）才会生效。

## 建议节奏

1. 确认当前版本可用 → `snapshot stable-<日期>`
2. 做改动 → 出问题就 `rollback 1`（回到上一步）或 `rollback 2`
3. 稳定后 → `snapshot stable-<日期>`
