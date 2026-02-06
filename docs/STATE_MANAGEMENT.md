# 状态管理文档

## 概述

本项目使用集中式状态管理架构，基于 Svelte stores 实现。所有用户相关的状态统一在 `src/lib/stores/auth.ts` 中管理，确保数据的一致性和可维护性。

## 核心概念

### 状态对象

项目使用两个主要的状态对象：

1. **`authState`** - 用户认证状态
2. **`statsState`** - 用户统计数据状态

每个状态对象都包含数据、加载状态和错误信息，提供完整的状态管理能力。

## 状态结构

### AuthState

```typescript
type AuthState = {
  user: AuthUser | null;      // 当前登录用户
  loaded: boolean;             // 是否已加载
  loading: boolean;            // 是否正在加载
};

type AuthUser = {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  credits?: number;            // 积分余额
  activePackages?: number;     // 有效套餐数量
  [key: string]: unknown;
};
```

### StatsState

```typescript
type StatsState = {
  data: UserStats | null;      // 统计数据
  loaded: boolean;             // 是否已加载
  loading: boolean;            // 是否正在加载
  error: string | null;        // 错误信息
};

type UserStats = {
  totalSpent: number;          // 总消费积分
  totalEarned: number;         // 总获得积分
  expiringPackages: Array<{    // 即将过期的套餐
    creditsRemaining: number;
    daysUntilExpiry: number;
    expiresAt: string;
  }>;
};
```

## API 参考

### 导出的 Stores

```typescript
import { authState, statsState } from '$lib/stores/auth';
```

#### authState
- **类型**: `Readable<AuthState>`
- **描述**: 用户认证状态，包含用户信息、加载状态
- **使用**: `$authState.user`, `$authState.loaded`, `$authState.loading`

#### statsState
- **类型**: `Readable<StatsState>`
- **描述**: 用户统计数据状态，包含统计信息、加载状态、错误信息
- **使用**: `$statsState.data`, `$statsState.loaded`, `$statsState.loading`, `$statsState.error`

### 核心函数

#### initDashboardData()
```typescript
async function initDashboardData(): Promise<void>
```
- **描述**: 初始化 Dashboard 完整数据（积分余额 + 统计数据）
- **使用场景**: 首次进入 dashboard 时调用
- **行为**: 并行加载积分余额和统计数据

**示例**:
```typescript
import { initDashboardData } from '$lib/stores/auth';

// 在 dashboard layout 中
$effect(() => {
  if ($authState.loaded && $authState.user && !dataInitialized) {
    initDashboardData();
    dataInitialized = true;
  }
});
```

#### afterCreditsConsumed()
```typescript
async function afterCreditsConsumed(): Promise<void>
```
- **描述**: 消费积分后刷新（只刷新余额，不刷新统计）
- **使用场景**: 用户消费积分后（如发送 chat 消息）
- **行为**: 调用 `refreshUserCredits()` 更新余额

**示例**:
```typescript
import { afterCreditsConsumed } from '$lib/stores/auth';

async function handleSubmit() {
  await chat.sendMessage({ text: input });
  // 消费积分后刷新余额
  await afterCreditsConsumed();
}
```

#### afterCreditsEarned()
```typescript
async function afterCreditsEarned(): Promise<void>
```
- **描述**: 获得积分后刷新（刷新余额和统计）
- **使用场景**: 用户获得积分后（如兑换成功）
- **行为**: 并行调用 `refreshUserCredits()` 和 `refreshUserStats()`

**示例**:
```typescript
import { afterCreditsEarned } from '$lib/stores/auth';

async function handleRedeem() {
  const res = await fetch('/api/user/credits/redeem', { ... });
  if (res.ok) {
    // 兑换成功后刷新积分和统计数据
    await afterCreditsEarned();
  }
}
```

#### refreshUserCredits()
```typescript
async function refreshUserCredits(): Promise<void>
```
- **描述**: 刷新用户积分余额
- **使用场景**: 需要单独更新积分余额时
- **行为**: 调用 `/api/user/credits` 并更新 `authState.user.credits`

#### refreshUserStats()
```typescript
async function refreshUserStats(): Promise<UserStats | null>
```
- **描述**: 刷新用户统计数据
- **使用场景**: 需要更新统计信息时
- **行为**: 调用 `/api/user/credits/stats` 并更新 `statsState.data`
- **返回**: 统计数据或 null（失败时）

### 其他函数

#### setCurrentUser()
```typescript
function setCurrentUser(user: AuthUser | null): void
```
- **描述**: 设置当前用户
- **使用场景**: 内部使用，登录/登出时

