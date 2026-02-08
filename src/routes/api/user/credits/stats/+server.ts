import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserCreditStats } from '$lib/server/credits';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return json({ error: '未授权' }, { status: 401 });
    }

    try {
        const stats = await getUserCreditStats(userId);
        return json(stats);
    } catch (error) {
        console.error('获取积分统计失败:', error);
        return json({ error: '获取统计失败' }, { status: 500 });
    }
};
