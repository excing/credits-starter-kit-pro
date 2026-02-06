import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditTransaction, userCreditPackage, creditDebt } from '$lib/server/db/schema';
import { eq, and, sql, gt } from 'drizzle-orm';
import { getUserTotalDebt } from '$lib/server/credits';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return json({ error: '未授权' }, { status: 401 });
    }

    try {
        // 获取总消费统计
        const [totalSpent] = await db
            .select({
                total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)`
            })
            .from(creditTransaction)
            .where(
                and(
                    eq(creditTransaction.userId, userId),
                    sql`${creditTransaction.amount} < 0`
                )
            );

        // 获取总获得统计
        const [totalEarned] = await db
            .select({
                total: sql<number>`COALESCE(SUM(${creditTransaction.amount}), 0)`
            })
            .from(creditTransaction)
            .where(
                and(
                    eq(creditTransaction.userId, userId),
                    sql`${creditTransaction.amount} > 0`
                )
            );

        // 获取按类型分组的消费统计
        const spendingByType = await db
            .select({
                type: creditTransaction.type,
                total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)`,
                count: sql<number>`COUNT(*)`
            })
            .from(creditTransaction)
            .where(
                and(
                    eq(creditTransaction.userId, userId),
                    sql`${creditTransaction.amount} < 0`
                )
            )
            .groupBy(creditTransaction.type);

        // 获取即将过期的套餐（30天内）
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const expiringPackages = await db
            .select()
            .from(userCreditPackage)
            .where(
                and(
                    eq(userCreditPackage.userId, userId),
                    eq(userCreditPackage.isActive, true),
                    gt(userCreditPackage.creditsRemaining, 0),
                    gt(userCreditPackage.expiresAt, now),
                    sql`${userCreditPackage.expiresAt} <= ${thirtyDaysLater}`
                )
            )
            .orderBy(userCreditPackage.expiresAt);

        // 获取用户总欠费金额
        const totalDebt = await getUserTotalDebt(userId);

        // 获取未结清欠费数量
        const [debtCount] = await db
            .select({
                count: sql<number>`COUNT(*)`
            })
            .from(creditDebt)
            .where(
                and(
                    eq(creditDebt.userId, userId),
                    eq(creditDebt.isSettled, false)
                )
            );

        return json({
            totalSpent: Number(totalSpent?.total ?? 0),
            totalEarned: Number(totalEarned?.total ?? 0),
            spendingByType: spendingByType.map(item => ({
                type: item.type,
                total: Number(item.total),
                count: Number(item.count)
            })),
            expiringPackages: expiringPackages.map(pkg => ({
                id: pkg.id,
                creditsRemaining: pkg.creditsRemaining,
                expiresAt: pkg.expiresAt,
                daysUntilExpiry: Math.ceil(
                    (pkg.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                )
            })),
            totalDebt,
            debtCount: Number(debtCount?.count ?? 0)
        });
    } catch (error) {
        console.error('获取积分统计失败:', error);
        return json({ error: '获取统计失败' }, { status: 500 });
    }
};
