import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redeemCode, InvalidRedemptionCodeError } from '$lib/server/credits';
import { rateLimit } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ locals, request }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return json({ error: '未授权' }, { status: 401 });
    }

    // 速率限制：5次兑换尝试/分钟
    const rateLimitKey = `redeem:${userId}`;
    const isAllowed = await rateLimit(rateLimitKey, 5, 60);

    if (!isAllowed) {
        return json(
            { error: '兑换尝试过于频繁，请稍后再试' },
            { status: 429 }
        );
    }

    try {
        const { code } = await request.json();

        if (!code || typeof code !== 'string') {
            return json({ error: '无效的兑换码格式' }, { status: 400 });
        }

        // 验证 UUID 格式
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(code)) {
            return json({ error: '无效的兑换码格式' }, { status: 400 });
        }

        const result = await redeemCode(userId, code);

        return json({
            success: true,
            credits: result.credits,
            packageName: result.packageName,
            expiresAt: result.expiresAt,
            message: `成功兑换 ${result.credits} 积分！`
        });
    } catch (error) {
        if (error instanceof InvalidRedemptionCodeError) {
            return json({ error: error.message }, { status: 400 });
        }

        console.error('兑换码兑换失败:', error);
        return json({ error: '兑换失败' }, { status: 500 });
    }
};
