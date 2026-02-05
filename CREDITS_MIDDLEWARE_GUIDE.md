# Credits 中间件使用指南

本指南介绍如何使用 credits 中间件为 API 接口添加积分管理功能。

## 概述

Credits 中间件提供了统一的积分管理方案，包括：
- **前置检查**：验证用户身份和积分余额
- **后置扣费**：根据实际使用量扣除积分
- **灵活配置**：支持固定费用、按 token 计费、按单位计费

## 核心函数

### 1. `preCheckCredits` - 前置检查

验证用户身份和积分余额，在执行业务逻辑前调用。

```typescript
import { preCheckCredits } from '$lib/server/credits-middleware';

const preCheck = await preCheckCredits(event, {
    operationType: 'chat_usage',
    minCreditsRequired: 1,  // 可选，默认 1
    skipPreCheck: false     // 可选，默认 false
});

if (!preCheck.success) {
    return preCheck.error;  // 返回 401 或 402 错误
}

const { creditContext } = preCheck;  // 包含 userId, operationType, initialBalance
```

### 2. `postDeductCredits` - 后置扣费

根据实际使用量扣除积分，在操作完成后调用。

```typescript
import { postDeductCredits } from '$lib/server/credits-middleware';

await postDeductCredits(creditContext, {
    tokens: 1000,           // 可选：token 数量
    units: 5,               // 可选：单位数量
    metadata: {             // 可选：额外元数据
        model: 'gpt-4',
        inputTokens: 800,
        outputTokens: 200
    }
});
```

### 3. `withCredits` - 高阶函数（推荐）

自动处理前置检查和后置扣费的包装器函数。

```typescript
import { withCredits } from '$lib/server/credits-middleware';
import { json } from '@sveltejs/kit';

export const POST = withCredits(
    async ({ request, creditContext }) => {
        // 你的业务逻辑
        const data = await request.json();
        const result = await doSomething(data);

        // 返回响应和使用量
        return {
            response: json({ success: true, result }),
            usage: { tokens: 1000 }  // 可选
        };
    },
    { operationType: 'my_operation' }
);
```

## 使用场景

### 场景 1：固定费用操作

适用于每次调用消耗固定积分的操作（如图片生成）。

```typescript
// src/routes/api/generate-image/+server.ts
import { withCredits } from '$lib/server/credits-middleware';
import { json } from '@sveltejs/kit';

export const POST = withCredits(
    async ({ request, creditContext }) => {
        const { prompt } = await request.json();

        // 生成图片
        const imageUrl = await generateImage(prompt);

        return {
            response: json({ imageUrl }),
            usage: { units: 1 }  // 固定消耗 1 单位
        };
    },
    {
        operationType: 'image_generation',
        minCreditsRequired: 10  // 至少需要 10 积分
    }
);
```

**数据库配置**（operation_cost 表）：
```sql
INSERT INTO operation_cost (id, operation_type, cost_type, cost_amount, cost_per, is_active)
VALUES ('cost-img', 'image_generation', 'fixed', 10, 1, true);
```

### 场景 2：按 Token 计费（流式响应）

适用于 AI 聊天等流式响应场景，无法预先知道 token 数量。

```typescript
// src/routes/api/chat/+server.ts
import { preCheckCredits, postDeductCredits } from '$lib/server/credits-middleware';
import { streamText } from 'ai';

export const POST: RequestHandler = async (event) => {
    // 1. 前置检查（至少 1 积分）
    const preCheck = await preCheckCredits(event, {
        operationType: 'chat_usage',
        minCreditsRequired: 1
    });

    if (!preCheck.success) {
        return preCheck.error;
    }

    const { creditContext } = preCheck;

    // 2. 执行流式响应
    const { messages } = await event.request.json();
    let totalTokens = 0;

    const result = streamText({
        model: openai.chat('gpt-4'),
        messages,
        onFinish: async ({ usage }) => {
            totalTokens = (usage?.inputTokens || 0) + (usage?.outputTokens || 0);

            // 3. 后置扣费
            await postDeductCredits(creditContext, {
                tokens: totalTokens,
                metadata: {
                    inputTokens: usage?.inputTokens,
                    outputTokens: usage?.outputTokens
                }
            });
        }
    });

    return result.toUIMessageStreamResponse();
};
```

**数据库配置**：
```sql
INSERT INTO operation_cost (id, operation_type, cost_type, cost_amount, cost_per, is_active)
VALUES ('cost-chat', 'chat_usage', 'per_token', 1, 1000, true);
-- 每 1000 tokens 消耗 1 积分
```

### 场景 3：按单位计费

适用于文件处理、API 调用等按次数计费的操作。

```typescript
// src/routes/api/process-files/+server.ts
import { withCredits } from '$lib/server/credits-middleware';
import { json } from '@sveltejs/kit';

export const POST = withCredits(
    async ({ request, creditContext }) => {
        const { files } = await request.json();

        // 处理文件
        const results = await Promise.all(
            files.map(file => processFile(file))
        );

        return {
            response: json({ results }),
            usage: {
                units: files.length,  // 按文件数量计费
                metadata: { fileCount: files.length }
            }
        };
    },
    {
        operationType: 'file_processing',
        minCreditsRequired: 5
    }
);
```

