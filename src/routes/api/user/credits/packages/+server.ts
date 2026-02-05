import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserActivePackages } from '$lib/server/credits';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return json({ error: '未授权' }, { status: 401 });
    }

    try {
        const packages = await getUserActivePackages(userId);
        return json({ packages });
    } catch (error) {
        console.error('获取用户套餐失败:', error);
        return json({ error: '获取套餐失败' }, { status: 500 });
    }
};
