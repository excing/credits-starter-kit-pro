import type { RequestEvent } from '@sveltejs/kit';
import {
    deductCredits,
    getUserBalance,
} from './credits';
import { json } from '@sveltejs/kit';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * withCredits 高阶函数的配置选项
 *
 * 用于控制积分中间件的行为
 */
export interface WithCreditsOptions {
    /** 操作类型标识符（用于记录和追踪） */
    operationType: string;
    /** 前置检查的最低积分要求（默认 1），设置为 0 可跳过余额检查 */
    minCreditsRequired?: number;
    /** 是否跳过前置检查（认证和余额检查） */
    skipPreCheck?: boolean;
    /** 是否跳过后置扣费 */
    skipPostDeduct?: boolean;
}

/**
 * 积分上下文
 *
 * 在前置检查后创建，贯穿整个请求生命周期，用于后置扣费。
 * 包含用户身份、操作类型和初始余额信息。
 */
export interface CreditContext {
    /** 用户 ID（来自 session） */
    userId: string;
    /** 操作类型标识符（用于记录和追踪） */
    operationType: string;
    /** 用户的初始积分余额（前置检查时的余额） */
    initialBalance: number;
}

// ============================================================================
// 积分管理核心函数
// ============================================================================

/**
 * 前置检查：验证用户身份和积分余额
 *
 * 在执行业务逻辑前进行认证和积分余额检查，确保用户有足够的积分。
 * 如果检查通过，返回 CreditContext 供后续使用。
 *
 * @param event - SvelteKit RequestEvent 对象，包含 request、locals 等信息
 * @param options - 配置选项
 * @param options.operationType - 操作类型标识符
 * @param options.minCreditsRequired - 可选，最低积分要求（默认 1）
 * @param options.skipPreCheck - 可选，是否跳过前置检查
 * @returns 成功时返回 { success: true, context: CreditContext }，失败时返回 { success: false, error: Response }
 *
 * @example
 * ```typescript
 * // 基本用法
 * const preCheck = await preCheckCredits(event, {
 *     operationType: 'chat_usage',
 *     minCreditsRequired: 1
 * });
 *
 * if (!preCheck.success) {
 *     return preCheck.error; // 返回 401 或 402 错误
 * }
 *
 * const { userId, operationType, initialBalance } = preCheck.context;
 *
 * // 跳过前置检查（用于免费操作）
 * const preCheck2 = await preCheckCredits(event, {
 *     operationType: 'free_operation',
 *     skipPreCheck: true
 * });
 * ```
 */
export async function preCheckCredits(
    event: RequestEvent,
    options: WithCreditsOptions
): Promise<{ success: true; context: CreditContext } | { success: false; error: Response }> {
    // 1. 认证检查
    const userId = event.locals.session?.user?.id;
    if (!userId) {
        return {
            success: false,
            error: json({ error: '未授权，请先登录' }, { status: 401 })
        };
    }

    // 2. 跳过前置检查
    if (options.skipPreCheck) {
        return {
            success: true,
            context: {
                userId,
                operationType: options.operationType,
                initialBalance: 0
            }
        };
    }

    // 3. 检查余额
    const minRequired = options.minCreditsRequired ?? 1;
    const balance = await getUserBalance(userId);

    if (balance < minRequired) {
        return {
            success: false,
            error: json(
                {
                    error: '积分不足',
                    code: 'INSUFFICIENT_CREDITS',
                    balance,
                    required: minRequired
                },
                { status: 402 }
            )
        };
    }

    return {
        success: true,
        context: {
            userId,
            operationType: options.operationType,
            initialBalance: balance
        }
    };
}

