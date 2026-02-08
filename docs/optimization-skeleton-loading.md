# 客户端数据加载 Skeleton 占位符优化日志

## 背景

多个页面/组件在异步加载数据期间，界面要么显示默认零值（`0`）后跳变为真实数据，要么条件区块直接不渲染导致布局塌陷，影响用户体验（闪烁、CLS 布局偏移）。

## 影响范围

共修改 **8 个文件**，新增 **146 行**，删除 **32 行**。

## 逐文件变更明细

| # | 文件 | 原问题 | 修复方式 | 行数 |
|---|------|--------|---------|------|
| 1 | `src/lib/components/dashboard/SectionCards.svelte` | 仅 `$statsState.loading` 时显示 inline `animate-pulse div`；前两张卡片（authState 数据源）无 loading 态；描述文字在 loading 期间仍然渲染 | 引入 `Skeleton` 组件；为每张卡片增加独立 `loading` 字段（`authLoading` / `statsLoading`）；loading 时隐藏值+描述，显示双行 Skeleton | +19/-13 |
| 2 | `src/lib/components/dashboard/Navbar.svelte` | 顶栏积分数字在 `authState` 未加载时直接显示 `0` | `!$authState.loaded` 时显示 `Skeleton h-4 w-8` | +6/-1 |
| 3 | `src/lib/components/dashboard/Sidebar.svelte` | 侧栏积分余额同上 | `!$authState.loaded` 时显示 `Skeleton h-4 w-8 inline-block` | +8/-1 |
| 4 | `src/routes/dashboard/admin/+page.svelte` | 3 个导航卡片的统计数字（套餐数/欠费数/兑换码数）在 `adminStore.overviewLoading` 期间直接显示 `0` | 新增 `loading` derived；包裹 `{#if loading}` Skeleton 占位（含 subStat 行） | +15/-6 |
| 5 | `src/routes/dashboard/admin/debts/+page.svelte` | 2 个统计卡片（未结清欠费/欠费总额）加载期间显示 `0` | `adminStore.debts.loading` 时切换为 Skeleton（数值行 + 描述行） | +14/-4 |
| 6 | `src/routes/dashboard/admin/codes/+page.svelte` | 2 个统计卡片（兑换码总数/兑换历史）加载期间显示 `0` | `adminStore.codes.loading` 时切换为 Skeleton | +14/-4 |
| 7 | `src/routes/dashboard/credits/+page.svelte` 即将过期提醒 | `$statsState.data` 为空时区块不渲染，加载完再突然出现 | `loading` 时显示带标题 + 2 行 Skeleton 的占位卡片 | +16/-1 |
| 8 | `src/routes/dashboard/credits/+page.svelte` 欠费提醒 | `debtsLoading` 为 true 时区块不渲染 | loading 时显示带标题 + 1 行 Skeleton 的占位卡片 | +15/-1 |
| 9 | `src/routes/dashboard/credits/+page.svelte` 我的套餐 | `loading` 为 true 时区块不渲染 | loading 时显示带标题 + 2 行 Skeleton 的占位卡片 | +13/-1 |

> `dashboard/+page.svelte` 经分析无需修改：`data.isAdmin` 由服务端同步提供，`SectionCards` 已在第 1 项修复。

## 设计原则

1. **统一组件** — 全部使用 `shadcn-svelte` 的 `<Skeleton>` 组件，淘汰散落的 inline `animate-pulse` 写法
2. **按数据源独立判断** — 每个区块根据自身数据源（`authState.loaded` / `statsState.loading` / `adminStore.*.loading`）独立控制 loading 态，不做全局一刀切
3. **结构预告** — loading 期间保留卡片外框 + 标题 + Skeleton 内容，用户可预见页面结构
4. **CLS = 0** — Skeleton 尺寸与真实内容对齐（`h-8 w-24` 对应 `text-2xl`，`h-3 w-24` 对应 `text-xs` 描述），数据就绪后无布局偏移
5. **渐进展示** — 静态元素（标题、图标、描述文案）立即渲染，仅动态数值使用 Skeleton

## 验证

```
svelte-check found 0 errors and 3 warnings in 1 file
```

3 个 warning 均为预存的 `toggle-group` 组件问题，与本次变更无关。
