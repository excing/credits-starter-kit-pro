import { db } from './db';
import {
    user,
    creditPackage,
    userCreditPackage,
    creditTransaction,
    redemptionCode,
    redemptionHistory,
    creditDebt
} from './db/schema';
import { eq, and, lt, gt, gte, sql, desc, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getOperationCost, type OperationCostConfig } from './operation-costs.config';

// Types
export type TransactionType =
    | 'redemption'
    | 'chat_usage'
    | 'image_generation'
    | 'purchase'
    | 'subscription'
    | 'admin_adjustment'
    | 'refund'
    | 'debt';

// Re-export OperationCostConfig for backward compatibility
export type { OperationCostConfig };

// Error classes
export class InsufficientCreditsError extends Error {
    constructor(required: number, available: number) {
        super(`积分不足。需要: ${required}，可用: ${available}`);
        this.name = 'InsufficientCreditsError';
    }
}

export class InvalidRedemptionCodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidRedemptionCodeError';
    }
}

export class PackageExpiredError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PackageExpiredError';
    }
}

/**
 * 获取用户总余额（汇总所有未过期套餐）
 */
export async function getUserBalance(userId: string): Promise<number> {
    const now = new Date();

    const result = await db
        .select({
            totalCredits: sql<number>`COALESCE(SUM(${userCreditPackage.creditsRemaining}), 0)`
        })
        .from(userCreditPackage)
        .where(
            and(
                eq(userCreditPackage.userId, userId),
                eq(userCreditPackage.isActive, true),
                gt(userCreditPackage.expiresAt, now)
            )
        );

    return Number(result[0]?.totalCredits ?? 0);
}

/**
 * 获取用户所有有效套餐
 */
export async function getUserActivePackages(userId: string) {
    const now = new Date();

    return await db
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
        .orderBy(userCreditPackage.expiresAt); // 按过期时间排序，最早过期的优先
}

/**
 * 获取用户所有失效套餐（已用完、已过期、已停用）
 */
export async function getUserInactivePackages(userId: string, limit: number = 20) {
    const now = new Date();

    return await db
        .select()
        .from(userCreditPackage)
        .where(
            and(
                eq(userCreditPackage.userId, userId),
                sql`(
                    ${userCreditPackage.isActive} = false
                    OR ${userCreditPackage.expiresAt} <= ${now}
                    OR ${userCreditPackage.creditsRemaining} <= 0
                )`
            )
        )
        .orderBy(sql`${userCreditPackage.expiresAt} DESC`)
        .limit(limit);
}

/**
 * 发放套餐给用户（带欠费结算）
 */
export async function grantPackageToUser(
    userId: string,
    packageId: string,
    source: 'redemption' | 'purchase' | 'subscription' | 'admin',
    sourceId?: string
): Promise<string> {
    const userPackageId = randomUUID();

    await db.transaction(async (tx) => {
        // 获取套餐信息
        const [pkg] = await tx
            .select()
            .from(creditPackage)
            .where(eq(creditPackage.id, packageId))
            .limit(1);

        if (!pkg) {
            throw new Error('套餐不存在');
        }

        if (!pkg.isActive) {
            throw new Error('套餐已停用');
        }

        // 计算过期时间
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

        // 创建用户套餐
        await tx.insert(userCreditPackage).values({
            id: userPackageId,
            userId,
            packageId,
            creditsTotal: pkg.credits,
            creditsRemaining: pkg.credits,
            expiresAt,
            source,
            sourceId,
            isActive: true
        });

        // 创建交易记录
        await tx.insert(creditTransaction).values({
            id: randomUUID(),
            userId,
            userPackageId,
            type: source === 'redemption' ? 'redemption' : source === 'purchase' ? 'purchase' : 'admin_adjustment',
            amount: pkg.credits,
            balanceBefore: 0,
            balanceAfter: pkg.credits,
            description: `获得套餐: ${pkg.name}`,
            metadata: JSON.stringify({
                packageId,
                packageName: pkg.name,
                validityDays: pkg.validityDays,
                expiresAt: expiresAt.toISOString()
            }),
            relatedId: sourceId
        });

        // 结算欠费
        await settleDebts(userId, tx);
    });

    return userPackageId;
}

