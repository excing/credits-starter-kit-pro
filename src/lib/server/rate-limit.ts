import { db } from './db';
import { rateLimit as rateLimitTable } from './db/schema';
import { eq } from 'drizzle-orm';

/**
 * 速率限制函数
 * @param key 限制键（如 "redeem:userId"）
 * @param maxRequests 最大请求数
 * @param windowSeconds 时间窗口（秒）
 * @returns 是否允许请求
 */
export async function rateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
): Promise<boolean> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // 查询现有记录
    const [existing] = await db
        .select()
        .from(rateLimitTable)
        .where(eq(rateLimitTable.key, key))
        .limit(1);

    if (!existing) {
        // 首次请求，创建记录
        await db.insert(rateLimitTable).values({
            id: key,
            key,
            count: 1,
            lastRequest: now
        });
        return true;
    }

    const timeSinceLastRequest = now - (existing.lastRequest ?? 0);

    if (timeSinceLastRequest > windowMs) {
        // 时间窗口已过，重置计数
        await db
            .update(rateLimitTable)
            .set({
                count: 1,
                lastRequest: now
            })
            .where(eq(rateLimitTable.key, key));
        return true;
    }

    if ((existing.count ?? 0) >= maxRequests) {
        // 超过限制
        return false;
    }

    // 增加计数
    await db
        .update(rateLimitTable)
        .set({
            count: (existing.count ?? 0) + 1,
            lastRequest: now
        })
        .where(eq(rateLimitTable.key, key));

    return true;
}
