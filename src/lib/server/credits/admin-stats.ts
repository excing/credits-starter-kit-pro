import { db } from '../db';
import {
    user,
    creditPackage,
    userCreditPackage,
    creditTransaction,
    redemptionCode,
    redemptionHistory,
    creditDebt
} from '../db/schema';
import { eq, and, gt, gte, sql, desc, count, isNull } from 'drizzle-orm';
import { CREDITS, PAGINATION, TRANSACTION_TYPE } from '$lib/config/constants';
import { withQueryMonitor } from '../query-monitor';
import { getUserTotalDebt } from './debt';

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
    sevenDaysLater.setDate(sevenDaysLater.getDate() + CREDITS.PACKAGE_EXPIRY_WARNING_DAYS);

    const [
        totalSpentResult,
        totalEarnedResult,
        spendingByType,
        expiringPkgs,
        totalExpiredResult,
        totalDebt,
        debtCountResult
    ] = await Promise.all([
        // 总消费：排除 admin_adjustment（欠费结算扣款），避免同一笔消费被重复计算
        // debt 类型代表真实消费但余额不足的部分，应计入总消费
        db
            .select({ total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)` })
            .from(creditTransaction)
            .where(and(
                eq(creditTransaction.userId, userId),
                sql`${creditTransaction.amount} < 0`,
                sql`${creditTransaction.type} != ${TRANSACTION_TYPE.ADMIN_ADJUSTMENT}`
            )),
        db
            .select({ total: sql<number>`COALESCE(SUM(${creditTransaction.amount}), 0)` })
            .from(creditTransaction)
            .where(and(eq(creditTransaction.userId, userId), sql`${creditTransaction.amount} > 0`)),
        // 按类型分组消费：同样排除 admin_adjustment
        db
            .select({
                type: creditTransaction.type,
                total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)`,
                count: sql<number>`COUNT(*)`
            })
            .from(creditTransaction)
            .where(and(
                eq(creditTransaction.userId, userId),
                sql`${creditTransaction.amount} < 0`,
                sql`${creditTransaction.type} != ${TRANSACTION_TYPE.ADMIN_ADJUSTMENT}`
            ))
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
 * 获取用户最近 N 个月的月度消费数据（用于图表展示）
 */
export async function getUserMonthlySpending(userId: string, months: number = 6) {
    // 月度消费：排除 admin_adjustment（欠费结算扣款），避免重复计算
    const results = await db
        .select({
            month: sql<string>`TO_CHAR(${creditTransaction.createdAt}, 'YYYY-MM')`,
            total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)`
        })
        .from(creditTransaction)
        .where(
            and(
                eq(creditTransaction.userId, userId),
                sql`${creditTransaction.amount} < 0`,
                sql`${creditTransaction.type} != ${TRANSACTION_TYPE.ADMIN_ADJUSTMENT}`,
                sql`${creditTransaction.createdAt} >= NOW() - MAKE_INTERVAL(months => ${months})`
            )
        )
        .groupBy(sql`TO_CHAR(${creditTransaction.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${creditTransaction.createdAt}, 'YYYY-MM')`);

    // 填充缺失的月份（确保连续）
    const now = new Date();
    const filled: { month: string; label: string; total: number }[] = [];
    const resultMap = new Map(results.map((r) => [r.month, Number(r.total)]));

    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${d.getMonth() + 1}月`;
        filled.push({ month: key, label, total: resultMap.get(key) ?? 0 });
    }

    return filled;
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

    // 始终排除软删除的兑换码
    conditions.push(isNull(redemptionCode.deletedAt));

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

    const [codes, totalCount] = await withQueryMonitor(
        `getRedemptionCodes(limit=${limit}, offset=${offset}, status=${filters?.status})`,
        () => Promise.all([
            whereClause
                ? baseQuery.where(whereClause).limit(limit).offset(offset).orderBy(desc(redemptionCode.createdAt))
                : baseQuery.limit(limit).offset(offset).orderBy(desc(redemptionCode.createdAt)),
            whereClause
                ? countQuery.where(whereClause).then((r) => r[0].count)
                : countQuery.then((r) => r[0].count)
        ])
    );

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

    const [debts, totalCount] = await withQueryMonitor(
        `getAdminDebts(limit=${limit}, offset=${offset}, settled=${settled})`,
        () => Promise.all([
            condition
                ? db.select().from(creditDebt).where(condition).limit(limit).offset(offset).orderBy(desc(creditDebt.createdAt))
                : db.select().from(creditDebt).limit(limit).offset(offset).orderBy(desc(creditDebt.createdAt)),
            condition
                ? db.select({ count: count() }).from(creditDebt).where(condition).then((r) => r[0].count)
                : db.select({ count: count() }).from(creditDebt).then((r) => r[0].count)
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
        db.select({ count: sql<number>`COUNT(*)` }).from(user).where(isNull(user.deletedAt)),
        db.select({ count: sql<number>`COUNT(*)` }).from(user).where(and(isNull(user.deletedAt), gte(user.createdAt, weekStart))),
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
        db.select({ count: count() }).from(creditPackage).where(isNull(creditPackage.deletedAt)).then((r) => r[0].count),
        db.select({ count: count() }).from(redemptionCode).where(isNull(redemptionCode.deletedAt)).then((r) => r[0].count),
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
        db.select({ count: count() }).from(redemptionCode).where(isNull(redemptionCode.deletedAt)).then((r) => r[0].count),
        db.select({ count: count() }).from(redemptionHistory).then((r) => r[0].count)
    ]);

    return {
        totalCodes: codeCount,
        totalRedemptions: redemptionCount
    };
}
