import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { getUserBalance, deductCredits, getOperationCost, calculateTokenCost } from '$lib/server/credits';

// 创建自定义 OpenAI provider，支持自定义 baseURL
const openai = createOpenAI({
    baseURL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: env.OPENAI_API_KEY,
});

export const POST: RequestHandler = async ({ request, locals }) => {
    // 1. 认证检查
    const userId = locals.session?.user?.id;
    if (!userId) {
        return json({ error: '未授权，请先登录' }, { status: 401 });
    }

    // 2. 预检查余额（至少需要1积分）
    const balance = await getUserBalance(userId);
    if (balance < 1) {
        return json({
            error: '积分不足',
            code: 'INSUFFICIENT_CREDITS',
            balance: 0
        }, { status: 402 });
    }

    // 3. 执行 AI 流式响应
    const { messages } = await request.json();
    const modelMessages = await convertToModelMessages(messages);
    const modelName = env.OPENAI_MODEL || 'gemini-3-flash-preview';

    const result = streamText({
        model: openai.chat(modelName),
        messages: modelMessages,
        onFinish: async ({ usage }) => {
            // 4. 完成后根据实际 token 扣费
            if (usage) {
                const totalTokens = (usage.inputTokens || 0) + (usage.outputTokens || 0);
                const costConfig = await getOperationCost('chat');

                if (costConfig) {
                    const creditsToDeduct = calculateTokenCost(totalTokens, costConfig);

                    try {
                        await deductCredits(
                            userId,
                            creditsToDeduct,
                            'chat_usage',
                            {
                                model: modelName,
                                inputTokens: usage.inputTokens,
                                outputTokens: usage.outputTokens,
                                totalTokens
                            }
                        );
                        console.log(`用户 ${userId} 消费 ${creditsToDeduct} 积分 (${totalTokens} tokens)`);
                    } catch (error) {
                        console.error('扣费失败:', error);
                        // 记录失败但不影响用户体验
                    }
                }
            }
        }
    });

    return result.toUIMessageStreamResponse();
};
