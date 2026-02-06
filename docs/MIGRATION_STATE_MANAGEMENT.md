# 状态管理迁移指南

本文档提供从旧的分散式状态管理迁移到新的集中式状态管理的详细步骤。

## 概述

### 变更内容

从分散的 derived stores 迁移到封装的完整状态对象：

**旧方式**：
```typescript
import { currentUser, authLoaded, userStats, statsLoading } from '$lib/stores/auth';
```

**新方式**：
```typescript
import { authState, statsState } from '$lib/stores/auth';
```

### 为什么要迁移？

1. **更好的内聚性** - 相关状态封装在一起
2. **原子性更新** - 避免状态不一致
3. **更清晰的结构** - 状态层次更明确
4. **更易扩展** - 添加新字段更简单
5. **更好的类型安全** - TypeScript 类型更清晰

---

## 快速迁移检查清单

### ✅ 步骤 1: 更新 import 语句

在所有使用旧 API 的文件中：

```typescript
// ❌ 删除这些
import { currentUser, authLoaded, authLoading, userStats, statsLoading } from '$lib/stores/auth';

// ✅ 替换为这些
import { authState, statsState } from '$lib/stores/auth';
```

### ✅ 步骤 2: 更新状态访问

全局搜索替换（使用正则表达式）：

| 旧代码 | 新代码 |
|--------|--------|
| `$currentUser` | `$authState.user` |
| `$authLoaded` | `$authState.loaded` |
| `$authLoading` | `$authState.loading` |
| `$userStats` | `$statsState.data` |
| `$statsLoading` | `$statsState.loading` |

### ✅ 步骤 3: 更新函数调用

如果你的代码中有积分刷新逻辑：

```typescript
// ❌ 旧方式
import { refreshUserCredits } from '$lib/stores/auth';
await refreshUserCredits();

// ✅ 新方式 - 消费积分后
import { afterCreditsConsumed } from '$lib/stores/auth';
await afterCreditsConsumed();

// ✅ 新方式 - 获得积分后
import { afterCreditsEarned } from '$lib/stores/auth';
await afterCreditsEarned();
```

### ✅ 步骤 4: 运行测试

```bash
# 类型检查
npm run check

# 如果有单元测试
npm test

# 手动测试关键功能
# - 登录/登出
# - Dashboard 数据加载
# - 积分消费（Chat）
# - 积分兑换（Credits）
```

---

## 详细迁移步骤

### 1. 组件迁移

#### 示例 1: 简单的状态访问

**旧代码**：
```svelte
<script lang="ts">
  import { currentUser } from '$lib/stores/auth';
</script>

<div>积分: {$currentUser?.credits ?? 0}</div>
```

**新代码**：
```svelte
<script lang="ts">
  import { authState } from '$lib/stores/auth';
</script>

<div>积分: {$authState.user?.credits ?? 0}</div>
```

#### 示例 2: 条件渲染

**旧代码**：
```svelte
<script lang="ts">
  import { authLoaded, currentUser } from '$lib/stores/auth';
</script>

{#if $authLoaded}
  {#if $currentUser}
    <div>欢迎, {$currentUser.name}</div>
  {:else}
    <div>请登录</div>
  {/if}
{:else}
  <div>加载中...</div>
{/if}
```

**新代码**：
```svelte
<script lang="ts">
  import { authState } from '$lib/stores/auth';
</script>

{#if $authState.loaded}
  {#if $authState.user}
    <div>欢迎, {$authState.user.name}</div>
  {:else}
    <div>请登录</div>
  {/if}
{:else}
  <div>加载中...</div>
{/if}
```

#### 示例 3: 加载状态

**旧代码**：
```svelte
<script lang="ts">
  import { userStats, statsLoading } from '$lib/stores/auth';
</script>

{#if $statsLoading}
  <div>加载中...</div>
{:else}
  <div>总消费: {$userStats?.totalSpent ?? 0}</div>
{/if}
```

**新代码**：
```svelte
<script lang="ts">
  import { statsState } from '$lib/stores/auth';
</script>

{#if $statsState.loading}
  <div>加载中...</div>
{:else}
  <div>总消费: {$statsState.data?.totalSpent ?? 0}</div>
{/if}
```

#### 示例 4: 派生状态

**旧代码**：
```svelte
<script lang="ts">
  import { currentUser } from '$lib/stores/auth';

  const isLowBalance = $derived(($currentUser?.credits ?? 0) < 10);
</script>

{#if isLowBalance}
  <div>余额不足</div>
{/if}
```

**新代码**：
```svelte
<script lang="ts">
  import { authState } from '$lib/stores/auth';

  const isLowBalance = $derived(($authState.user?.credits ?? 0) < 10);
</script>

{#if isLowBalance}
  <div>余额不足</div>
{/if}
```

### 2. 函数调用迁移

#### 示例 1: Chat 页面（消费积分）

**旧代码**：
```typescript
import { currentUser } from '$lib/stores/auth';

async function handleSubmit() {
  await chat.sendMessage({ text: input });
  // 没有刷新积分
}
```

**新代码**：
```typescript
import { authState, afterCreditsConsumed } from '$lib/stores/auth';

async function handleSubmit() {
  await chat.sendMessage({ text: input });
  // 消费积分后立即刷新
  await afterCreditsConsumed();
}
```

#### 示例 2: Credits 页面（兑换积分）

