import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserDebts } from '$lib/server/credits';

/**
 * 获取用户欠费记录
 * GET /api/user/credits/debts?includeSettled=false
 */
export const GET: RequestHandler = async ({ locals, url }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return json({ error: '未授权' }, { status: 401 });
    }

    try {
        const includeSettled = url.searchParams.get('includeSettled') === 'true';
        const debts = await getUserDebts(userId, includeSettled);

        return json({
            debts,
            total: debts.length,
            unsettledCount: debts.filter(d => !d.isSettled).length
        });
    } catch (error) {
        console.error('获取欠费记录失败:', error);
        return json({ error: '获取欠费记录失败' }, { status: 500 });
    }
};
