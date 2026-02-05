import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserTransactions } from '$lib/server/credits';

export const GET: RequestHandler = async ({ locals, url }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return json({ error: '未授权' }, { status: 401 });
    }

    const limit = parseInt(url.searchParams.get('limit') ?? '50');
    const offset = parseInt(url.searchParams.get('offset') ?? '0');

    try {
        const transactions = await getUserTransactions(userId, limit, offset);
        return json({ transactions });
    } catch (error) {
        console.error('获取交易历史失败:', error);
        return json({ error: '获取历史失败' }, { status: 500 });
    }
};
