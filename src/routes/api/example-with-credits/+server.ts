import { withCredits } from '$lib/server/credits-middleware';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * 示例 API：使用 withCredits 高阶函数
 *
 * 这个示例展示了如何使用 withCredits 包装器来自动处理：
 * 1. 用户认证检查
 * 2. 积分余额前置检查
 * 3. 业务逻辑执行
 * 4. 根据实际使用量后置扣费
 */
export const POST: RequestHandler = withCredits(
    async ({ request, creditContext }) => {
        // creditContext 包含：
        // - userId: 当前用户 ID
        // - operationType: 操作类型
        // - initialBalance: 用户初始余额

        // 1. 解析请求数据
        const { items } = await request.json();

        // 2. 执行业务逻辑
        const results = await processItems(items);

        // 3. 返回响应和使用量
        return {
            response: json({
                success: true,
                results,
                creditsUsed: items.length * 2  // 每个 item 消耗 2 积分
            }),
            usage: {
                units: items.length,  // 按处理的 item 数量计费
                metadata: {
                    itemCount: items.length,
                    userId: creditContext.userId,
                    timestamp: new Date().toISOString()
                }
            }
        };
    },
    {
        operationType: 'example_operation',
        minCreditsRequired: 2  // 至少需要 2 积分才能调用
    }
);

/**
 * 模拟业务逻辑：处理 items
 */
async function processItems(items: any[]): Promise<any[]> {
    // 模拟异步处理
    return items.map((item, index) => ({
        id: index,
        original: item,
        processed: true,
        timestamp: new Date().toISOString()
    }));
}

/**
 * 如果需要更精细的控制，可以使用手动方式：
 */
/*
import { preCheckCredits, postDeductCredits } from '$lib/server/credits-middleware';

export const POST: RequestHandler = async (event) => {
    // 1. 前置检查
    const preCheck = await preCheckCredits(event, {
        operationType: 'example_operation',
        minCreditsRequired: 2
    });

    if (!preCheck.success) {
        return preCheck.error;
    }

    const creditContext = preCheck.context;

    try {
        // 2. 执行业务逻辑
        const { items } = await event.request.json();
        const results = await processItems(items);

        // 3. 后置扣费
        await postDeductCredits(creditContext, {
            units: items.length,
            metadata: {
                itemCount: items.length,
                userId: creditContext.userId
            }
        });

        return json({ success: true, results });
    } catch (error) {
        console.error('处理失败:', error);
        return json({ error: '处理失败' }, { status: 500 });
    }
};
*/
