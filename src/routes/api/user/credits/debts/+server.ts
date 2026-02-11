import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserDebts } from '$lib/server/credits';
import { parsePagination } from '$lib/config/constants';
import { errorResponse, UnauthorizedError } from '$lib/server/errors';

/**
 * 获取用户欠费记录
 * GET /api/user/credits/debts?includeSettled=false
 */
export const GET: RequestHandler = async ({ locals, url }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return errorResponse(new UnauthorizedError());
    }

    try {
        const includeSettled = url.searchParams.get('includeSettled') === 'true';
        const { limit, offset } = parsePagination(url);
        const { debts, total } = await getUserDebts(userId, includeSettled, limit, offset);

        return json({
            debts,
            total,
            limit,
            offset,
            unsettledCount: debts.filter(d => !d.isSettled).length
        });
    } catch (error) {
        return errorResponse(error, '获取欠费记录失败');
    }
};
