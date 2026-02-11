import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserActivePackages, calcBalanceFromPackages } from '$lib/server/credits';
import { errorResponse, UnauthorizedError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return errorResponse(new UnauthorizedError());
    }

    try {
        const activePackages = await getUserActivePackages(userId);

        return json({
            balance: calcBalanceFromPackages(activePackages),
            activePackages: activePackages.length
        });
    } catch (error) {
        return errorResponse(error, '获取余额失败');
    }
};
