import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditDebt } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { isAdmin } from '$server/auth-utils';

/**
 * 管理员手动结清指定欠费
 * POST /api/admin/credits/debts/[id]/settle
 */
export const POST: RequestHandler = async ({ locals, params }) => {
    const userId = locals.session?.user?.id;
    const userEmail = locals.session?.user?.email;

    if (!userId || !userEmail) {
        return json({ error: '未授权' }, { status: 401 });
    }

    if (!isAdmin(userEmail)) {
        return json({ error: '需要管理员权限' }, { status: 403 });
    }

    const debtId = params.id;

    try {
        // 查询欠费记录
        const [debt] = await db
            .select()
            .from(creditDebt)
            .where(eq(creditDebt.id, debtId))
            .limit(1);

        if (!debt) {
            return json({ error: '欠费记录不存在' }, { status: 404 });
        }

        if (debt.isSettled) {
            return json({ error: '该欠费已结清' }, { status: 400 });
        }

        // 手动标记为已结清（管理员豁免）
        await db
            .update(creditDebt)
            .set({
                isSettled: true,
                settledAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(creditDebt.id, debtId));

        return json({
            success: true,
            message: '欠费已手动结清',
            debtId,
            amount: debt.amount,
            operationType: debt.operationType
        });
    } catch (error) {
        console.error('结清欠费失败:', error);
        return json({ error: '结清欠费失败' }, { status: 500 });
    }
};
