import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditDebt, creditTransaction } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';

/**
 * 管理员手动结清指定欠费
 * POST /api/admin/credits/debts/[id]/settle
 */
export const POST: RequestHandler = async ({ locals, params }) => {
    const userEmail = locals.session?.user?.email;
    const debtId = params.id;

    try {
        // 查询欠费记录
        const [debt] = await db
            .select()
            .from(creditDebt)
            .where(eq(creditDebt.id, debtId))
            .limit(1);

        if (!debt) {
            return errorResponse(new NotFoundError('欠费记录不存在'));
        }

        if (debt.isSettled) {
            return errorResponse(new ValidationError('该欠费已结清'));
        }

        // 使用事务：标记结清 + 创建审计交易记录
        await db.transaction(async (tx) => {
            await tx
                .update(creditDebt)
                .set({
                    isSettled: true,
                    settledAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(creditDebt.id, debtId));

            // 创建管理员结清的审计交易记录
            await tx.insert(creditTransaction).values({
                id: randomUUID(),
                userId: debt.userId,
                userPackageId: null,
                type: 'admin_settle_debt',
                amount: debt.amount,
                balanceBefore: 0,
                balanceAfter: 0,
                description: `管理员手动结清欠费`,
                metadata: JSON.stringify({
                    debtId: debt.id,
                    adminEmail: userEmail,
                    operationType: debt.operationType
                })
            });
        });

        return json({
            success: true,
            message: '欠费已手动结清',
            debtId,
            amount: debt.amount,
            operationType: debt.operationType
        });
    } catch (error) {
        return errorResponse(error, '结清欠费失败');
    }
};