/**
 * 后置扣费：根据外部计算好的费用扣除积分
 *
 * 在业务逻辑执行完成后，根据实际使用量扣除积分。
 * 此函数只负责扣费操作，不负责计算费用（费用由外部调用者计算）。
 *
 * **设计原则**：
 * - 职责单一：只负责扣费，不计算费用
 * - 容错性强：扣费失败不影响用户体验（操作已完成）
 * - 可追踪：记录详细的元数据用于审计
 *
 * @param context - 积分上下文（来自 preCheckCredits）
 * @param context.userId - 用户 ID
 * @param context.operationType - 操作类型标识符
 * @param context.initialBalance - 初始积分余额
 * @param creditsToDeduct - 要扣除的积分数量（必须为非负数，由外部调用者计算）
 * @param metadata - 可选，元数据对象（用于记录详细信息，如 tokens、model 等）
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * import { calculateTokenCost } from '$server/token-utils';
 *
 * // 1. 前置检查
 * const preCheck = await preCheckCredits(event, {
 *     operationType: 'chat_usage',
 *     minCreditsRequired: 1
 * });
 *
 * if (!preCheck.success) {
 *     return preCheck.error;
 * }
 *
 * // 2. 执行业务逻辑
 * const result = await callAI(prompt);
 *
 * // 3. 外部计算费用
 * const creditsToDeduct = calculateTokenCost(result.usage.totalTokens, 'chat_usage');
 *
 * // 4. 后置扣费
 * await postDeductCredits(preCheck.context, creditsToDeduct, {
 *     model: 'gpt-4',
 *     inputTokens: result.usage.inputTokens,
 *     outputTokens: result.usage.outputTokens,
 *     totalTokens: result.usage.totalTokens
 * });
 * ```
 */
export async function postDeductCredits(
    context: CreditContext,
    creditsToDeduct: number,
    metadata?: Record<string, any>
): Promise<void> {
    const { userId, operationType } = context;

    // 如果没有费用，跳过扣费
    if (creditsToDeduct <= 0) {
        console.log(`⚠️ 用户 ${userId} 的操作 '${operationType}' 没有费用，跳过扣费`);
        return;
    }

    // 执行扣费
    try {
        await deductCredits(userId, creditsToDeduct, operationType, {
            ...metadata,
            creditsDeducted: creditsToDeduct
        });

        console.log(
            `✓ 用户 ${userId} 消费 ${creditsToDeduct} 积分 (操作: ${operationType})`
        );
    } catch (error) {
        console.error('扣费失败:', error);
        // 记录失败但不影响用户体验（已经完成的操作不应该回滚）
    }
}

/**
 * 高阶函数：为 API handler 添加积分管理
 *
 * 自动处理积分的前置检查和后置扣费，简化 API 开发流程。
 * 将原始的 RequestEvent 扩展为包含 creditContext 的增强版本。
 *
 * **工作流程**：
 * 1. 前置检查：验证用户身份和积分余额
 * 2. 执行业务逻辑：调用传入的 handler 函数
 * 3. 后置扣费：根据 handler 返回的 usage 信息扣除积分
 *
 * **注意事项**：
 * - handler 必须返回 { response, usage? } 对象
 * - usage.creditsToDeduct 必须由外部计算（使用 token-utils 中的函数）
 * - 如果不需要扣费，可以不返回 usage 或设置 skipPostDeduct: true
 *
 * @param handler - API 处理函数，接收增强的 RequestEvent（包含 creditContext）
 * @param handler.creditContext - 积分上下文，包含 userId、operationType、initialBalance
 * @param options - 配置选项
 * @param options.operationType - 操作类型标识符
 * @param options.minCreditsRequired - 可选，最低积分要求（默认 1）
 * @param options.skipPreCheck - 可选，是否跳过前置检查
 * @param options.skipPostDeduct - 可选，是否跳过后置扣费
 * @returns SvelteKit RequestHandler
 *
 * @example
 * ```typescript
 * import { withCredits } from '$server/credits-middleware';
 * import { calculateTokenCost } from '$server/token-utils';
 * import { json } from '@sveltejs/kit';
 *
 * // 示例 1：基本用法（Token 计费）
 * export const POST = withCredits(
 *     async ({ request, creditContext }) => {
 *         const { prompt } = await request.json();
 *         const result = await callAI(prompt);
 *
 *         // 外部计算费用
 *         const creditsToDeduct = calculateTokenCost(
 *             result.usage.totalTokens,
 *             'chat_usage'
 *         );
 *
 *         return {
 *             response: json({ result }),
 *             usage: {
 *                 creditsToDeduct,
 *                 metadata: {
 *                     model: result.model,
 *                     tokens: result.usage.totalTokens
 *                 }
 *             }
 *         };
 *     },
 *     { operationType: 'chat_usage', minCreditsRequired: 1 }
 * );
 *
 * // 示例 2：固定费用
 * export const POST = withCredits(
 *     async ({ request, creditContext }) => {
 *         const result = await generateImage();
 *
 *         // 固定费用
 *         const creditsToDeduct = getFixedCost('image_generation');
 *
 *         return {
 *             response: json({ imageUrl: result.url }),
 *             usage: {
 *                 creditsToDeduct,
 *                 metadata: { imageId: result.id }
 *             }
 *         };
 *     },
 *     { operationType: 'image_generation', minCreditsRequired: 10 }
 * );
 *
 * // 示例 3：不扣费（仅检查认证）
 * export const GET = withCredits(
 *     async ({ creditContext }) => {
 *         const data = await fetchUserData(creditContext.userId);
 *         return { response: json({ data }) };
 *     },
 *     { operationType: 'fetch_data', skipPostDeduct: true }
 * );
 *
 * // 示例 4：自定义计费逻辑（VIP 折扣）
 * export const POST = withCredits(
 *     async ({ request, creditContext }) => {
 *         const result = await callAI(prompt);
 *         const user = await getUser(creditContext.userId);
 *
 *         // 自定义计费：VIP 用户 8 折
 *         let creditsToDeduct = calculateTokenCost(
 *             result.usage.totalTokens,
 *             'chat_usage'
 *         );
 *         if (user.isVip) {
 *             creditsToDeduct = Math.ceil(creditsToDeduct * 0.8);
 *         }
 *
 *         return {
 *             response: json({ result }),
 *             usage: {
 *                 creditsToDeduct,
 *                 metadata: {
 *                     tokens: result.usage.totalTokens,
 *                     discount: user.isVip ? '20%' : 'none'
 *                 }
 *             }
 *         };
 *     },
 *     { operationType: 'chat_usage' }
 * );
 * ```
 */