#### patchCurrentUser()
```typescript
function patchCurrentUser(patch: Partial<AuthUser>): void
```
- **描述**: 部分更新当前用户信息
- **使用场景**: 更新用户的某些字段（如积分、套餐数量）

#### clearAuthState()
```typescript
function clearAuthState(): void
```
- **描述**: 清除认证状态
- **使用场景**: 用户登出时

#### refreshCurrentUser()
```typescript
async function refreshCurrentUser(): Promise<AuthUser | null>
```
- **描述**: 刷新当前用户会话
- **使用场景**: 需要重新获取用户信息时

#### ensureCurrentUserLoaded()
```typescript
async function ensureCurrentUserLoaded(): Promise<AuthUser | null>
```
- **描述**: 确保当前用户已加载
- **使用场景**: 在需要用户信息但不确定是否已加载时

## 使用指南

### 基础用法

#### 1. 在组件中访问状态

```svelte
<script lang="ts">
  import { authState, statsState } from '$lib/stores/auth';
</script>

<!-- 访问用户信息 -->
<div>用户名: {$authState.user?.name}</div>
<div>积分: {$authState.user?.credits ?? 0}</div>

<!-- 访问统计数据 -->
<div>总消费: {$statsState.data?.totalSpent ?? 0}</div>
<div>总获得: {$statsState.data?.totalEarned ?? 0}</div>

<!-- 加载状态 -->
{#if $authState.loading}
  <div>加载用户信息...</div>
{/if}

{#if $statsState.loading}
  <div>加载统计数据...</div>
{/if}

<!-- 错误处理 -->
{#if $statsState.error}
  <div class="error">{$statsState.error}</div>
{/if}
```

#### 2. 条件渲染

```svelte
<script lang="ts">
  import { authState } from '$lib/stores/auth';
</script>

{#if $authState.loaded}
  {#if $authState.user}
    <!-- 已登录 -->
    <div>欢迎, {$authState.user.name}</div>
  {:else}
    <!-- 未登录 -->
    <div>请先登录</div>
  {/if}
{:else}
  <!-- 加载中 -->
  <div>加载中...</div>
{/if}
```

#### 3. 响应式派生

```svelte
<script lang="ts">
  import { authState, statsState } from '$lib/stores/auth';

  // 派生状态
  const isLowBalance = $derived(
    ($authState.user?.credits ?? 0) < 10
  );

  const hasExpiringPackages = $derived(
    ($statsState.data?.expiringPackages.length ?? 0) > 0
  );
</script>

{#if isLowBalance}
  <div class="warning">积分余额不足</div>
{/if}

{#if hasExpiringPackages}
  <div class="alert">有套餐即将过期</div>
{/if}
```

### 高级用法

#### 1. 初始化数据

```svelte
<script lang="ts">
  import { authState, initDashboardData } from '$lib/stores/auth';

  let dataInitialized = $state(false);

  // 响应式初始化
  $effect(() => {
    if ($authState.loaded && $authState.user && !dataInitialized) {
      initDashboardData();
      dataInitialized = true;
    }
  });
</script>
```

#### 2. 处理积分变化

```svelte
<script lang="ts">
  import { afterCreditsConsumed, afterCreditsEarned } from '$lib/stores/auth';

  // 消费积分
  async function consumeCredits() {
    await someApiCall();
    await afterCreditsConsumed();
  }

  // 获得积分
  async function earnCredits() {
    await someApiCall();
    await afterCreditsEarned();
  }
</script>
```

#### 3. 错误处理

```svelte
<script lang="ts">
  import { statsState } from '$lib/stores/auth';

  // 监听错误
  $effect(() => {
    if ($statsState.error) {
      console.error('统计数据加载失败:', $statsState.error);
      // 显示错误提示
      toast.error($statsState.error);
    }
  });
</script>
```

## 最佳实践

### 1. 单一数据源原则

✅ **正确做法**：所有组件从 store 读取数据
```svelte
<script>
  import { authState } from '$lib/stores/auth';
</script>

<div>{$authState.user?.credits}</div>
```

❌ **错误做法**：组件自己获取数据
```svelte
<script>
  let credits = $state(0);

  onMount(async () => {
    const res = await fetch('/api/user/credits');
    const data = await res.json();
    credits = data.balance;
  });
</script>

<div>{credits}</div>
```

### 2. 及时刷新数据

✅ **正确做法**：操作后立即刷新
```svelte
<script>
  import { afterCreditsConsumed } from '$lib/stores/auth';

  async function sendMessage() {
    await chat.sendMessage({ text: input });
    await afterCreditsConsumed(); // 立即刷新
  }
</script>
```

