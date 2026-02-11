import { db } from '../db';
import { creditTransaction } from '../db/schema';
import { eq, sql, count } from 'drizzle-orm';
import { PAGINATION } from '$lib/config/constants';
import { withQueryMonitor } from '../query-monitor';

/**
 * 获取用户交易历史（分页，含总数）
 */
export async function getUserTransactions(
    userId: string,
    limit: number = PAGINATION.DEFAULT_LIMIT,
    offset: number = PAGINATION.DEFAULT_OFFSET
) {
    const whereClause = eq(creditTransaction.userId, userId);

    const [transactions, totalCount] = await withQueryMonitor(
        `getUserTransactions(userId=${userId}, limit=${limit}, offset=${offset})`,
        () => Promise.all([
            db
                .select()
                .from(creditTransaction)
                .where(whereClause)
                .orderBy(sql`${creditTransaction.createdAt} DESC`)
                .limit(limit)
                .offset(offset),
            db
                .select({ count: count() })
                .from(creditTransaction)
                .where(whereClause)
                .then((r) => r[0].count)
        ])
    );

    return {
        transactions: transactions.map((t) => ({
            ...t,
            metadata: t.metadata ? JSON.parse(t.metadata) : null
        })),
        total: totalCount
    };
}