export function withCredits<T = any>(
    handler: (event: RequestEvent & { creditContext: CreditContext }) => Promise<{
        response: Response;
        usage?: {
            creditsToDeduct: number;
            metadata?: Record<string, any>;
        };
    }>,
    options: WithCreditsOptions
) {
    return async (event: RequestEvent): Promise<Response> => {
        // 1. 前置检查
        const preCheck = await preCheckCredits(event, options);
        if (!preCheck.success) {
            return preCheck.error;
        }

        // 2. 执行业务逻辑
        const result = await handler({
            ...event,
            creditContext: preCheck.context
        });

        // 3. 后置扣费
        if (!options.skipPostDeduct && result.usage) {
            await postDeductCredits(
                preCheck.context,
                result.usage.creditsToDeduct,
                result.usage.metadata
            );
        }

        return result.response;
    };
}

/**
 * 高阶函数：为流式 API handler 添加积分管理（回调模式）
 *
 * 专为流式响应设计，通过回调函数让调用者自主控制扣费时机。
 * 解决了 `withCredits` 无法处理流式响应的问题。
 *
 * **工作流程**：
 * 1. 前置检查：验证用户身份和积分余额
 * 2. 注入回调：将 `deductCredits` 回调函数注入到 handler 中
 * 3. 执行业务逻辑：调用传入的 handler 函数
 * 4. 调用者控制扣费：在流结束时调用 `deductCredits()` 完成扣费
 *
 * **设计优势**：
 * - 调用者完全控制扣费时机
 * - 无需管理 Promise，代码更简洁
 * - 可以在任何异步回调中调用（如 onFinish、onComplete）
 * - 类型安全，编译时检查
 *
 * @param handler - 流式 API 处理函数
 * @param handler.creditContext - 积分上下文，包含 userId、operationType、initialBalance
 * @param handler.deductCredits - 扣费回调函数，在流结束时调用
 * @param options - 配置选项
 * @returns SvelteKit RequestHandler
 *
 * @example
 * ```typescript
 * import { withCreditsStreaming } from '$server/credits-middleware';
 * import { streamText } from 'ai';
 * import { calculateTokenCost, estimateTokens } from '$server/token-utils';
 *
 * // 示例 1：AI 流式聊天（推荐用法）
 * export const POST = withCreditsStreaming(
 *     async ({ request, creditContext, deductCredits }) => {
 *         const { messages } = await request.json();
 *         let fullText = '';
 *
 *         const result = streamText({
 *             model: openai.chat('gpt-4'),
 *             messages,
 *             onChunk: ({ chunk }) => {
 *                 if (chunk.type === 'text-delta') {
 *                     fullText += chunk.text;
 *                 }
 *             },
 *             onFinish: async ({ usage }) => {
 *                 // 流结束后，调用回调函数扣费
 *                 const totalTokens = usage.totalTokens || estimateTokens(fullText);
 *                 const creditsToDeduct = calculateTokenCost(totalTokens, 'chat_usage');
 *
 *                 await deductCredits(creditsToDeduct, {
 *                     model: 'gpt-4',
 *                     inputTokens: usage.inputTokens,
 *                     outputTokens: usage.outputTokens,
 *                     totalTokens
 *                 });
 *             }
 *         });
 *
 *         return result.toUIMessageStreamResponse();
 *     },
 *     { operationType: 'chat_usage', minCreditsRequired: 1 }
 * );
 *
 * // 示例 2：语音合成流式响应
 * export const POST = withCreditsStreaming(
 *     async ({ request, creditContext, deductCredits }) => {
 *         const { text } = await request.json();
 *         let audioLength = 0;
 *
 *         const stream = synthesizeSpeech(text, {
 *             onProgress: (bytes) => {
 *                 audioLength += bytes;
 *             },
 *             onComplete: async () => {
 *                 // 流结束后扣费
 *                 const seconds = audioLength / 16000;
 *                 const creditsToDeduct = Math.ceil(seconds * 0.1);
 *
 *                 await deductCredits(creditsToDeduct, {
 *                     audioLength,
 *                     duration: seconds
 *                 });
 *             }
 *         });
 *
 *         return new Response(stream, {
 *             headers: { 'Content-Type': 'audio/mpeg' }
 *         });
 *     },
 *     { operationType: 'speech_synthesis', minCreditsRequired: 1 }
 * );
 *
 * // 示例 3：不扣费的流式响应（不调用 deductCredits）
 * export const GET = withCreditsStreaming(
 *     async ({ creditContext, deductCredits }) => {
 *         const stream = createEventStream(creditContext.userId);
 *
 *         // 不调用 deductCredits，不扣费
 *         return new Response(stream, {
 *             headers: { 'Content-Type': 'text/event-stream' }
 *         });
 *     },
 *     { operationType: 'event_stream', skipPostDeduct: true }
 * );
 *
 * // 示例 4：条件扣费（根据流内容决定是否扣费）
 * export const POST = withCreditsStreaming(
 *     async ({ request, creditContext, deductCredits }) => {
 *         const { query } = await request.json();
 *         let hasResults = false;
 *
 *         const result = streamSearch(query, {
 *             onResult: (result) => {
 *                 hasResults = true;
 *             },
 *             onFinish: async () => {
 *                 // 只有找到结果才扣费
 *                 if (hasResults) {
 *                     await deductCredits(5, { query, hasResults });
 *                 }
 *             }
 *         });
 *
 *         return result.toResponse();
 *     },
 *     { operationType: 'search', minCreditsRequired: 5 }
 * );
 * ```
 */
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
) {
    return async (event: RequestEvent): Promise<Response> => {
        // 1. 前置检查
        const preCheck = await preCheckCredits(event, options);
        if (!preCheck.success) {
            return preCheck.error;
        }

        // 2. 创建扣费回调函数
        const deductCredits = async (
            creditsToDeduct: number,
            metadata?: Record<string, any>
        ): Promise<void> => {
            if (options.skipPostDeduct) {
                console.log(`⚠️ skipPostDeduct 已启用，跳过扣费`);
                return;
            }

            await postDeductCredits(preCheck.context, creditsToDeduct, metadata);
        };

        // 3. 执行业务逻辑（注入 creditContext 和 deductCredits 回调）
        const response = await handler({
            ...event,
            creditContext: preCheck.context,
            deductCredits
        });

        // 4. 立即返回流式响应
        return response;
    };
}
