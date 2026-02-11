import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserActivePackages } from '$lib/server/credits';
import { errorResponse, UnauthorizedError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return errorResponse(new UnauthorizedError());
    }

    try {
        const packages = await getUserActivePackages(userId);
        return json({ packages });
    } catch (error) {
        return errorResponse(error, '获取套餐失败');
    }
};
