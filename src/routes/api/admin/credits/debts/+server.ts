import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminDebts } from '$lib/server/credits';
import { isAdmin } from '$server/auth-utils';

/**
 * 管理员查看所有欠费记录
 * GET /api/admin/credits/debts?settled=false&limit=50&offset=0
 */
export const GET: RequestHandler = async ({ locals, url }) => {
    const userId = locals.session?.user?.id;
    const userEmail = locals.session?.user?.email;

    if (!userId || !userEmail) {
        return json({ error: '未授权' }, { status: 401 });
    }

    if (!isAdmin(userEmail)) {
        return json({ error: '需要管理员权限' }, { status: 403 });
    }

    try {
        const settled = url.searchParams.get('settled') as 'true' | 'false' | null;
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const { debts, total } = await getAdminDebts(limit, offset, settled ?? undefined);

        return json({ debts, total, limit, offset });
    } catch (error) {
        console.error('获取欠费记录失败:', error);
        return json({ error: '获取欠费记录失败' }, { status: 500 });
    }
};
