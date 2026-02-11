import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserTransactions } from '$lib/server/credits';
import { parsePagination } from '$lib/config/constants';
import { errorResponse, UnauthorizedError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ locals, url }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return errorResponse(new UnauthorizedError());
    }

    const { limit, offset } = parsePagination(url);

    try {
        const { transactions, total } = await getUserTransactions(userId, limit, offset);
        return json({ transactions, total, limit, offset });
    } catch (error) {
        return errorResponse(error, '获取历史失败');
    }
};
