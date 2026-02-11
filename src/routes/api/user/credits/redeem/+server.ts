import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redeemCode } from '$lib/server/credits';
import { rateLimit } from '$lib/server/rate-limit';
import { CREDITS } from '$lib/config/constants';
import { errorResponse, RateLimitError, UnauthorizedError, ValidationError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ locals, request }) => {
    const userId = locals.session?.user?.id;

    if (!userId) {
        return errorResponse(new UnauthorizedError());
    }

    // 速率限制
    const rateLimitKey = `redeem:${userId}`;
    const isAllowed = await rateLimit(rateLimitKey, CREDITS.REDEEM_RATE_LIMIT_MAX, CREDITS.REDEEM_RATE_LIMIT_WINDOW);

    if (!isAllowed) {
        return errorResponse(new RateLimitError('兑换尝试过于频繁，请稍后再试'));
    }

    try {
        const { code } = await request.json();

        if (!code || typeof code !== 'string') {
            return errorResponse(new ValidationError('无效的兑换码格式'));
        }

        // 验证 UUID 格式
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(code)) {
            return errorResponse(new ValidationError('无效的兑换码格式'));
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
        return errorResponse(error, '兑换失败');
    }
};
