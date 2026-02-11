import { streamText, convertToModelMessages, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { json } from '@sveltejs/kit';
import { createOpenAI } from '@ai-sdk/openai';
import { withCreditsStreaming } from '$lib/server/credits-middleware';
import { calculateCost } from '$lib/server/operation-costs.config';
import { createLogger } from '$lib/server/logger';
import { OPERATION_TYPE, AI } from '$lib/config/constants';
import { env } from '$env/dynamic/private';

const log = createLogger('api-chat');

export const POST = withCreditsStreaming(
    async ({ request, creditContext, deductCredits }) => {
        // 1. 解析请求
        const { messages } = await request.json();
        const modelMessages = await convertToModelMessages(messages);

        // 2. 创建 OpenAI 模型实例
        const openai = createOpenAI({
            baseURL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            apiKey: env.OPENAI_API_KEY || ''
        });
        const modelName = env.OPENAI_MODEL || 'gpt-3.5-turbo';
        const rawModel = openai.chat(modelName);

        // 3. 包装模型，提取 <think> 标签中的推理内容
        const model = wrapLanguageModel({
            model: rawModel,
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
        });

        // 4. 执行 AI 流式响应
        try {
            const result = streamText({
                model,
                messages: modelMessages,
                maxOutputTokens: AI.CHAT_MAX_TOKENS,
                onFinish: async ({ usage }) => {
                    try {
                        // 计算积分费用
                        const creditsToDeduct = calculateCost(1, creditContext.operationType);

                        // 调用回调函数扣费
                        await deductCredits(creditsToDeduct, {
                            model: modelName,
                            provider: 'openai'
                        });
                    } catch (error) {
                        log.error('扣费失败', error instanceof Error ? error : new Error(String(error)));
                    }
                },
                onError: async ({ error }) => {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    log.error('AI 流式响应错误', undefined, { error: errorMsg });
                }
            });

            // 5. 立即返回流式响应
            return result.toUIMessageStreamResponse();
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            log.error('AI 请求失败', error instanceof Error ? error : new Error(String(error)));
            return json({ error: 'AI 服务暂时不可用，请稍后重试' }, { status: 502 });
        }
    },
    {
        operationType: OPERATION_TYPE.DEFAULT_USAGE,
        minCreditsRequired: 1
    }
);
