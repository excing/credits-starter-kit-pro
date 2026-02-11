import { db } from '../db';
import { creditPackage, userCreditPackage, creditTransaction } from '../db/schema';
import { eq, and, lt, gt, count, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { PAGINATION, PACKAGE_SOURCE, TRANSACTION_TYPE } from '$lib/config/constants';
import { withQueryMonitor } from '../query-monitor';
import { settleDebts } from './debt';

/**
 * 发放套餐给用户（带欠费结算）
 */
export async function grantPackageToUser(
    userId: string,
    packageId: string,
    source: typeof PACKAGE_SOURCE[keyof typeof PACKAGE_SOURCE],
    sourceId?: string
): Promise<string> {
    const userPackageId = randomUUID();

    await db.transaction(async (tx) => {
        // 获取套餐信息
        const [pkg] = await tx
            .select()
            .from(creditPackage)
            .where(and(eq(creditPackage.id, packageId), isNull(creditPackage.deletedAt)))
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
            packageName: pkg.name,
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
            type: source === PACKAGE_SOURCE.REDEMPTION ? TRANSACTION_TYPE.REDEMPTION : source === PACKAGE_SOURCE.PURCHASE ? TRANSACTION_TYPE.PURCHASE : TRANSACTION_TYPE.ADMIN_ADJUSTMENT,
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
 * 获取所有积分套餐（分页）
 */
export async function getAllPackages(
    limit: number = PAGINATION.DEFAULT_LIMIT,
    offset: number = PAGINATION.DEFAULT_OFFSET
) {
    const [packages, totalCount] = await withQueryMonitor(
        `getAllPackages(limit=${limit}, offset=${offset})`,
        () => Promise.all([
            db
                .select()
                .from(creditPackage)
                .where(isNull(creditPackage.deletedAt))
                .orderBy(creditPackage.credits)
                .limit(limit)
                .offset(offset),
            db
                .select({ count: count() })
                .from(creditPackage)
                .where(isNull(creditPackage.deletedAt))
                .then((r) => r[0].count)
        ])
    );

    return { packages, total: totalCount };
}
