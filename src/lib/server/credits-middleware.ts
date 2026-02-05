import type { RequestEvent } from '@sveltejs/kit';
import {
    checkSufficientCredits,
    deductCredits,
    getOperationCost,
    calculateTokenCost,
    getUserBalance,
    InsufficientCreditsError
} from './credits';
import { json } from '@sveltejs/kit';

// ============================================================================
// 类型定义
// ============================================================================

export interface CreditCheckOptions {
    operationType: string;
    estimatedTokens?: number;
    skipCheck?: boolean;
}

export interface WithCreditsOptions {
    operationType: string;
    minCreditsRequired?: number; // 前置检查的最低积分要求（默认1）
    skipPreCheck?: boolean; // 跳过前置检查
    skipPostDeduct?: boolean; // 跳过后置扣费
}

export interface CreditContext {
    userId: string;
    operationType: string;
    initialBalance: number;
}

// ============================================================================
// 基础中间件函数
// ============================================================================

/**
 * 中间件：检查积分（用于固定费用操作）
 */
export async function checkCreditsMiddleware(
    event: RequestEvent,
    options: CreditCheckOptions
): Promise<{ allowed: boolean; error?: Response; costConfig?: any }> {
    const userId = event.locals.session?.user?.id;

    if (!userId) {
        return {
            allowed: false,
            error: json({ error: '未授权' }, { status: 401 })
        };
    }

    if (options.skipCheck) {
        return { allowed: true };
    }

    // 获取计费配置（现在是同步操作，从 TypeScript 常量获取）
    const costConfig = getOperationCost(options.operationType);

    if (!costConfig) {
        console.error(`未找到操作类型的计费配置: ${options.operationType}`);
        return { allowed: true }; // 如果没有配置，允许通过
    }

    // 计算所需积分
    let requiredCredits: number;
    if (costConfig.costType === 'fixed') {
        requiredCredits = costConfig.costAmount;
    } else if (costConfig.costType === 'per_token' && options.estimatedTokens) {
        requiredCredits = calculateTokenCost(options.estimatedTokens, costConfig);
    } else {
        // 无法估算，允许通过并在之后扣费
        return { allowed: true, costConfig };
    }

    // 检查用户是否有足够积分
    const hasSufficientCredits = await checkSufficientCredits(userId, requiredCredits);

    if (!hasSufficientCredits) {
        return {
            allowed: false,
            error: json(
                {
                    error: '积分不足',
                    required: requiredCredits,
                    code: 'INSUFFICIENT_CREDITS'
                },
                { status: 402 }
            )
        };
    }

    return { allowed: true, costConfig };
}

/**
 * 操作完成后扣除积分（用于 token 计费操作）
 */
export async function deductCreditsAfterOperation(
    userId: string,
    operationType: string,
    actualTokens: number,
    metadata?: Record<string, any>
): Promise<void> {
    const costConfig = getOperationCost(operationType);

    if (!costConfig) {
        console.warn(`未找到操作类型 ${operationType} 的计费配置，跳过扣费`);
        return;
    }

    const creditsToDeduct = calculateTokenCost(actualTokens, costConfig);

    if (creditsToDeduct <= 0) return;

    try {
        await deductCredits(userId, creditsToDeduct, operationType, {
            ...metadata,
            tokens: actualTokens,
            creditsDeducted: creditsToDeduct
        });
    } catch (error) {
        if (error instanceof InsufficientCreditsError) {
            console.error('扣费时积分不足:', error);
            // 在生产环境中，可能需要创建欠款记录或暂停账户
        }
        throw error;
    }
}

// ============================================================================
// 统一的积分管理包装器
// ============================================================================

/**
 * 前置检查：验证用户身份和积分余额
 *
 * @param event - SvelteKit RequestEvent
 * @param options - 配置选项
 * @returns CreditContext 或错误响应
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
 * 后置扣费：根据实际使用量扣除积分
 *
 * @param context - 积分上下文
 * @param usage - 使用量信息
 */
export async function postDeductCredits(
    context: CreditContext,
    usage: {
        tokens?: number;
        units?: number;
        metadata?: Record<string, any>;
    }
): Promise<void> {
    const { userId, operationType } = context;

    // 获取计费配置（现在是同步操作，从 TypeScript 常量获取）
    const costConfig = getOperationCost(operationType);

    if (!costConfig) {
        console.warn(`⚠️ 未找到操作类型 '${operationType}' 的计费配置，跳过扣费`);
        return;
    }

    // 计算扣费金额
    let creditsToDeduct = 0;

    if (costConfig.costType === 'fixed') {
        creditsToDeduct = costConfig.costAmount;
    } else if (costConfig.costType === 'per_token' && usage.tokens !== undefined) {
        creditsToDeduct = calculateTokenCost(usage.tokens, costConfig);
    } else if (costConfig.costType === 'per_unit' && usage.units !== undefined) {
        creditsToDeduct = Math.ceil((usage.units / costConfig.costPer) * costConfig.costAmount);
    }

    // 如果没有使用量，跳过扣费
    if (creditsToDeduct === 0) {
        console.log(`⚠️ 用户 ${userId} 的操作 '${operationType}' 没有使用量，跳过扣费`);
        return;
    }

    // 执行扣费
    try {
        await deductCredits(userId, creditsToDeduct, operationType, {
            ...usage.metadata,
            tokens: usage.tokens,
            units: usage.units,
            creditsDeducted: creditsToDeduct,
            costType: costConfig.costType
        });

        console.log(
            `✓ 用户 ${userId} 消费 ${creditsToDeduct} 积分 (操作: ${operationType}, 使用量: ${usage.tokens || usage.units || 0})`
        );
    } catch (error) {
        console.error('扣费失败:', error);
        // 记录失败但不影响用户体验（已经完成的操作不应该回滚）
    }
}

/**
 * 高阶函数：为 API handler 添加积分管理
 *
 * 使用示例：
 * ```typescript
 * export const POST = withCredits(
 *     async ({ request, creditContext }) => {
 *         // 你的业务逻辑
 *         const result = await doSomething();
 *
 *         // 返回响应和使用量
 *         return {
 *             response: json({ success: true }),
 *             usage: { tokens: 1000 }
 *         };
 *     },
 *     { operationType: 'my_operation' }
 * );
 * ```
 */
export function withCredits<T = any>(
    handler: (event: RequestEvent & { creditContext: CreditContext }) => Promise<{
        response: Response;
        usage?: { tokens?: number; units?: number; metadata?: Record<string, any> };
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
            await postDeductCredits(preCheck.context, result.usage);
        }

        return result.response;
    };
}
