import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { env } from '$env/dynamic/private';
import { withCreditsStreaming } from '$lib/server/credits-middleware';
import { calculateCost } from '$lib/server/operation-costs.config';

// 创建自定义 OpenAI provider，支持自定义 baseURL
const openai = createOpenAI({
    baseURL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: env.OPENAI_API_KEY,
});

export const POST = withCreditsStreaming(
    async ({ request, creditContext, deductCredits }) => {
        // 1. 解析请求
        const { messages } = await request.json();
        const modelMessages = await convertToModelMessages(messages);
        const modelName = env.OPENAI_MODEL || '';

        // 2. 包装模型，提取 <think> 标签中的推理内容
        const model = wrapLanguageModel({
            model: openai.chat(modelName),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
        });

        // 3. 执行 AI 流式响应
        const result = streamText({
            model,
            messages: modelMessages,
            onFinish: async ({ usage }) => {
                try {
                    // 计算积分费用
                    const creditsToDeduct = calculateCost(1, creditContext.operationType);

                    // 4. 调用回调函数扣费
                    await deductCredits(creditsToDeduct, {
                        model: modelName
                    });
                } catch (error) {
                    console.error('扣费失败:', error);
                    // 记录失败但不影响用户体验
                }
            }
        });

        // 5. 立即返回流式响应
        return result.toUIMessageStreamResponse();
    },
    {
        operationType: 'default_usage',
        minCreditsRequired: 1
    }
);
