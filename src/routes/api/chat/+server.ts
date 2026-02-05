import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { getUserBalance, deductCredits, getOperationCost, calculateTokenCost } from '$lib/server/credits';
import { encoding_for_model } from 'tiktoken';

// 创建自定义 OpenAI provider，支持自定义 baseURL
const openai = createOpenAI({
    baseURL: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: env.OPENAI_API_KEY,
});

/**
 * 估算文本的 token 数量
 * 优先使用 tiktoken，降级到简单估算
 */
function estimateTokens(text: string, model: string = 'gpt-5'): number {
    try {
        // 尝试使用 tiktoken 精确计算
        const encoder = encoding_for_model(model as any);
        const tokens = encoder.encode(text);
        encoder.free();
        return tokens.length;
    } catch (error) {
        // 降级到简单估算：英文约 4 字符 = 1 token，中文约 1.5 字符 = 1 token
        // 使用保守估算：平均 3 字符 = 1 token
        return Math.ceil(text.length / 3);
    }
}

/**
 * 从消息数组估算总 token 数
 */
function estimateMessagesTokens(messages: any[], model: string = 'gpt-5'): { inputTokens: number; outputTokens: number } {
    let inputTokens = 0;

    // 计算输入消息的 token
    for (const msg of messages) {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        inputTokens += estimateTokens(content, model);
        // 每条消息额外增加 4 个 token（消息格式开销）
        inputTokens += 4;
    }

    // 基础开销：每次请求约 3 个 token
    inputTokens += 3;

    return { inputTokens, outputTokens: 0 };
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
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
                    inputTokens = usage.inputTokens || 0;
                    outputTokens = usage.outputTokens || 0;
                    estimationMethod = 'api_usage';
                } else {
                    // 方案 B: 使用 tiktoken 估算
                    console.log(`⚠️ API 未返回 usage 对象，使用 tiktoken 估算 token 数量`);

                    // 估算输入 token
                    const estimated = estimateMessagesTokens(modelMessages, modelName);
                    inputTokens = estimated.inputTokens;

                    // 估算输出 token
                    outputTokens = estimateTokens(fullText, modelName);

                    estimationMethod = 'tiktoken_estimation';
                }

                const totalTokens = inputTokens + outputTokens;

                // 如果没有 token 使用量，跳过扣费
                if (totalTokens === 0) {
                    console.log(`⚠️ 用户 ${userId} 的请求没有 token 使用量，跳过扣费`);
                    return;
                }

                const costConfig = await getOperationCost('chat');

                if (costConfig) {
                    const creditsToDeduct = calculateTokenCost(totalTokens, costConfig);

                    await deductCredits(
                        userId,
                        creditsToDeduct,
                        'chat_usage',
                        {
                            model: modelName,
                            inputTokens,
                            outputTokens,
                            totalTokens,
                            estimationMethod // 记录计费方式
                        }
                    );
                    console.log(
                        `✓ 用户 ${userId} 消费 ${creditsToDeduct} 积分 (${totalTokens} tokens, 方式: ${estimationMethod})`
                    );
                } else {
                    console.warn(`⚠️ 未找到操作类型 'chat' 的计费配置，跳过扣费`);
                }
            } catch (error) {
                console.error('扣费失败:', error);
                // 记录失败但不影响用户体验
            }
        }
    });

    return result.toUIMessageStreamResponse();
};
