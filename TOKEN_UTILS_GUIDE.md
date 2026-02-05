# Token 统计工具使用指南

本指南介绍如何使用 token 统计工具模块进行 token 估算、统计和费用计算。

## 概述

Token 工具模块 (`src/lib/server/token-utils.ts`) 提供了完整的 token 管理功能：
- **精确估算**：优先使用 tiktoken，降级到简单估算
- **多种场景**：支持文本、消息数组、API 响应
- **费用计算**：支持简单和详细的费用计算
- **实用工具**：格式化、限制检查、报告生成

## 核心功能

### 1. Token 估算

#### 估算文本的 token 数量

```typescript
import { estimateTokens } from '$lib/server/token-utils';

// 基础用法（统一使用 gpt-4 tokenizer）
const tokens = estimateTokens('Hello, world!');
console.log(tokens); // 约 4

const tokens2 = estimateTokens('你好，世界！');
console.log(tokens2); // 约 6
```

#### 估算消息数组的 token 数量

```typescript
import { estimateMessagesTokens } from '$lib/server/token-utils';

const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there! How can I help you?' }
];

const estimation = estimateMessagesTokens(messages);
console.log(estimation);
// {
//     inputTokens: 45,
//     outputTokens: 0,
//     totalTokens: 45,
//     method: 'tiktoken'
// }
```

#### 详细的消息 token 统计

```typescript
import { estimateMessagesTokensDetailed } from '$lib/server/token-utils';

const messages = [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there!' }
];

const breakdown = estimateMessagesTokensDetailed(messages);
breakdown.forEach(msg => {
    console.log(`${msg.role}: ${msg.tokens} tokens`);
});
// user: 6 tokens
// assistant: 7 tokens
```

### 2. 从 API 响应提取 Token 使用量

```typescript
import { extractTokenUsage } from '$lib/server/token-utils';

// 支持多种字段名称
const usage1 = extractTokenUsage({
    inputTokens: 100,
    outputTokens: 50
});

const usage2 = extractTokenUsage({
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150
});

console.log(usage1);
// {
//     inputTokens: 100,
//     outputTokens: 50,
//     totalTokens: 150
// }
```

### 3. 合并多个 Token 使用量

```typescript
import { mergeTokenUsages } from '$lib/server/token-utils';

const usage1 = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };
const usage2 = { inputTokens: 200, outputTokens: 100, totalTokens: 300 };
const usage3 = { inputTokens: 150, outputTokens: 75, totalTokens: 225 };

const total = mergeTokenUsages([usage1, usage2, usage3]);
console.log(total);
// {
//     inputTokens: 450,
//     outputTokens: 225,
//     totalTokens: 675
// }
```

### 4. 费用计算

#### 简单费用计算

```typescript
import { calculateTokenCost } from '$lib/server/token-utils';

// GPT-4 输入价格：$0.03 / 1K tokens
const cost = calculateTokenCost(1500, 0.03);
console.log(`Cost: $${cost.toFixed(4)}`); // Cost: $0.0450
```

#### 详细费用计算（区分输入和输出）

```typescript
import { calculateDetailedTokenCost } from '$lib/server/token-utils';

const usage = {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500
};

const cost = calculateDetailedTokenCost(usage, {
    inputPricePerThousand: 0.03,   // GPT-4 输入
    outputPricePerThousand: 0.06   // GPT-4 输出
});

console.log(`Total cost: $${cost.toFixed(4)}`); // Total cost: $0.0600
```

### 5. 智能估算器

```typescript
import { smartEstimateTokens } from '$lib/server/token-utils';

// 估算文本
const est1 = smartEstimateTokens('Hello, world!');

// 估算消息
const est2 = smartEstimateTokens([
    { role: 'user', content: 'Hello!' }
]);

console.log(est1.totalTokens);
console.log(est2.totalTokens);
```

### 6. 实用工具函数

#### 格式化 Token 数量

```typescript
import { formatTokens } from '$lib/server/token-utils';

console.log(formatTokens(1234567)); // "1,234,567"
```