/**
 * 延迟函数（用于重试机制）
 */
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 结算欠费（在事务中调用）
 */
async function settleDebts(userId: string, tx: any): Promise<void> {
    // 获取所有未结清的欠费
    const debts = await tx
        .select()
        .from(creditDebt)
        .where(
            and(
                eq(creditDebt.userId, userId),
                eq(creditDebt.isSettled, false)
            )
        )
        .orderBy(creditDebt.createdAt); // 按创建时间排序，先结清早期欠费

    if (debts.length === 0) {
        return; // 没有欠费，直接返回
    }

    // 获取用户当前可用积分
    const packages = await tx
        .select()
        .from(userCreditPackage)
        .where(
            and(
                eq(userCreditPackage.userId, userId),
                eq(userCreditPackage.isActive, true),
                gt(userCreditPackage.expiresAt, new Date()),
                gt(userCreditPackage.creditsRemaining, 0)
            )
        )
        .orderBy(userCreditPackage.expiresAt);

    let availableCredits = packages.reduce((sum: number, pkg: any) => sum + pkg.creditsRemaining, 0);

    // 逐个结算欠费
    for (const debt of debts) {
        if (availableCredits <= 0) {
            break; // 没有可用积分了
        }

        const settleAmount = Math.min(debt.amount, availableCredits);
        let remainingSettle = settleAmount;

        // 从套餐中扣除积分
        for (const pkg of packages) {
            if (remainingSettle <= 0) break;
            if (pkg.creditsRemaining <= 0) continue;

            const deductFromThis = Math.min(remainingSettle, pkg.creditsRemaining);
            const newBalance = pkg.creditsRemaining - deductFromThis;

            // 更新套餐余额
            await tx
                .update(userCreditPackage)
                .set({ creditsRemaining: newBalance })
                .where(eq(userCreditPackage.id, pkg.id));

            // 创建交易记录
            const transactionId = randomUUID();
            await tx.insert(creditTransaction).values({
                id: transactionId,
                userId,
                userPackageId: pkg.id,
                type: 'admin_adjustment',
                amount: -deductFromThis,
                balanceBefore: pkg.creditsRemaining,
                balanceAfter: newBalance,
                description: `结算欠费: ${debt.operationType}`,
                metadata: JSON.stringify({
                    debtId: debt.id,
                    operationType: debt.operationType,
                    originalDebtAmount: debt.amount,
                    settledAmount: deductFromThis
                }),
                relatedId: debt.id
            });

            remainingSettle -= deductFromThis;
            pkg.creditsRemaining = newBalance; // 更新本地副本
        }

        availableCredits -= settleAmount;

        // 如果完全结清，标记欠费为已结清
        if (settleAmount >= debt.amount) {
            await tx
                .update(creditDebt)
                .set({
                    isSettled: true,
                    settledAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(creditDebt.id, debt.id));

            console.log('欠费已结清:', {
                userId,
                debtId: debt.id,
                amount: debt.amount,
                operationType: debt.operationType
            });
        } else {
            // 部分结清，更新欠费金额
            await tx
                .update(creditDebt)
                .set({
                    amount: debt.amount - settleAmount,
                    updatedAt: new Date()
                })
                .where(eq(creditDebt.id, debt.id));

            console.log('欠费部分结清:', {
                userId,
                debtId: debt.id,
                originalAmount: debt.amount,
                settledAmount: settleAmount,
                remainingAmount: debt.amount - settleAmount,
                operationType: debt.operationType
            });
        }
    }
}

/**
 * 记录欠费
 */
async function recordDebt(
    userId: string,
    amount: number,
    operationType: string,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        await db.insert(creditDebt).values({
            id: randomUUID(),
            userId,
            amount,
            operationType,
            metadata: metadata ? JSON.stringify(metadata) : null,
            relatedId: metadata?.relatedId || null,
            isSettled: false
        });

        console.log('欠费记录已创建:', {
            userId,
            amount,
            operationType
        });
    } catch (error) {
        console.error('记录欠费失败:', {
            userId,
            amount,
            operationType,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * 在事务内记录欠费
 */
async function recordDebtInTransaction(
    tx: any,
    userId: string,
    amount: number,
    operationType: string,
    metadata?: Record<string, any>
): Promise<void> {
    await tx.insert(creditDebt).values({
        id: randomUUID(),
        userId,
        amount,
        operationType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        relatedId: metadata?.relatedId || null,
        isSettled: false
    });

    console.log('欠费记录已创建:', {
        userId,
        amount,
        operationType
    });
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
    metadata?: Record<string, any>
): Promise<void> {
    if (amount <= 0) {
        throw new Error('扣除金额必须大于0');
    }

    const retryDelays = [5000, 10000, 20000]; // 5秒, 10秒, 20秒
    let lastError: Error | null = null;

    // 重试机制：最多尝试3次
    for (let attempt = 0; attempt < retryDelays.length + 1; attempt++) {
        try {
            await db.transaction(async (tx) => {
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
                    .orderBy(userCreditPackage.expiresAt);

                // 计算总余额
                const totalBalance = packages.reduce((sum: number, pkg: any) => sum + pkg.creditsRemaining, 0);

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
                        metadata: metadata ? JSON.stringify(metadata) : null
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
                        metadata: JSON.stringify(debtMetadata)
                    });

                    console.log('积分不足，已扣除可用积分并记录欠费:', {
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
            console.error(`扣费失败 (尝试 ${attempt + 1}/${retryDelays.length + 1}):`, {
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

    // 所有重试都失败，记录欠费
    console.error('扣费失败，已达最大重试次数，记录欠费:', {
        userId,
        amount,
        operationType
    });
    await recordDebt(userId, amount, operationType, metadata);
    throw lastError || new Error('扣费失败');
}

/**
 * 兑换码逻辑
 */
export async function redeemCode(
    userId: string,
    codeId: string
): Promise<{ success: boolean; credits: number; packageName: string; expiresAt: Date }> {
    let result: { credits: number; packageName: string; expiresAt: Date };

    try {
        await db.transaction(async (tx) => {
            // 获取兑换码（加锁）
            const [code] = await tx
                .select()
                .from(redemptionCode)
                .where(eq(redemptionCode.id, codeId))
                .for('update');

            if (!code) {
                throw new InvalidRedemptionCodeError('兑换码不存在');
            }

            if (!code.isActive) {
                throw new InvalidRedemptionCodeError('兑换码已停用');
            }

            if (code.codeExpiresAt < new Date()) {
                throw new InvalidRedemptionCodeError('兑换码已过期');
            }

            if (code.currentUses >= code.maxUses) {
                throw new InvalidRedemptionCodeError('兑换码已达到最大使用次数');
            }

            // 检查用户是否已兑换过此码
            const [existingRedemption] = await tx
                .select()
                .from(redemptionHistory)
                .where(
                    and(
                        eq(redemptionHistory.codeId, codeId),
                        eq(redemptionHistory.userId, userId)
                    )
                )
                .limit(1);

            if (existingRedemption) {
                throw new InvalidRedemptionCodeError('您已经兑换过此兑换码');
            }

            // 获取套餐信息
            const [pkg] = await tx
                .select()
                .from(creditPackage)
                .where(eq(creditPackage.id, code.packageId))
                .limit(1);

            if (!pkg) {
                throw new Error('套餐不存在');
            }

            if (!pkg.isActive) {
                throw new Error('套餐已停用');
            }

            // 计算过期时间
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

            // 创建用户套餐
            const userPackageId = randomUUID();
            await tx.insert(userCreditPackage).values({
                id: userPackageId,
                userId,
                packageId: pkg.id,
                creditsTotal: pkg.credits,
                creditsRemaining: pkg.credits,
                expiresAt,
                source: 'redemption',
                sourceId: codeId,
                isActive: true
            });

            // 创建交易记录
            await tx.insert(creditTransaction).values({
                id: randomUUID(),
                userId,
                userPackageId,
                type: 'redemption',
                amount: pkg.credits,
                balanceBefore: 0,
                balanceAfter: pkg.credits,
                description: `兑换套餐: ${pkg.name}`,
                metadata: JSON.stringify({
                    packageId: pkg.id,
                    packageName: pkg.name,
                    validityDays: pkg.validityDays,
                    expiresAt: expiresAt.toISOString(),
                    codeId
                }),
                relatedId: codeId
            });

            // 更新兑换码使用次数
            await tx
                .update(redemptionCode)
                .set({
                    currentUses: code.currentUses + 1,
                    updatedAt: new Date()
                })
                .where(eq(redemptionCode.id, codeId));

            // 记录兑换历史
            await tx.insert(redemptionHistory).values({
                id: randomUUID(),
                codeId,
                userId,
                packageId: pkg.id,
                userPackageId,
                creditsGranted: pkg.credits,
                expiresAt
            });

            // 结算欠费（Bug修复：充值后应自动清理欠费）
            await settleDebts(userId, tx);

            result = {
                credits: pkg.credits,
                packageName: pkg.name,
                expiresAt
            };
        });

        return { success: true, ...result! };
    } catch (error) {
        // 记录错误日志
        console.error('兑换码兑换失败:', {
            userId,
            codeId,
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}


/**
 * 获取用户交易历史
 */
export async function getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
) {
    const transactions = await db
        .select()
        .from(creditTransaction)
        .where(eq(creditTransaction.userId, userId))
        .orderBy(sql`${creditTransaction.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

    return transactions.map((t) => ({
        ...t,
        metadata: t.metadata ? JSON.parse(t.metadata) : null
    }));
}

/**
 * 生成兑换码
 */
export async function generateRedemptionCode(
    packageId: string,
    maxUses: number = 1,
    codeExpiresInDays: number = 30,
    createdBy?: string
): Promise<string> {
    const codeId = randomUUID();
    const codeExpiresAt = new Date();
    codeExpiresAt.setDate(codeExpiresAt.getDate() + codeExpiresInDays);

    await db.insert(redemptionCode).values({
        id: codeId,
        packageId,
        maxUses,
        currentUses: 0,
        codeExpiresAt,
        isActive: true,
        createdBy
    });

    return codeId;
}

/**
 * 检查用户是否有足够积分
 */
export async function checkSufficientCredits(
    userId: string,
    requiredCredits: number
): Promise<boolean> {
    const balance = await getUserBalance(userId);
    return balance >= requiredCredits;
}

/**
 * 初始化新用户积分（发放欢迎套餐）
 * @deprecated
 */
export async function initializeUserCredits(
    userId: string,
    welcomePackageId: string = 'pkg-welcome'
): Promise<void> {
    // 检查用户是否已有套餐
    const existingPackages = await db
        .select()
        .from(userCreditPackage)
        .where(eq(userCreditPackage.userId, userId))
        .limit(1);

    if (existingPackages.length > 0) {
        return; // 已初始化，跳过
    }

    // 发放欢迎套餐
    await grantPackageToUser(userId, welcomePackageId, 'admin', 'welcome-bonus');
}

/**
 * 标记过期套餐为不活跃（定时任务）
 */
export async function expireOldPackages(): Promise<number> {
    const now = new Date();

    const result = await db
        .update(userCreditPackage)
        .set({ isActive: false })
        .where(
            and(
                eq(userCreditPackage.isActive, true),
                lt(userCreditPackage.expiresAt, now)
            )
        );

    return result.rowCount ?? 0;
}

/**
 * 获取用户欠费记录
 */
export async function getUserDebts(
    userId: string,
    includeSettled: boolean = false
) {
    const conditions = includeSettled
        ? [eq(creditDebt.userId, userId)]
        : [eq(creditDebt.userId, userId), eq(creditDebt.isSettled, false)];

    const debts = await db
        .select()
        .from(creditDebt)
        .where(and(...conditions))
        .orderBy(sql`${creditDebt.createdAt} DESC`);

    return debts.map((d) => ({
        ...d,
        metadata: d.metadata ? JSON.parse(d.metadata) : null
    }));
}

/**
 * 获取用户总欠费金额
 */
export async function getUserTotalDebt(userId: string): Promise<number> {
    const result = await db
        .select({
            totalDebt: sql<number>`COALESCE(SUM(${creditDebt.amount}), 0)`
        })
        .from(creditDebt)
        .where(
            and(
                eq(creditDebt.userId, userId),
                eq(creditDebt.isSettled, false)
            )
        );

    return Number(result[0]?.totalDebt ?? 0);
}

// ============ 用户统计查询 ============

export interface UserCreditStats {
    totalSpent: number;
    totalEarned: number;
    spendingByType: Array<{ type: string; total: number; count: number }>;
    expiringPackages: Array<{
        id: string;
        creditsRemaining: number;
        expiresAt: Date;
        daysUntilExpiry: number;
    }>;
    totalExpired: number;
    totalDebt: number;
    debtCount: number;
}

/**
 * 获取用户积分统计（总消费、总获得、按类型分组、即将过期、欠费）
 */
export async function getUserCreditStats(userId: string): Promise<UserCreditStats> {
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const [
        totalSpentResult,
        totalEarnedResult,
        spendingByType,
        expiringPkgs,
        totalExpiredResult,
        totalDebt,
        debtCountResult
    ] = await Promise.all([
        db
            .select({ total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)` })
            .from(creditTransaction)
            .where(and(eq(creditTransaction.userId, userId), sql`${creditTransaction.amount} < 0`)),
        db
            .select({ total: sql<number>`COALESCE(SUM(${creditTransaction.amount}), 0)` })
            .from(creditTransaction)
            .where(and(eq(creditTransaction.userId, userId), sql`${creditTransaction.amount} > 0`)),
        db
            .select({
                type: creditTransaction.type,
                total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)`,
                count: sql<number>`COUNT(*)`
            })
            .from(creditTransaction)
            .where(and(eq(creditTransaction.userId, userId), sql`${creditTransaction.amount} < 0`))
            .groupBy(creditTransaction.type),
        db
            .select()
            .from(userCreditPackage)
            .where(
                and(
                    eq(userCreditPackage.userId, userId),
                    eq(userCreditPackage.isActive, true),
                    gt(userCreditPackage.creditsRemaining, 0),
                    gt(userCreditPackage.expiresAt, now),
                    sql`${userCreditPackage.expiresAt} <= ${sevenDaysLater}`
                )
            )
            .orderBy(userCreditPackage.expiresAt),
        db
            .select({ total: sql<number>`COALESCE(SUM(${userCreditPackage.creditsRemaining}), 0)` })
            .from(userCreditPackage)
            .where(
                and(
                    eq(userCreditPackage.userId, userId),
                    gt(userCreditPackage.creditsRemaining, 0),
                    sql`${userCreditPackage.expiresAt} <= ${now}`
                )
            ),
        getUserTotalDebt(userId),
        db
            .select({ count: sql<number>`COUNT(*)` })
            .from(creditDebt)
            .where(and(eq(creditDebt.userId, userId), eq(creditDebt.isSettled, false)))
    ]);

    return {
        totalSpent: Number(totalSpentResult[0]?.total ?? 0),
        totalEarned: Number(totalEarnedResult[0]?.total ?? 0),
        spendingByType: spendingByType.map((item) => ({
            type: item.type,
            total: Number(item.total),
            count: Number(item.count)
        })),
        expiringPackages: expiringPkgs.map((pkg) => ({
            id: pkg.id,
            creditsRemaining: pkg.creditsRemaining,
            expiresAt: pkg.expiresAt,
            daysUntilExpiry: Math.ceil(
                (pkg.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
        })),
        totalExpired: Number(totalExpiredResult[0]?.total ?? 0),
        totalDebt,
        debtCount: Number(debtCountResult[0]?.count ?? 0)
    };
}

// ============ 管理员查询 ============

/**
 * 获取所有积分套餐
 */
export async function getAllPackages() {
    return db.select().from(creditPackage).orderBy(creditPackage.credits);
}

/**
 * 获取兑换码列表（分页，带关联套餐信息，支持筛选）
 */
export async function getRedemptionCodes(
    limit: number,
    offset: number,
    filters?: { status?: 'active' | 'used' | 'expired' | 'disabled'; packageId?: string }
) {
    const now = new Date();
    const conditions = [];

    if (filters?.status === 'active') {
        conditions.push(eq(redemptionCode.isActive, true));
        conditions.push(gt(redemptionCode.codeExpiresAt, now));
        conditions.push(sql`${redemptionCode.currentUses} < ${redemptionCode.maxUses}`);
    } else if (filters?.status === 'used') {
        conditions.push(eq(redemptionCode.isActive, true));
        conditions.push(sql`${redemptionCode.currentUses} >= ${redemptionCode.maxUses}`);
    } else if (filters?.status === 'expired') {
        conditions.push(eq(redemptionCode.isActive, true));
        conditions.push(sql`${redemptionCode.codeExpiresAt} <= ${now}`);
    } else if (filters?.status === 'disabled') {
        conditions.push(eq(redemptionCode.isActive, false));
    }

    if (filters?.packageId) {
        conditions.push(eq(redemptionCode.packageId, filters.packageId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const selectFields = {
        id: redemptionCode.id,
        code: redemptionCode.id,
        packageId: redemptionCode.packageId,
        maxUses: redemptionCode.maxUses,
        usedCount: redemptionCode.currentUses,
        expiresAt: redemptionCode.codeExpiresAt,
        isActive: redemptionCode.isActive,
        createdAt: redemptionCode.createdAt,
        package: {
            id: creditPackage.id,
            name: creditPackage.name,
            credits: creditPackage.credits,
            validityDays: creditPackage.validityDays
        }
    };

    const baseQuery = db
        .select(selectFields)
        .from(redemptionCode)
        .leftJoin(creditPackage, eq(creditPackage.id, redemptionCode.packageId));

    const countQuery = db
        .select({ count: count() })
        .from(redemptionCode);

    const [codes, totalCount] = await Promise.all([
        whereClause
            ? baseQuery.where(whereClause).limit(limit).offset(offset).orderBy(desc(redemptionCode.createdAt))
            : baseQuery.limit(limit).offset(offset).orderBy(desc(redemptionCode.createdAt)),
        whereClause
            ? countQuery.where(whereClause).then((r) => r[0].count)
            : countQuery.then((r) => r[0].count)
    ]);

    return { codes, total: totalCount };
}

/**
 * 获取管理员欠费列表（分页，可按结清状态过滤）
 */
export async function getAdminDebts(
    limit: number,
    offset: number,
    settled?: 'true' | 'false'
) {
    const condition =
        settled === 'true'
            ? eq(creditDebt.isSettled, true)
            : settled === 'false'
                ? eq(creditDebt.isSettled, false)
                : undefined;

    const [debts, totalCount] = await Promise.all([
        condition
            ? db.select().from(creditDebt).where(condition).limit(limit).offset(offset).orderBy(desc(creditDebt.createdAt))
            : db.select().from(creditDebt).limit(limit).offset(offset).orderBy(desc(creditDebt.createdAt)),
        condition
            ? db.select({ count: count() }).from(creditDebt).where(condition).then((r) => r[0].count)
            : db.select({ count: count() }).from(creditDebt).then((r) => r[0].count)
    ]);

    return {
        debts: debts.map((d) => ({
            ...d,
            metadata: d.metadata ? JSON.parse(d.metadata) : null
        })),
        total: totalCount
    };
}

export interface AdminOverviewStats {
    revenue: { total: number; week: number };
    users: { total: number; week: number };
    credits: { totalGranted: number; totalConsumed: number; totalRemaining: number; weekGranted: number };
}

/**
 * 获取管理员概览统计（收入、用户、积分）
 */
export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);

    const [
        revenueResult,
        weekRevenueResult,
        userCountResult,
        weekUserCountResult,
        creditsResult,
        weekCreditsResult
    ] = await Promise.all([
        db
            .select({ totalRevenue: sql<number>`COALESCE(SUM(${creditPackage.price}), 0)` })
            .from(redemptionHistory)
            .innerJoin(creditPackage, eq(redemptionHistory.packageId, creditPackage.id)),
        db
            .select({ weekRevenue: sql<number>`COALESCE(SUM(${creditPackage.price}), 0)` })
            .from(redemptionHistory)
            .innerJoin(creditPackage, eq(redemptionHistory.packageId, creditPackage.id))
            .where(gte(redemptionHistory.redeemedAt, weekStart)),
        db.select({ count: sql<number>`COUNT(*)` }).from(user),
        db.select({ count: sql<number>`COUNT(*)` }).from(user).where(gte(user.createdAt, weekStart)),
        db
            .select({
                totalGranted: sql<number>`COALESCE(SUM(${userCreditPackage.creditsTotal}), 0)`,
                totalRemaining: sql<number>`COALESCE(SUM(${userCreditPackage.creditsRemaining}), 0)`
            })
            .from(userCreditPackage),
        db
            .select({ weekGranted: sql<number>`COALESCE(SUM(${userCreditPackage.creditsTotal}), 0)` })
            .from(userCreditPackage)
            .where(gte(userCreditPackage.grantedAt, weekStart))
    ]);

    const totalGranted = Number(creditsResult[0]?.totalGranted ?? 0);
    const totalRemaining = Number(creditsResult[0]?.totalRemaining ?? 0);

    return {
        revenue: {
            total: Number(revenueResult[0]?.totalRevenue ?? 0),
            week: Number(weekRevenueResult[0]?.weekRevenue ?? 0)
        },
        users: {
            total: Number(userCountResult[0]?.count ?? 0),
            week: Number(weekUserCountResult[0]?.count ?? 0)
        },
        credits: {
            totalGranted,
            totalConsumed: totalGranted - totalRemaining,
            totalRemaining,
            weekGranted: Number(weekCreditsResult[0]?.weekGranted ?? 0)
        }
    };
}

/**
 * 获取管理员概览页面所需的汇总计数（轻量级，不返回具体数据）
 */
export async function getAdminOverviewCounts(): Promise<{
    totalPackages: number;
    totalCodes: number;
    totalRedemptions: number;
    unsettledDebts: number;
    unsettledDebtAmount: number;
}> {
    const [packageCount, codeCount, redemptionCount, unsettledDebtResult] = await Promise.all([
        db.select({ count: count() }).from(creditPackage).then((r) => r[0].count),
        db.select({ count: count() }).from(redemptionCode).then((r) => r[0].count),
        db.select({ count: count() }).from(redemptionHistory).then((r) => r[0].count),
        db
            .select({
                count: count(),
                totalAmount: sql<number>`COALESCE(SUM(${creditDebt.amount}), 0)`
            })
            .from(creditDebt)
            .where(eq(creditDebt.isSettled, false))
            .then((r) => r[0])
    ]);

    return {
        totalPackages: packageCount,
        totalCodes: codeCount,
        totalRedemptions: redemptionCount,
        unsettledDebts: unsettledDebtResult.count,
        unsettledDebtAmount: Number(unsettledDebtResult.totalAmount)
    };
}

/**
 * 获取兑换码和兑换历史的汇总计数（用于兑换码页面统计卡片）
 */
export async function getCodePageCounts(): Promise<{
    totalCodes: number;
    totalRedemptions: number;
}> {
    const [codeCount, redemptionCount] = await Promise.all([
        db.select({ count: count() }).from(redemptionCode).then((r) => r[0].count),
        db.select({ count: count() }).from(redemptionHistory).then((r) => r[0].count)
    ]);

    return {
        totalCodes: codeCount,
        totalRedemptions: redemptionCount
    };
}
