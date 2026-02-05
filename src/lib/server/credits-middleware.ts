import type { RequestEvent } from '@sveltejs/kit';
import {
    checkSufficientCredits,
    deductCredits,
    getOperationCost,
    calculateTokenCost,
    InsufficientCreditsError
} from './credits';
import { json } from '@sveltejs/kit';

export interface CreditCheckOptions {
    operationType: string;
    estimatedTokens?: number;
    skipCheck?: boolean;
}

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

    // 获取计费配置
    const costConfig = await getOperationCost(options.operationType);

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
    const costConfig = await getOperationCost(operationType);

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
