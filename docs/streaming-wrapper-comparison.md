# 流式响应包装器对比

## 概述

`withCreditsStreaming` 是专为流式响应设计的积分管理包装器，通过**回调函数**让开发者自主控制扣费时机。

## 代码对比

### ❌ 旧方式：手动调用（97 行代码）

```typescript
import type { RequestHandler } from '@sveltejs/kit';
import { preCheckCredits, postDeductCredits } from '$lib/server/credits-middleware';

export const POST: RequestHandler = async (event) => {
    // 1. 手动前置检查
    const preCheck = await preCheckCredits(event, {
        operationType: 'chat_usage',
        minCreditsRequired: 1
    });

    if (!preCheck.success) {
        return preCheck.error;
    }

    const creditContext = preCheck.context;

    // 2. 解析请求
    const { messages } = await event.request.json();
    const modelMessages = await convertToModelMessages(messages);
    const modelName = env.OPENAI_MODEL || 'gemini-3-flash-preview';

    let fullText = '';

    // 3. 执行流式响应
    const result = streamText({
        model: openai.chat(modelName),
        messages: modelMessages,
        onChunk: ({ chunk }) => {
            if (chunk.type === 'text-delta') {
                fullText += chunk.text;
            }
        },
        onFinish: async ({ usage }) => {
            try {
                // ... token 计算逻辑 ...

                // 4. 手动后置扣费
                await postDeductCredits(creditContext, creditsToDeduct, {
                    model: modelName,
                    inputTokens,
                    outputTokens,
                    totalTokens,
                    estimationMethod
                });
            } catch (error) {
                console.error('扣费失败:', error);
            }
        }
    });

    return result.toUIMessageStreamResponse();
};
```

**问题**：
- ❌ 需要手动调用 `preCheckCredits` 和 `postDeductCredits`
- ❌ 需要手动处理错误返回
- ❌ 需要手动管理 `creditContext` 变量
- ❌ 代码冗长，样板代码多
- ❌ 容易忘记前置检查或后置扣费

---

### ✅ 新方式：`withCreditsStreaming` 包装器（91 行代码）

```typescript
import { withCreditsStreaming } from '$lib/server/credits-middleware';

export const POST = withCreditsStreaming(
    async ({ request, creditContext, deductCredits }) => {
        // 1. 解析请求
        const { messages } = await request.json();
        const modelMessages = await convertToModelMessages(messages);
        const modelName = env.OPENAI_MODEL || 'gemini-3-flash-preview';

        let fullText = '';

        // 2. 执行流式响应
        const result = streamText({
            model: openai.chat(modelName),
            messages: modelMessages,
            onChunk: ({ chunk }) => {
                if (chunk.type === 'text-delta') {
                    fullText += chunk.text;
                }
            },
            onFinish: async ({ usage }) => {
                try {
                    // ... token 计算逻辑 ...

                    // 3. 调用回调函数扣费
                    await deductCredits(creditsToDeduct, {
                        model: modelName,
                        inputTokens,
                        outputTokens,
                        totalTokens,
                        estimationMethod
                    });
                } catch (error) {
                    console.error('扣费失败:', error);
                }
            }
        });

        // 4. 立即返回流式响应
        return result.toUIMessageStreamResponse();
    },
    {
        operationType: 'chat_usage',
        minCreditsRequired: 1
    }
);
```

**优势**：
- ✅ 自动处理前置检查（认证 + 余额）
- ✅ 自动处理错误返回（401/402）
- ✅ 自动注入 `creditContext` 和 `deductCredits` 回调
- ✅ 代码简洁，专注业务逻辑
- ✅ 类型安全，编译时检查
- ✅ 统一的 API 风格（与 `withCredits` 一致）

---

## 核心设计：回调函数模式

### 为什么选择回调函数？

```typescript
// ❌ 方案 A：返回 Promise（复杂）
return {
    response: streamResponse,
    usagePromise: new Promise((resolve) => {
        // 需要在 onFinish 中 resolve
    })
};

// ✅ 方案 B：回调函数（简洁）
onFinish: async ({ usage }) => {
    await deductCredits(creditsToDeduct, metadata);
};
```

**回调函数的优势**：
1. **简洁直观**：直接在需要扣费的地方调用
2. **无需管理 Promise**：不需要手动创建和 resolve Promise
3. **灵活控制**：可以在任何异步回调中调用
4. **条件扣费**：可以根据条件决定是否扣费

---

## 使用场景

### 1. AI 流式聊天（最常见）

```typescript
export const POST = withCreditsStreaming(
    async ({ request, deductCredits }) => {
        const { messages } = await request.json();
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
                const totalTokens = usage.totalTokens || estimateTokens(fullText);
                const creditsToDeduct = calculateTokenCost(totalTokens, 'chat_usage');

                await deductCredits(creditsToDeduct, {
                    model: 'gpt-4',
                    tokens: totalTokens
                });
            }
        });

        return result.toUIMessageStreamResponse();
    },
    { operationType: 'chat_usage', minCreditsRequired: 1 }
);
```

---

### 2. 语音合成流式响应