#### 格式化费用

```typescript
import { formatCost } from '$lib/server/token-utils';

console.log(formatCost(0.001234)); // "$0.0012"
console.log(formatCost(0.001234, 6)); // "$0.001234"
```

#### 估算输出 Token 数量

```typescript
import { estimateOutputTokens } from '$lib/server/token-utils';

// 基于输入 token 估算输出（默认比例 1.5）
const outputTokens = estimateOutputTokens(1000);
console.log(outputTokens); // 1500

// 自定义比例
const outputTokens2 = estimateOutputTokens(1000, 2.0);
console.log(outputTokens2); // 2000
```

#### 检查 Token 限制

```typescript
import { isTokenLimitExceeded, getModelTokenLimit } from '$lib/server/token-utils';

// 检查是否超过限制
if (isTokenLimitExceeded(150000, 'gpt-4')) {
    console.log('Token limit exceeded!');
}

// 获取模型限制
const limit = getModelTokenLimit('gpt-4');
console.log(`Model limit: ${limit} tokens`); // Model limit: 128000 tokens
```

### 7. 生成 Token 报告

```typescript
import { createTokenReport } from '$lib/server/token-utils';

const usage = {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500
};

const report = createTokenReport(usage, {
    model: 'gpt-4',
    includeCost: true,
    pricing: {
        inputPricePerThousand: 0.03,
        outputPricePerThousand: 0.06
    }
});

console.log(report);
// === Token Usage Report ===
// Model: gpt-4
// Input Tokens:  1,000
// Output Tokens: 500
// Total Tokens:  1,500
// Estimated Cost: $0.0600
// ========================
```

## 使用场景

### 场景 1：AI 聊天 API

```typescript
import { estimateMessagesTokens, extractTokenUsage } from '$lib/server/token-utils';
import { streamText } from 'ai';

export const POST: RequestHandler = async ({ request }) => {
    const { messages } = await request.json();

    // 估算输入 token（用于前置检查）
    const estimation = estimateMessagesTokens(messages);
    console.log(`Estimated input tokens: ${estimation.inputTokens}`);

    let fullText = '';

    const result = streamText({
        model: openai.chat('gpt-4'),
        messages,
        onChunk: ({ chunk }) => {
            if (chunk.type === 'text-delta') {
                fullText += chunk.text;
            }
        },
        onFinish: async ({ usage }) => {
            // 提取实际使用量
            const actualUsage = extractTokenUsage(usage);
            console.log(`Actual tokens: ${actualUsage.totalTokens}`);

            // 记录到数据库或扣费
            await recordTokenUsage(actualUsage);
        }
    });

    return result.toUIMessageStreamResponse();
};
```

### 场景 2：批量处理

```typescript
import { estimateTokens, mergeTokenUsages } from '$lib/server/token-utils';

async function processBatch(items: string[]) {
    const usages = [];

    for (const item of items) {
        // 估算每个 item 的 token
        const tokens = estimateTokens(item);

        // 处理 item
        const result = await processItem(item);

        usages.push({
            inputTokens: tokens,
            outputTokens: estimateTokens(result),
            totalTokens: tokens + estimateTokens(result)
        });
    }

    // 合并所有使用量
    const total = mergeTokenUsages(usages);
    console.log(`Total tokens used: ${total.totalTokens}`);

    return total;
}
```

### 场景 3：费用预估

```typescript
import {
    estimateMessagesTokens,
    estimateOutputTokens,
    calculateDetailedTokenCost,
    formatCost
} from '$lib/server/token-utils';

function estimateChatCost(messages: any[]) {
    // 估算输入 token
    const estimation = estimateMessagesTokens(messages);
    const inputTokens = estimation.inputTokens;

    // 估算输出 token（假设输出是输入的 1.5 倍）
    const outputTokens = estimateOutputTokens(inputTokens, 1.5);

    // 计算费用
    const cost = calculateDetailedTokenCost(
        { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        {
            inputPricePerThousand: 0.03,   // GPT-4 输入
            outputPricePerThousand: 0.06   // GPT-4 输出
        }
    );

    return {
        estimatedTokens: inputTokens + outputTokens,
        estimatedCost: formatCost(cost)
    };
}

// 使用
const messages = [
    { role: 'user', content: 'Write a long essay about AI.' }
];

const estimate = estimateChatCost(messages);
console.log(`Estimated cost: ${estimate.estimatedCost}`);
```

