import { db } from '../db';
import {
    creditPackage,
    userCreditPackage,
    creditTransaction,
    redemptionCode,
    redemptionHistory
} from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { CREDITS, PACKAGE_SOURCE, TRANSACTION_TYPE } from '$lib/config/constants';
import { InvalidRedemptionCodeError } from './types';
import { settleDebts } from './debt';
import { createLogger } from '../logger';

const log = createLogger('credits-redemption');

/**
 * 兑换码逻辑
 */
export async function redeemCode(
    userId: string,
    codeId: string
): Promise<{ success: boolean; credits: number; packageName: string; expiresAt: Date }> {
    try {
        const result = await db.transaction(async (tx) => {
            // 获取兑换码（加锁）
            const [code] = await tx
                .select()
                .from(redemptionCode)
                .where(and(eq(redemptionCode.id, codeId), isNull(redemptionCode.deletedAt)))
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
                .where(and(eq(creditPackage.id, code.packageId), isNull(creditPackage.deletedAt)))
                .limit(1);

            if (!pkg) {
                throw new Error('套餐不存在或已被删除');
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
                packageName: pkg.name,
                creditsTotal: pkg.credits,
                creditsRemaining: pkg.credits,
                expiresAt,
                source: PACKAGE_SOURCE.REDEMPTION,
                sourceId: codeId,
                isActive: true
            });

            // 创建交易记录
            await tx.insert(creditTransaction).values({
                id: randomUUID(),
                userId,
                userPackageId,
                type: TRANSACTION_TYPE.REDEMPTION,
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

            return {
                credits: pkg.credits,
                packageName: pkg.name,
                expiresAt
            };
        });

        return { success: true, ...result };
    } catch (error) {
        // 记录错误日志
        log.error('兑换码兑换失败', error instanceof Error ? error : new Error(String(error)), {
            userId,
            codeId,
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

/**
 * 批量生成兑换码（单条 INSERT，一次数据库往返）
 */
export async function generateRedemptionCodes(
    packageId: string,
    count: number,
    maxUses: number = 1,
    codeExpiresInDays: number = CREDITS.CODE_EXPIRATION_DAYS,
    createdBy?: string
): Promise<string[]> {
    const codeExpiresAt = new Date();
    codeExpiresAt.setDate(codeExpiresAt.getDate() + codeExpiresInDays);

    const rows = Array.from({ length: count }, () => ({
        id: randomUUID(),
        packageId,
        maxUses,
        currentUses: 0,
        codeExpiresAt,
        isActive: true,
        createdBy
    }));

    await db.insert(redemptionCode).values(rows);

    return rows.map(r => r.id);
}
