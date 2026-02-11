import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminDebts } from '$lib/server/credits';
import { parsePagination } from '$lib/config/constants';
import { errorResponse } from '$lib/server/errors';

/**
 * 管理员查看所有欠费记录
 * GET /api/admin/credits/debts?settled=false&limit=30&offset=0
 */
export const GET: RequestHandler = async ({ url }) => {
    try {
        const settled = url.searchParams.get('settled') as 'true' | 'false' | null;
        const { limit, offset } = parsePagination(url);

        const { debts, total } = await getAdminDebts(limit, offset, settled ?? undefined);

        return json({ debts, total, limit, offset });
    } catch (error) {
        return errorResponse(error, '获取欠费记录失败');
    }
};