**旧代码**：
```typescript
import { refreshUserCredits } from '$lib/stores/auth';

async function handleRedeem() {
  const res = await fetch('/api/user/credits/redeem', { ... });
  if (res.ok) {
    await refreshUserCredits();
    // 需要手动刷新统计数据
    await loadStats();
  }
}
```

**新代码**：
```typescript
import { afterCreditsEarned } from '$lib/stores/auth';

async function handleRedeem() {
  const res = await fetch('/api/user/credits/redeem', { ... });
  if (res.ok) {
    // 自动刷新余额和统计数据
    await afterCreditsEarned();
  }
}
```

### 3. 非组件代码迁移

#### 示例: 在普通 TypeScript 文件中访问状态

**旧代码**：
```typescript
import { get } from 'svelte/store';
import { currentUser } from '$lib/stores/auth';

function someFunction() {
  const user = get(currentUser);
  if (user) {
    console.log(user.credits);
  }
}
```

**新代码**：
```typescript
import { get } from 'svelte/store';
import { authState } from '$lib/stores/auth';

function someFunction() {
  const state = get(authState);
  if (state.user) {
    console.log(state.user.credits);
  }
}
```

---

## 常见问题

### Q1: 我需要更新所有文件吗？

**A**: 是的，所有使用旧 API 的文件都需要更新。但是迁移很简单，主要是查找替换。

### Q2: 迁移会破坏现有功能吗？

**A**: 不会，只要按照迁移指南正确更新，所有功能都会正常工作。建议先在开发环境测试。

### Q3: 可以逐步迁移吗？

**A**: 不可以，因为旧的 API 已经被移除。需要一次性完成迁移。

### Q4: 如何验证迁移是否成功？

**A**: 
1. 运行 `npm run check` 确保没有类型错误
2. 测试所有关键功能（登录、Dashboard、Chat、Credits）
3. 检查浏览器控制台是否有错误

### Q5: 迁移后性能会有影响吗？

**A**: 性能会更好！新的状态管理减少了不必要的 API 请求，提升了响应速度。

---

## 自动化迁移脚本

如果你有很多文件需要迁移，可以使用以下脚本：

```bash
#!/bin/bash

# 查找所有使用旧 API 的文件
echo "查找需要迁移的文件..."
grep -r "currentUser\|authLoaded\|authLoading\|userStats\|statsLoading" src/ --include="*.svelte" --include="*.ts" -l

# 提示用户确认
read -p "是否继续迁移？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# 执行替换（macOS 使用 sed -i ''，Linux 使用 sed -i）
echo "开始迁移..."

# 替换 import 语句
find src/ -type f \( -name "*.svelte" -o -name "*.ts" \) -exec sed -i '' \
  's/import { currentUser, authLoaded, userStats, statsLoading } from/import { authState, statsState } from/g' {} +

# 替换状态访问
find src/ -type f \( -name "*.svelte" -o -name "*.ts" \) -exec sed -i '' \
  's/\$currentUser/\$authState.user/g' {} +

find src/ -type f \( -name "*.svelte" -o -name "*.ts" \) -exec sed -i '' \
  's/\$authLoaded/\$authState.loaded/g' {} +

find src/ -type f \( -name "*.svelte" -o -name "*.ts" \) -exec sed -i '' \
  's/\$authLoading/\$authState.loading/g' {} +

find src/ -type f \( -name "*.svelte" -o -name "*.ts" \) -exec sed -i '' \
  's/\$userStats/\$statsState.data/g' {} +

find src/ -type f \( -name "*.svelte" -o -name "*.ts" \) -exec sed -i '' \
  's/\$statsLoading/\$statsState.loading/g' {} +

echo "迁移完成！"
echo "请运行 'npm run check' 验证迁移结果"
```

**注意**: 
- 这个脚本只处理简单的替换，复杂的情况需要手动处理
- 建议先备份代码或使用 Git
- 运行后需要手动检查和测试

---

## 迁移后的验证

### 1. 类型检查

```bash
npm run check
```

应该看到：
```
✅ svelte-check found 0 errors
```

### 2. 功能测试清单

- [ ] 用户登录
- [ ] Dashboard 页面加载
- [ ] 积分余额显示正确
- [ ] 统计数据显示正确
- [ ] Chat 发送消息后积分更新
- [ ] Credits 兑换后积分和统计更新
- [ ] 页面切换数据保持一致
- [ ] 用户登出

### 3. 性能验证

打开浏览器开发者工具 Network 标签：

- [ ] 首次进入 Dashboard 只有 2 个 API 请求
- [ ] 页面切换没有重复请求
- [ ] Chat 消费后只有 1 个刷新请求
- [ ] Credits 兑换后有 2 个并行请求

---

## 回滚方案

如果迁移后遇到问题，可以回滚到之前的版本：

```bash
# 1. 回滚代码
git revert <commit-hash>

# 2. 重新安装依赖（如果需要）
npm install

# 3. 重新构建
npm run build

# 4. 测试
npm run check
```

---

## 获取帮助

如果在迁移过程中遇到问题：

1. 查看 [状态管理文档](./STATE_MANAGEMENT.md)
2. 查看 [CHANGELOG](../CHANGELOG.md)
3. 检查浏览器控制台错误
4. 提交 Issue 或联系团队

---

## 总结

迁移到新的状态管理架构后，你将获得：

✅ 更好的代码组织
✅ 更少的 API 请求
✅ 更好的类型安全
✅ 更清晰的数据流
✅ 更好的用户体验

虽然需要一次性更新所有文件，但迁移过程很简单，而且带来的好处是长期的。

**祝迁移顺利！** 🎉