❌ **错误做法**：不刷新或延迟刷新
```svelte
<script>
  async function sendMessage() {
    await chat.sendMessage({ text: input });
    // 没有刷新，UI 显示旧数据
  }
</script>
```

### 3. 避免重复加载

✅ **正确做法**：在 layout 中初始化一次
```svelte
<!-- dashboard/+layout.svelte -->
<script>
  import { initDashboardData } from '$lib/stores/auth';

  let dataInitialized = $state(false);

  $effect(() => {
    if ($authState.loaded && $authState.user && !dataInitialized) {
      initDashboardData();
      dataInitialized = true;
    }
  });
</script>
```

❌ **错误做法**：每个页面都加载
```svelte
<!-- 每个页面都这样做 -->
<script>
  onMount(() => {
    fetch('/api/user/credits/stats'); // 重复请求
  });
</script>
```

### 4. 使用派生状态

✅ **正确做法**：使用 `$derived` 计算派生值
```svelte
<script>
  import { authState } from '$lib/stores/auth';

  const isLowBalance = $derived(
    ($authState.user?.credits ?? 0) < 10
  );
</script>

{#if isLowBalance}
  <div>余额不足</div>
{/if}
```

❌ **错误做法**：在模板中重复计算
```svelte
{#if ($authState.user?.credits ?? 0) < 10}
  <div>余额不足</div>
{/if}

{#if ($authState.user?.credits ?? 0) < 10}
  <button>充值</button>
{/if}
```

### 5. 正确处理加载状态

✅ **正确做法**：显示加载指示器
```svelte
{#if $statsState.loading}
  <Skeleton class="h-8 w-24" />
{:else}
  <div>{$statsState.data?.totalSpent}</div>
{/if}
```

❌ **错误做法**：不处理加载状态
```svelte
<div>{$statsState.data?.totalSpent ?? 0}</div>
<!-- 加载时显示 0，用户体验差 -->
```

## 数据流向图

```
用户操作
   ↓
组件调用函数
   ↓
更新 Store
   ↓
所有订阅的组件自动更新
```

### 详细流程

```
1. 用户登录
   ↓
2. initAuthFromLayout() 设置 authState.user
   ↓
3. Dashboard layout 检测到 authState.loaded && authState.user
   ↓
4. 调用 initDashboardData()
   ↓
5. 并行执行:
   - refreshUserCredits() → 更新 authState.user.credits
   - refreshUserStats() → 更新 statsState.data
   ↓
6. 所有组件自动响应更新
   - SectionCards 显示最新积分和统计
   - Navbar 显示最新积分
   - Credits 页面显示最新数据
```

## 常见问题

### Q: 为什么要使用完整的状态对象而不是分散的 stores？

**A**: 完整的状态对象有以下优势：
1. **内聚性更好** - 相关状态在一起，更易理解
2. **原子性更新** - 避免状态不一致
3. **易于扩展** - 添加新字段更简单
4. **类型安全** - TypeScript 类型更清晰

### Q: 什么时候应该调用 `afterCreditsConsumed()` vs `afterCreditsEarned()`？

**A**:
- **`afterCreditsConsumed()`**: 用户消费积分时（如发送 chat 消息）
  - 只刷新余额，不刷新统计
  - 性能更好，减少不必要的请求

- **`afterCreditsEarned()`**: 用户获得积分时（如兑换成功）
  - 刷新余额和统计
  - 确保统计数据（总获得）也更新

### Q: 如何处理错误？

**A**: `statsState` 包含 `error` 字段：
```svelte
<script>
  import { statsState } from '$lib/stores/auth';
</script>

{#if $statsState.error}
  <div class="error">{$statsState.error}</div>
{/if}
```

### Q: 如何避免重复加载数据？

**A**: 在 dashboard layout 中使用 `dataInitialized` 标志：
```svelte
<script>
  let dataInitialized = $state(false);

  $effect(() => {
    if ($authState.loaded && $authState.user && !dataInitialized) {
      initDashboardData();
      dataInitialized = true; // 防止重复加载
    }
  });
</script>
```

### Q: 如何在非组件代码中访问状态？

**A**: 使用 `get()` 函数：
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

## 迁移指南

如果你从旧版本迁移，请参考 [CHANGELOG.md](../CHANGELOG.md) 中的 Migration Guide 部分。

## 相关文档

- [CHANGELOG.md](../CHANGELOG.md) - 更新日志
- [CLAUDE.md](../CLAUDE.md) - 项目概述
- [API 文档](./API.md) - API 端点文档（如果有）

## 贡献

如果你发现文档有误或需要改进，请提交 Issue 或 Pull Request。