```typescript
export const POST = withCreditsStreaming(
    async ({ request, deductCredits }) => {
        const { text } = await request.json();
        let audioLength = 0;

        const stream = synthesizeSpeech(text, {
            onProgress: (bytes) => {
                audioLength += bytes;
            },
            onComplete: async () => {
                // 按音频长度计费
                const seconds = audioLength / 16000;
                const creditsToDeduct = Math.ceil(seconds * 0.1);

                await deductCredits(creditsToDeduct, {
                    audioLength,
                    duration: seconds
                });
            }
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'audio/mpeg' }
        });
    },
    { operationType: 'speech_synthesis', minCreditsRequired: 1 }
);
```

---

### 3. 条件扣费（根据结果决定）

```typescript
export const POST = withCreditsStreaming(
    async ({ request, deductCredits }) => {
        const { query } = await request.json();
        let hasResults = false;

        const result = streamSearch(query, {
            onResult: (result) => {
                hasResults = true;
            },
            onFinish: async () => {
                // 只有找到结果才扣费
                if (hasResults) {
                    await deductCredits(5, { query, hasResults });
                }
            }
        });

        return result.toResponse();
    },
    { operationType: 'search', minCreditsRequired: 5 }
);
```

---

### 4. 不扣费的流式响应（仅认证）

```typescript
export const GET = withCreditsStreaming(
    async ({ creditContext }) => {
        // 获取用户专属的事件流
        const stream = createEventStream(creditContext.userId);

        // 不调用 deductCredits，不扣费
        return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream' }
        });
    },
    { operationType: 'event_stream', skipPostDeduct: true }
);
```

---

## 技术细节

### 类型定义

```typescript
export function withCreditsStreaming(
    handler: (
        event: RequestEvent & {
            creditContext: CreditContext;
            deductCredits: (
                creditsToDeduct: number,
                metadata?: Record<string, any>
            ) => Promise<void>;
        }
    ) => Promise<Response>,
    options: WithCreditsOptions
): (event: RequestEvent) => Promise<Response>
```

### 工作流程

```
1. 前置检查
   ├─ 验证用户身份（session）
   ├─ 检查积分余额
   └─ 失败 → 返回 401/402 错误

2. 创建回调函数
   └─ deductCredits = async (amount, metadata) => { ... }

3. 执行业务逻辑
   ├─ 注入 creditContext 和 deductCredits
   ├─ 调用 handler 函数
   └─ 在 onFinish 中调用 deductCredits()

4. 立即返回响应
   └─ 不等待扣费完成（异步扣费）
```

---

## 与 `withCredits` 的对比

| 特性 | `withCredits` | `withCreditsStreaming` |
|------|---------------|------------------------|
| **适用场景** | 同步 API | 流式 API |
| **返回值** | `{ response, usage }` | `Response` |
| **扣费时机** | handler 返回时 | 调用 `deductCredits()` 时 |
| **扣费方式** | 自动扣费 | 手动调用回调 |
| **灵活性** | 低（固定流程） | 高（自主控制） |
| **代码复杂度** | 简单 | 稍复杂（需要管理回调） |

---

## 最佳实践

### ✅ 推荐做法

1. **在流结束时扣费**
   ```typescript
   onFinish: async ({ usage }) => {
       await deductCredits(amount, metadata);
   }
   ```

2. **记录详细的元数据**
   ```typescript
   await deductCredits(creditsToDeduct, {
       model: 'gpt-4',
       inputTokens: 100,
       outputTokens: 200,
       totalTokens: 300,
       estimationMethod: 'api_usage'
   });
   ```

3. **处理扣费失败**
   ```typescript
   try {
       await deductCredits(amount, metadata);
   } catch (error) {
       console.error('扣费失败:', error);
       // 记录失败但不影响用户体验
   }
   ```

4. **条件扣费**
   ```typescript
   if (hasResults) {
       await deductCredits(amount, metadata);
   }
   ```

---

### ❌ 避免的做法

1. **在流开始前扣费**
   ```typescript
   // ❌ 错误：流可能失败，但已经扣费
   await deductCredits(amount, metadata);
   const result = streamText({ ... });
   ```

2. **忘记调用 deductCredits**
   ```typescript
   // ❌ 错误：没有扣费
   onFinish: async ({ usage }) => {
       const amount = calculateCost(usage);
       // 忘记调用 deductCredits
   }
   ```

3. **重复扣费**
   ```typescript
   // ❌ 错误：可能重复扣费
   onChunk: async () => {
       await deductCredits(0.1, {}); // 每个 chunk 都扣费
   }
   ```

---

## 总结

`withCreditsStreaming` 是一个**优雅、灵活、类型安全**的流式响应包装器：

✅ **简化代码**：减少样板代码，专注业务逻辑
✅ **自动化**：自动处理前置检查和错误返回
✅ **灵活控制**：通过回调函数自主控制扣费时机
✅ **类型安全**：完整的 TypeScript 类型支持
✅ **统一风格**：与 `withCredits` 保持一致的 API 设计

**推荐使用场景**：
- AI 流式聊天
- 语音合成
- 视频流处理
- 实时数据流
- 任何需要流式响应的 API
