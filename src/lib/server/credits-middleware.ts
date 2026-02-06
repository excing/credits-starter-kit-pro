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
