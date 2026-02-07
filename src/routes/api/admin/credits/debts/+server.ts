import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditDebt } from '$lib/server/db/schema';
import { eq, count, desc } from 'drizzle-orm';
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
        const settled = url.searchParams.get('settled');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let debts;
        let totalCount;

        // 根据settled参数过滤
        if (settled === 'true') {
            [debts, totalCount] = await Promise.all([
                db
                    .select()
                    .from(creditDebt)
                    .where(eq(creditDebt.isSettled, true))
                    .limit(limit)
                    .offset(offset)
                    .orderBy(desc(creditDebt.createdAt)),
                db
                    .select({ count: count() })
                    .from(creditDebt)
                    .where(eq(creditDebt.isSettled, true))
                    .then(result => result[0].count)
            ]);
        } else if (settled === 'false') {
            [debts, totalCount] = await Promise.all([
                db
                    .select()
                    .from(creditDebt)
                    .where(eq(creditDebt.isSettled, false))
                    .limit(limit)
                    .offset(offset)
                    .orderBy(desc(creditDebt.createdAt)),
                db
                    .select({ count: count() })
                    .from(creditDebt)
                    .where(eq(creditDebt.isSettled, false))
                    .then(result => result[0].count)
            ]);
        } else {
            [debts, totalCount] = await Promise.all([
                db
                    .select()
                    .from(creditDebt)
                    .limit(limit)
                    .offset(offset)
                    .orderBy(desc(creditDebt.createdAt)),
                db
                    .select({ count: count() })
                    .from(creditDebt)
                    .then(result => result[0].count)
            ]);
        }

        return json({
            debts: debts.map(d => ({
                ...d,
                metadata: d.metadata ? JSON.parse(d.metadata) : null
            })),
            total: totalCount,
            limit,
            offset
        });
    } catch (error) {
        console.error('获取欠费记录失败:', error);
        return json({ error: '获取欠费记录失败' }, { status: 500 });
    }
};