**数据库配置**：
```sql
INSERT INTO operation_cost (id, operation_type, cost_type, cost_amount, cost_per, is_active)
VALUES ('cost-file', 'file_processing', 'per_unit', 2, 1, true);
-- 每个文件消耗 2 积分
```

### 场景 4：手动控制（不使用包装器）

适用于需要精细控制的复杂场景。

```typescript
// src/routes/api/complex-operation/+server.ts
import { preCheckCredits, postDeductCredits } from '$lib/server/credits-middleware';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
    // 1. 前置检查
    const preCheck = await preCheckCredits(event, {
        operationType: 'complex_operation',
        minCreditsRequired: 5
    });

    if (!preCheck.success) {
        return preCheck.error;
    }

    const { creditContext } = preCheck;

    try {
        // 2. 执行业务逻辑
        const { data } = await event.request.json();
        const result = await complexOperation(data);

        // 3. 后置扣费
        await postDeductCredits(creditContext, {
            units: result.processedItems,
            metadata: {
                operation: 'complex',
                itemsProcessed: result.processedItems
            }
        });

        return json({ success: true, result });
    } catch (error) {
        console.error('操作失败:', error);
        return json({ error: '操作失败' }, { status: 500 });
    }
};
```

## 配置选项

### WithCreditsOptions

```typescript
interface WithCreditsOptions {
    operationType: string;        // 操作类型（必须在 operation_cost 表中配置）
    minCreditsRequired?: number;  // 前置检查的最低积分要求（默认 1）
    skipPreCheck?: boolean;       // 跳过前置检查（默认 false）
    skipPostDeduct?: boolean;     // 跳过后置扣费（默认 false）
}
```

### CreditContext

```typescript
interface CreditContext {
    userId: string;           // 用户 ID
    operationType: string;    // 操作类型
    initialBalance: number;   // 初始余额
}
```

## 数据库配置

在 `operation_cost` 表中配置计费规则：

```sql
-- 固定费用示例
INSERT INTO operation_cost (id, operation_type, cost_type, cost_amount, cost_per, is_active)
VALUES ('cost-img', 'image_generation', 'fixed', 10, 1, true);

-- 按 token 计费示例（每 1000 tokens = 1 积分）
INSERT INTO operation_cost (id, operation_type, cost_type, cost_amount, cost_per, is_active)
VALUES ('cost-chat', 'chat_usage', 'per_token', 1, 1000, true);

-- 按单位计费示例（每 5 个单位 = 3 积分）
INSERT INTO operation_cost (id, operation_type, cost_type, cost_amount, cost_per, is_active)
VALUES ('cost-api', 'api_call', 'per_unit', 3, 5, true);
```

**字段说明**：
- `operation_type`: 操作类型标识符（唯一）
- `cost_type`: 计费类型（`fixed` | `per_token` | `per_unit`）
- `cost_amount`: 积分数量
- `cost_per`: 计费单位（token 或 unit 的数量）
- `is_active`: 是否启用

## 错误处理

### 401 未授权
用户未登录或 session 无效。

```json
{
    "error": "未授权，请先登录"
}
```

### 402 积分不足
用户积分余额不足。

```json
{
    "error": "积分不足",
    "code": "INSUFFICIENT_CREDITS",
    "balance": 0,
    "required": 10
}
```

## 最佳实践

### 1. 选择合适的方法

- **简单场景**：使用 `withCredits` 高阶函数
- **流式响应**：使用 `preCheckCredits` + `postDeductCredits`
- **复杂逻辑**：手动调用前置检查和后置扣费

### 2. 前置检查的最低积分

- **固定费用**：设置为实际费用
- **按量计费**：设置为 1（确保用户有积分即可）

### 3. 后置扣费的容错

后置扣费失败不应影响用户体验（操作已完成），只记录错误日志。

### 4. 元数据记录

在 `metadata` 中记录详细信息，便于后续分析和审计：

```typescript
await postDeductCredits(creditContext, {
    tokens: 1000,
    metadata: {
        model: 'gpt-4',
        inputTokens: 800,
        outputTokens: 200,
        estimationMethod: 'api_usage',
        requestId: 'req_123'
    }
});
```

## 迁移现有 API

将现有 API 迁移到使用中间件：

**迁移前**：
```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
    const userId = locals.session?.user?.id;
    if (!userId) {
        return json({ error: '未授权' }, { status: 401 });
    }

    const balance = await getUserBalance(userId);
    if (balance < 1) {
        return json({ error: '积分不足' }, { status: 402 });
    }

    // 业务逻辑...
    const result = await doSomething();

    await deductCredits(userId, 10, 'my_operation');

    return json({ result });
};
```

**迁移后**：
```typescript
export const POST = withCredits(
    async ({ request, creditContext }) => {
        // 业务逻辑...
        const result = await doSomething();

        return {
            response: json({ result }),
            usage: { units: 1 }
        };
    },
    { operationType: 'my_operation', minCreditsRequired: 10 }
);
```

## 总结

Credits 中间件提供了三种使用方式：

1. **`withCredits`**（推荐）：最简洁，适合大多数场景
2. **`preCheckCredits` + `postDeductCredits`**：适合流式响应
3. **手动控制**：适合复杂场景

选择合适的方式，可以大大简化积分管理的代码，提高可维护性。