### 场景 4：Token 限制检查

```typescript
import {
    estimateMessagesTokens,
    isTokenLimitExceeded,
    getModelTokenLimit
} from '$lib/server/token-utils';

function validateMessageLength(messages: any[], model: string = 'gpt-4') {
    const estimation = estimateMessagesTokens(messages);
    const limit = getModelTokenLimit(model);

    if (isTokenLimitExceeded(estimation.totalTokens, model)) {
        throw new Error(
            `Messages exceed token limit. ` +
            `Used: ${estimation.totalTokens}, Limit: ${limit}`
        );
    }

    // 计算剩余空间
    const remaining = limit - estimation.totalTokens;
    console.log(`Remaining tokens: ${remaining}`);

    return {
        used: estimation.totalTokens,
        limit,
        remaining,
        percentage: (estimation.totalTokens / limit * 100).toFixed(2)
    };
}
```

### 场景 5：实时监控

```typescript
import { createTokenReport, mergeTokenUsages } from '$lib/server/token-utils';

class TokenMonitor {
    private usages: TokenUsage[] = [];

    addUsage(usage: TokenUsage) {
        this.usages.push(usage);
    }

    getReport() {
        const total = mergeTokenUsages(this.usages);
        return createTokenReport(total, {
            model: 'gpt-4',
            includeCost: true,
            pricing: {
                inputPricePerThousand: 0.03,
                outputPricePerThousand: 0.06
            }
        });
    }

    reset() {
        this.usages = [];
    }
}

// 使用
const monitor = new TokenMonitor();

// 记录每次使用
monitor.addUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });
monitor.addUsage({ inputTokens: 200, outputTokens: 100, totalTokens: 300 });

// 生成报告
console.log(monitor.getReport());
```

## 模型定价参考

### OpenAI 定价（2024）

```typescript
const OPENAI_PRICING = {
    'gpt-4': {
        inputPricePerThousand: 0.03,
        outputPricePerThousand: 0.06
    },
    'gpt-4-turbo': {
        inputPricePerThousand: 0.01,
        outputPricePerThousand: 0.03
    },
    'gpt-3.5-turbo': {
        inputPricePerThousand: 0.0005,
        outputPricePerThousand: 0.0015
    }
};
```

### 使用定价配置

```typescript
import { calculateDetailedTokenCost } from '$lib/server/token-utils';

function calculateCost(usage: TokenUsage, model: string) {
    const pricing = OPENAI_PRICING[model];
    if (!pricing) {
        throw new Error(`Unknown model: ${model}`);
    }

    return calculateDetailedTokenCost(usage, pricing);
}
```

## API 参考

### 类型定义

```typescript
interface TokenEstimation {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    method: 'tiktoken' | 'simple' | 'api';
}

interface MessageTokens {
    role: string;
    content: string;
    tokens: number;
}

interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost?: number;
}
```

### 函数列表

#### Token 估算
- `estimateTokens(text)` - 估算文本的 token 数量（统一使用 gpt-4 tokenizer）
- `estimateMessagesTokens(messages)` - 估算消息数组的 token 数量（统一使用 gpt-4 tokenizer）
- `estimateMessagesTokensDetailed(messages)` - 详细的消息 token 统计（统一使用 gpt-4 tokenizer）
- `smartEstimateTokens(input)` - 智能估算器（统一使用 gpt-4 tokenizer）

#### Token 提取与合并
- `extractTokenUsage(usage?)` - 从 API 响应提取 token 使用量
- `mergeTokenUsages(usages)` - 合并多个 token 使用量

