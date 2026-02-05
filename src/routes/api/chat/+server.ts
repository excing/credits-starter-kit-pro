import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { preCheckCredits, postDeductCredits } from '$lib/server/credits-middleware';
import {
    estimateTokens,
    estimateMessagesTokens,
    extractTokenUsage
} from '$lib/server/token-utils';

// 创建自定义 OpenAI provider，支持自定义 baseURL
const openai = createOpenAI({
    baseURL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: env.OPENAI_API_KEY,
});

export const POST: RequestHandler = async (event) => {
    // 1. 前置检查：认证 + 积分余额
    const preCheck = await preCheckCredits(event, {
        operationType: 'chat_usage',
        minCreditsRequired: 1
    });

    if (!preCheck.success) {
        return preCheck.error;
    }

    const creditContext = preCheck.context;

    // 2. 执行 AI 流式响应
    const { messages } = await event.request.json();
    const modelMessages = await convertToModelMessages(messages);
    const modelName = env.OPENAI_MODEL || 'gemini-3-flash-preview';

    // 用于累积输出文本
    let fullText = '';

    const result = streamText({
        model: openai.chat(modelName),
        messages: modelMessages,
        onChunk: ({ chunk }) => {
            // 累积输出文本用于后续 token 估算
            if (chunk.type === 'text-delta') {
                fullText += chunk.text;
            }
        },
        onFinish: async ({ usage }) => {
            try {
                let inputTokens = 0;
                let outputTokens = 0;
                let estimationMethod = 'unknown';

                if (usage && (usage.inputTokens || usage.outputTokens)) {
                    // 方案 A: 使用 API 返回的精确 usage
                    const tokenUsage = extractTokenUsage(usage);
                    inputTokens = tokenUsage.inputTokens;
                    outputTokens = tokenUsage.outputTokens;
                    estimationMethod = 'api_usage';
                } else {
                    // 方案 B: 使用 tiktoken 估算
                    console.log(`⚠️ API 未返回 usage 对象，使用 tiktoken 估算 token 数量`);

                    // 估算输入 token
                    const estimated = estimateMessagesTokens(modelMessages);
                    inputTokens = estimated.inputTokens;

                    // 估算输出 token
                    outputTokens = estimateTokens(fullText);

                    estimationMethod = 'tiktoken_estimation';
                }

                const totalTokens = inputTokens + outputTokens;

                // 3. 后置扣费
                await postDeductCredits(creditContext, {
                    tokens: totalTokens,
                    metadata: {
                        model: modelName,
                        inputTokens,
                        outputTokens,
                        totalTokens,
                        estimationMethod
                    }
                });
            } catch (error) {
                console.error('扣费失败:', error);
                // 记录失败但不影响用户体验
            }
        }
    });

    return result.toUIMessageStreamResponse();
};
