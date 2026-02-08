import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserActivePackages, calcBalanceFromPackages } from '$lib/server/credits';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return json({ error: '未授权' }, { status: 401 });
    }

    try {
        const activePackages = await getUserActivePackages(userId);

        return json({
            balance: calcBalanceFromPackages(activePackages),
            activePackages: activePackages.length
        });
    } catch (error) {
        console.error('获取积分余额失败:', error);
        return json({ error: '获取余额失败' }, { status: 500 });
    }
};
