import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserCreditStats } from '$lib/server/credits';
import { errorResponse, UnauthorizedError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return errorResponse(new UnauthorizedError());
    }

    try {
        const stats = await getUserCreditStats(userId);
        return json(stats);
    } catch (error) {
        return errorResponse(error, '获取统计失败');
    }
};
