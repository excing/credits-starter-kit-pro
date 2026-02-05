# 快速参考：TypeScript 常量计费配置

## 📍 配置文件位置

```
src/lib/server/operation-costs.config.ts
```

---

## 🚀 快速修改价格

### 修改现有价格

```typescript
// 文件：src/lib/server/operation-costs.config.ts

export const OPERATION_COSTS = {
    chat_usage: {
        operationType: 'chat_usage',
        costType: 'per_token',
        costAmount: 2,        // ← 改这里：2 积分
        costPer: 1000,        // ← 改这里：每 1000 tokens
        isActive: true,
        metadata: { ... }
    }
}
```

### 添加新操作

```typescript
export const OPERATION_COSTS = {
    // ... 现有配置

    // 新增操作
    my_new_operation: {
        operationType: 'my_new_operation',
        costType: 'fixed',      // 或 'per_token' 或 'per_unit'
        costAmount: 10,
        costPer: 1,
        isActive: true,
        metadata: {
            note: '我的新操作'
        }
    }
}
```

### 禁用操作

```typescript
image_generation: {
    // ...
    isActive: false,  // ← 改为 false 即可禁用
    // ...
}
```

---

## 📦 部署流程

```bash
# 1. 修改配置
vim src/lib/server/operation-costs.config.ts

# 2. 提交
git add src/lib/server/operation-costs.config.ts
git commit -m "feat: adjust pricing"

# 3. 推送（自动部署）
git push
```

---

## 🔍 在代码中使用

### 获取配置

```typescript
import { getOperationCost } from '$lib/server/operation-costs.config';

// 获取配置（同步，零开销）
const config = getOperationCost('chat_usage');

if (config) {
    console.log(config.costAmount);  // 1
    console.log(config.costPer);     // 1000
}
```

### 计算费用

```typescript
import { getOperationCost } from '$lib/server/operation-costs.config';
import { calculateTokenCost } from '$lib/server/credits';

const config = getOperationCost('chat_usage');
if (config) {
    const cost = calculateTokenCost(1500, config);
    console.log(cost);  // 2 积分（1500 tokens）
}
```

### 在 API 中使用

```typescript
import { withCredits } from '$lib/server/credits-middleware';

export const POST = withCredits(
    async ({ request, creditContext }) => {
        // 业务逻辑
        return {
            response: json({ success: true }),
            usage: { tokens: 1000 }
        };
    },
    { operationType: 'chat_usage' }  // ← 使用配置的操作类型
);
```

---

## 📊 当前配置一览

| 操作类型 | 计费模式 | 费用 | 状态 |
|---------|---------|------|------|
| `chat_usage` | 按 token | 1 积分 / 1000 tokens | ✅ 启用 |
| `image_generation` | 固定 | 5 积分/张 | ✅ 启用 |
| `file_processing` | 按单位 | 2 积分/文件 | ✅ 启用 |
| `example_operation` | 按单位 | 2 积分/单位 | ✅ 启用 |

---

## 🎯 计费模式说明

### 1. 固定计费 (fixed)

```typescript
{
    costType: 'fixed',
    costAmount: 5,
    costPer: 1
}
// 计算：每次固定 5 积分
```

### 2. 按 Token 计费 (per_token)

```typescript
{
    costType: 'per_token',
    costAmount: 1,
    costPer: 1000
}
// 计算：Math.ceil((tokens / 1000) * 1)
// 示例：1500 tokens = 2 积分
```

### 3. 按单位计费 (per_unit)

```typescript
{
    costType: 'per_unit',
    costAmount: 2,
    costPer: 1
}
// 计算：Math.ceil((units / 1) * 2)
// 示例：3 个文件 = 6 积分
```

---

## ⚡ 性能优势

| 指标 | 数据库 | TypeScript 常量 |
|------|--------|----------------|
| 查询延迟 | ~10ms | ~0.01ms |
| 冷启动 | +5-20ms | +0ms |
| 并发 | 受限 | 无限 |

---

## 🔧 常用命令

```bash
# 类型检查
npm run check

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 查看配置变更历史
git log -p src/lib/server/operation-costs.config.ts
```

---

## ⚠️ 注意事项

1. **修改配置需要重新部署**
2. **配置在构建时确定，无法热更新**
3. **适合配置相对稳定的场景**
4. **不适合需要频繁调整价格的场景**

---

## 📚 相关文档

- 详细迁移文档：`MIGRATION_TO_TYPESCRIPT_CONSTANTS.md`
- 完整总结报告：`MIGRATION_SUMMARY.md`
- 中间件使用指南：`CREDITS_MIDDLEWARE_GUIDE.md`

---

## 🆘 故障排查

### 问题：配置修改后没有生效

```bash
# 1. 确认修改已提交
git status

# 2. 确认已推送
git log origin/main..HEAD

# 3. 检查部署状态（Vercel/Netlify）
# 访问部署平台查看构建日志

# 4. 清除浏览器缓存
# Ctrl+Shift+R (Chrome/Firefox)
```

### 问题：TypeScript 报错

```bash
# 运行类型检查
npm run check

# 查看具体错误
# 通常是拼写错误或类型不匹配
```

### 问题：API 返回 "未找到计费配置"

```typescript
// 检查操作类型是否正确
const config = getOperationCost('chat_usage');  // ✅ 正确
const config = getOperationCost('chatUsage');   // ❌ 错误（不存在）

// 检查是否启用
console.log(config?.isActive);  // 应该是 true
```

---

**最后更新**: 2026-02-05
**版本**: 1.0.0
