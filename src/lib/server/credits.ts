import { db } from './db';
import {
    creditPackage,
    userCreditPackage,
    creditTransaction,
    redemptionCode,
    redemptionHistory
} from './db/schema';
import { eq, and, lt, gt, sql } from 'drizzle-orm';
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
    | 'refund';

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
 * 发放套餐给用户
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
    });

    return userPackageId;
}

/**
 * 扣除积分（优先从即将过期的套餐扣除）
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

    await db.transaction(async (tx) => {
        // 获取所有有效套餐，按过期时间排序
        const packages = await getUserActivePackages(userId);

        // 检查总余额
        const totalBalance = packages.reduce((sum, pkg) => sum + pkg.creditsRemaining, 0);
        if (totalBalance < amount) {
            throw new InsufficientCreditsError(amount, totalBalance);
        }

        let remainingAmount = amount;

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
        }
    });
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