#### 费用计算
- `calculateTokenCost(tokens, pricePerThousand)` - 简单费用计算
- `calculateDetailedTokenCost(usage, pricing)` - 详细费用计算

#### 实用工具
- `formatTokens(tokens)` - 格式化 token 数量
- `formatCost(cost, decimals?)` - 格式化费用
- `estimateOutputTokens(inputTokens, ratio?)` - 估算输出 token
- `isTokenLimitExceeded(tokens, model)` - 检查是否超过限制
- `getModelTokenLimit(model)` - 获取模型 token 限制
- `createTokenReport(usage, options?)` - 生成 token 报告

## 最佳实践

### 1. 选择合适的估算方法

- **精确场景**：使用 `estimateTokens` 和 tiktoken
- **快速估算**：使用简单的字符数估算
- **API 响应**：优先使用 `extractTokenUsage`

### 2. 处理不同的 API 响应格式

```typescript
// 兼容多种字段名称
const usage = extractTokenUsage(apiResponse.usage);
```

### 3. 记录详细的元数据

```typescript
await recordTokenUsage({
    ...usage,
    metadata: {
        model: 'gpt-4',
        estimationMethod: 'tiktoken',
        timestamp: new Date().toISOString()
    }
});
```

### 4. 监控和优化

```typescript
// 定期生成报告
const report = createTokenReport(totalUsage, {
    model: 'gpt-4',
    includeCost: true,
    pricing: OPENAI_PRICING['gpt-4']
});

console.log(report);
```

## 与 Credits 中间件集成

```typescript
import { preCheckCredits, postDeductCredits } from '$lib/server/credits-middleware';
import { estimateMessagesTokens, extractTokenUsage } from '$lib/server/token-utils';

export const POST: RequestHandler = async (event) => {
    // 1. 前置检查
    const preCheck = await preCheckCredits(event, {
        operationType: 'chat_usage',
        minCreditsRequired: 1
    });

    if (!preCheck.success) return preCheck.error;

    // 2. 估算 token（可选，用于日志）
    const { messages } = await event.request.json();
    const estimation = estimateMessagesTokens(messages);
    console.log(`Estimated: ${estimation.totalTokens} tokens`);

    // 3. 执行 AI 请求
    const result = await callAI(messages);

    // 4. 提取实际使用量
    const actualUsage = extractTokenUsage(result.usage);

    // 5. 后置扣费
    await postDeductCredits(preCheck.context, {
        tokens: actualUsage.totalTokens,
        metadata: {
            estimated: estimation.totalTokens,
            actual: actualUsage.totalTokens,
            difference: actualUsage.totalTokens - estimation.totalTokens
        }
    });

    return json({ result });
};
```

## 故障排除

### 问题 1：tiktoken 编码失败

**原因**：模型名称不支持或 tiktoken 未正确安装

**解决方案**：
```typescript
// 工具会自动降级到简单估算
const tokens = estimateTokens(text); // 自动处理错误
```

### 问题 2：估算不准确

**原因**：tiktoken 估算与 API 实际使用可能有差异

**解决方案**：
```typescript
// 优先使用 API 返回的精确 usage
const actualUsage = extractTokenUsage(apiResponse.usage);
// 仅在 API 未返回 usage 时才使用 tiktoken 估算
```

### 问题 3：API 响应字段不一致

**原因**：不同 API 提供商使用不同的字段名称

**解决方案**：
```typescript
// extractTokenUsage 自动处理多种格式
const usage = extractTokenUsage(apiResponse.usage);
```

## 总结

Token 统计工具提供了完整的 token 管理功能：

1. **精确估算**：使用 tiktoken 进行精确计算
2. **灵活使用**：支持文本、消息、API 响应等多种场景
3. **费用计算**：支持简单和详细的费用计算
4. **实用工具**：格式化、限制检查、报告生成
5. **易于集成**：与 credits 中间件无缝集成

选择合适的函数，可以轻松实现 token 统计和费用管理。
