import { db } from '../db';
import { userCreditPackage } from '../db/schema';
import { eq, and, gt, or, lte, sql } from 'drizzle-orm';
import { PAGINATION } from '$lib/config/constants';

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
 * 从已查询的有效套餐中计算余额，避免额外 DB 查询。
 * 当已持有 activePackages 结果时，用此函数替代 getUserBalance()。
 */
export function calcBalanceFromPackages(
    activePackages: { creditsRemaining: number }[]
): number {
    return activePackages.reduce((sum, pkg) => sum + pkg.creditsRemaining, 0);
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
export async function getUserInactivePackages(userId: string, limit: number = PAGINATION.DEFAULT_LIMIT) {
    const now = new Date();

    return await db
        .select()
        .from(userCreditPackage)
        .where(
            and(
                eq(userCreditPackage.userId, userId),
                or(
                    eq(userCreditPackage.isActive, false),
                    lte(userCreditPackage.expiresAt, now),
                    lte(userCreditPackage.creditsRemaining, 0)
                )
            )
        )
        .orderBy(sql`${userCreditPackage.expiresAt} DESC`)
        .limit(limit);
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
