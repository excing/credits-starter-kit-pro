import { db } from '../db';
import { userCreditPackage, creditTransaction, creditDebt } from '../db/schema';
import { eq, and, gt, sql, desc, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { PAGINATION, TRANSACTION_TYPE } from '$lib/config/constants';
import { withQueryMonitor } from '../query-monitor';
import { createLogger } from '../logger';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const log = createLogger('credits-debt');

/**
 * 结算欠费（在事务中调用）
 */
export async function settleDebts(userId: string, tx: Transaction): Promise<void> {
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
        .orderBy(userCreditPackage.expiresAt)
        .for('update');

    let availableCredits = packages.reduce((sum, pkg) => sum + pkg.creditsRemaining, 0);

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
                type: TRANSACTION_TYPE.ADMIN_ADJUSTMENT,
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

            log.info('欠费已结清', {
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

            log.info('欠费部分结清', {
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
export async function recordDebt(
    userId: string,
    amount: number,
    operationType: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    await db.insert(creditDebt).values({
        id: randomUUID(),
        userId,
        amount,
        operationType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        relatedId: (metadata?.relatedId as string) || null,
        isSettled: false
    });

    log.info('欠费记录已创建', {
        userId,
        amount,
        operationType
    });
}

/**
 * 在事务内记录欠费
 */
export async function recordDebtInTransaction(
    tx: Transaction,
    userId: string,
    amount: number,
    operationType: string,
    metadata?: Record<string, unknown>
): Promise<void> {
    await tx.insert(creditDebt).values({
        id: randomUUID(),
        userId,
        amount,
        operationType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        relatedId: (metadata?.relatedId as string) || null,
        isSettled: false
    });

    log.info('欠费记录已创建', {
        userId,
        amount,
        operationType
    });
}

/**
 * 获取用户欠费记录（分页）
 */
export async function getUserDebts(
    userId: string,
    includeSettled: boolean = false,
    limit: number = PAGINATION.DEFAULT_LIMIT,
    offset: number = PAGINATION.DEFAULT_OFFSET
) {
    const conditions = includeSettled
        ? [eq(creditDebt.userId, userId)]
        : [eq(creditDebt.userId, userId), eq(creditDebt.isSettled, false)];

    const whereClause = and(...conditions);

    const [debts, totalCount] = await withQueryMonitor(
        `getUserDebts(userId=${userId}, limit=${limit}, offset=${offset})`,
        () => Promise.all([
            db
                .select()
                .from(creditDebt)
                .where(whereClause)
                .orderBy(sql`${creditDebt.createdAt} DESC`)
                .limit(limit)
                .offset(offset),
            db
                .select({ count: count() })
                .from(creditDebt)
                .where(whereClause)
                .then((r) => r[0].count)
        ])
    );

    return {
        debts: debts.map((d) => ({
            ...d,
            metadata: d.metadata ? JSON.parse(d.metadata) : null
        })),
        total: totalCount
    };
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
