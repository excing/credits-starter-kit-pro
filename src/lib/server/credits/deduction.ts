import { db } from '../db';
import { userCreditPackage, creditTransaction } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { CREDITS } from '$lib/config/constants';
import { recordDebtInTransaction } from './debt';
import type { TransactionType } from '$lib/types/credits';
import { createLogger } from '../logger';

const log = createLogger('credits-deduction');

/**
 * 延迟函数（用于重试机制）
 */
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 扣除积分（优先从即将过期的套餐扣除）- 带重试机制
 *
 * Bug修复说明：
 * - 当积分不足时，先扣除所有可用积分，再将差额记录为欠费
 * - 扣除积分和记录欠费在同一事务内完成，保证数据一致性
 * - 不再抛出 InsufficientCreditsError，允许用户继续使用（但会产生欠费）
 */
export async function deductCredits(
    userId: string,
    amount: number,
    operationType: string,
    metadata?: Record<string, unknown>,
    operationId?: string
): Promise<void> {
    if (amount <= 0) {
        throw new Error('扣除金额必须大于0');
    }

    const retryDelays = CREDITS.DEDUCT_RETRY_DELAYS;
    let lastError: Error | null = null;

    // 重试机制：最多尝试3次
    for (let attempt = 0; attempt < retryDelays.length + 1; attempt++) {
        try {
            await db.transaction(async (tx) => {
                // 幂等性检查：在事务内执行，避免并发竞态条件
                if (operationId) {
                    const existing = await tx
                        .select({ id: creditTransaction.id })
                        .from(creditTransaction)
                        .where(eq(creditTransaction.operationId, operationId))
                        .limit(1);
                    if (existing.length > 0) {
                        log.info('幂等检查: operationId 已存在，跳过扣费', { operationId });
                        return;
                    }
                }

                // 获取所有有效套餐，按过期时间排序
                const now = new Date();
                const packages = await tx
                    .select()
                    .from(userCreditPackage)
                    .where(
                        and(
                            eq(userCreditPackage.userId, userId),
                            eq(userCreditPackage.isActive, true),
                            gt(userCreditPackage.expiresAt, now),
                            gt(userCreditPackage.creditsRemaining, 0)
                        )
                    )
                    .orderBy(userCreditPackage.expiresAt)
                    .for('update');

                // 计算总余额
                const totalBalance = packages.reduce((sum, pkg) => sum + pkg.creditsRemaining, 0);

                let remainingAmount = amount;
                let totalDeducted = 0;

                // 从最早过期的套餐开始扣除
                for (const pkg of packages) {
                    if (remainingAmount <= 0) break;

                    const deductFromThis = Math.min(remainingAmount, pkg.creditsRemaining);
                    const newBalance = pkg.creditsRemaining - deductFromThis;

                    // 更新套餐余额
                    await tx
                        .update(userCreditPackage)
                        .set({ creditsRemaining: newBalance })
                        .where(eq(userCreditPackage.id, pkg.id));

                    // 创建交易记录
                    await tx.insert(creditTransaction).values({
                        id: randomUUID(),
                        userId,
                        userPackageId: pkg.id,
                        type: operationType as TransactionType,
                        amount: -deductFromThis,
                        balanceBefore: pkg.creditsRemaining,
                        balanceAfter: newBalance,
                        description: `${operationType} 消费`,
                        metadata: metadata ? JSON.stringify(metadata) : null,
                        operationId: operationId ?? null
                    });

                    remainingAmount -= deductFromThis;
                    totalDeducted += deductFromThis;
                }

                // 如果还有剩余未扣除的金额，在事务内记录欠费
                // Bug修复：确保扣除积分和记录欠费在同一事务内完成
                if (remainingAmount > 0) {
                    const debtMetadata = {
                        ...metadata,
                        totalRequired: amount,
                        deductedFromBalance: totalDeducted,
                        debtAmount: remainingAmount
                    };

                    // 记录欠费
                    await recordDebtInTransaction(tx, userId, remainingAmount, operationType, debtMetadata);

                    // 创建欠费产生的交易记录（修复：之前缺少此记录，导致交易历史中只有"结算欠费"而无"欠费产生"）
                    await tx.insert(creditTransaction).values({
                        id: randomUUID(),
                        userId,
                        userPackageId: null,
                        type: 'debt',
                        amount: -remainingAmount,
                        balanceBefore: 0,
                        balanceAfter: 0,
                        description: `${operationType} 欠费`,
                        metadata: JSON.stringify(debtMetadata),
                        operationId: operationId ?? null
                    });

                    log.info('积分不足，已扣除可用积分并记录欠费', {
                        userId,
                        operationType,
                        totalRequired: amount,
                        availableBalance: totalBalance,
                        deductedFromBalance: totalDeducted,
                        debtRecorded: remainingAmount
                    });
                }
            });

            // 扣费成功，返回
            return;
        } catch (error) {
            lastError = error as Error;

            // 记录重试日志
            log.error('扣费失败', error instanceof Error ? error : new Error(String(error)), {
                userId,
                amount,
                operationType,
                error: error instanceof Error ? error.message : String(error)
            });

            // 如果还有重试机会，等待后重试
            if (attempt < retryDelays.length) {
                await delay(retryDelays[attempt]);
            }
        }
    }

    // 所有重试都失败，仅抛出错误（不在事务外记录欠费，避免重复）
    log.error('扣费失败，已达最大重试次数', undefined, {
        userId,
        amount,
        operationType
    });
    throw lastError || new Error('扣费失败');
}
